import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { PaymentStatus } from '../models/PaymentTransaction';
import { PortfolioStatus } from '../models/Portfolio';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

// Re-export all functions from main report controller
export * from './report.controller';

// Get particular student's current batch
export const getStudentCurrentBatch = async (req: AuthRequest & { params: { studentId: string } }, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    const student = await db.User.findByPk(studentId, {
      where: { role: UserRole.STUDENT },
      include: [
        {
          model: db.Enrollment,
          as: 'enrollments',
          include: [
            {
              model: db.Batch,
              as: 'batch',
              include: [
                {
                  model: db.User,
                  as: 'admin',
                  attributes: ['id', 'name', 'email'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Get current active batch
    const currentBatch = (student as any).enrollments
      ?.filter((enrollment: any) => {
        const batch = enrollment.batch;
        return batch && batch.status !== 'ended' && batch.status !== 'cancelled';
      })
      .map((enrollment: any) => ({
        enrollmentId: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate,
        enrollmentStatus: enrollment.status,
        batch: {
          id: enrollment.batch.id,
          title: enrollment.batch.title,
          software: enrollment.batch.software,
          mode: enrollment.batch.mode,
          startDate: enrollment.batch.startDate,
          endDate: enrollment.batch.endDate,
          maxCapacity: enrollment.batch.maxCapacity,
          schedule: enrollment.batch.schedule,
          status: enrollment.batch.status,
          createdBy: enrollment.batch.admin,
        },
      }))[0] || null;

    res.status(200).json({
      status: 'success',
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
        },
        currentBatch,
      },
    });
  } catch (error) {
    logger.error('Get student current batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching student current batch',
    });
  }
};

// Get particular student's attendance
export const getStudentAttendance = async (
  req: AuthRequest & { params: { studentId: string }; query: { from?: string; to?: string } },
  res: Response
): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    const { from, to } = req.query;

    const student = await db.User.findByPk(studentId, {
      where: { role: UserRole.STUDENT },
      attributes: ['id', 'name', 'email'],
    });

    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    const whereClause: any = { studentId };

    if (from || to) {
      whereClause['$session.date$'] = {};
      if (from) {
        whereClause['$session.date$'][Op.gte] = new Date(from);
      }
      if (to) {
        whereClause['$session.date$'][Op.lte] = new Date(to);
      }
    }

    const attendances = await db.Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: db.Session,
          as: 'session',
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'software'],
            },
            {
              model: db.User,
              as: 'faculty',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
      order: [[{ model: db.Session, as: 'session' }, 'date', 'DESC']],
    });

    const stats = {
      total: attendances.length,
      present: attendances.filter((a: any) => a.status === 'present').length,
      absent: attendances.filter((a: any) => a.status === 'absent').length,
      manualPresent: attendances.filter((a: any) => a.status === 'manual_present').length,
    };

    const attendanceRate = stats.total > 0 ? ((stats.present + stats.manualPresent) / stats.total * 100).toFixed(2) + '%' : '0%';

    res.status(200).json({
      status: 'success',
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
        },
        dateRange: {
          from: from || null,
          to: to || null,
        },
        statistics: {
          ...stats,
          attendanceRate,
        },
        attendances: attendances.map((a: any) => ({
          id: a.id,
          session: {
            id: a.session.id,
            date: a.session.date,
            startTime: a.session.startTime,
            endTime: a.session.endTime,
            topic: a.session.topic,
            batch: a.session.batch,
            faculty: a.session.faculty,
          },
          status: a.status,
          isManual: a.isManual,
          markedAt: a.markedAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Get student attendance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching student attendance',
    });
  }
};

// Get number of batches in particular duration by faculty
export const getBatchesByFaculty = async (
  req: AuthRequest & { query: { facultyId?: string; from?: string; to?: string } },
  res: Response
): Promise<void> => {
  try {
    const { facultyId, from, to } = req.query;

    const whereClause: any = {};
    if (from) {
      whereClause.startDate = { [Op.gte]: new Date(from) };
    }
    if (to) {
      whereClause.endDate = { [Op.lte]: new Date(to) };
    }

    const batches = await db.Batch.findAll({
      where: whereClause,
      include: [
        {
          model: db.Session,
          as: 'sessions',
          include: [
            {
              model: db.User,
              as: 'faculty',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
    });

    // Group by faculty
    const facultyStats: Record<number, { faculty: any; batches: any[]; totalSessions: number; totalHours: number }> = {};

    batches.forEach((batch: any) => {
      const sessions = batch.sessions || [];
      sessions.forEach((session: any) => {
        if (session.faculty) {
          const fid = session.faculty.id;
          if (!facultyStats[fid]) {
            facultyStats[fid] = {
              faculty: session.faculty,
              batches: [],
              totalSessions: 0,
              totalHours: 0,
            };
          }

          // Check if batch already counted for this faculty
          if (!facultyStats[fid].batches.find((b: any) => b.id === batch.id)) {
            facultyStats[fid].batches.push({
              id: batch.id,
              title: batch.title,
              software: batch.software,
              startDate: batch.startDate,
              endDate: batch.endDate,
            });
          }

          // Calculate hours
          const [startHours, startMinutes] = session.startTime.split(':').map(Number);
          const [endHours, endMinutes] = session.endTime.split(':').map(Number);
          const startTotal = startHours * 60 + startMinutes;
          const endTotal = endHours * 60 + endMinutes;
          const hours = (endTotal - startTotal) / 60;

          facultyStats[fid].totalSessions++;
          facultyStats[fid].totalHours += hours;
        }
      });
    });

    // Filter by facultyId if provided
    let result = Object.values(facultyStats);
    if (facultyId) {
      const fid = parseInt(facultyId, 10);
      result = result.filter((stat: any) => stat.faculty.id === fid);
    }

    res.status(200).json({
      status: 'success',
      data: {
        dateRange: {
          from: from || null,
          to: to || null,
        },
        facultyStatistics: result.map((stat: any) => ({
          faculty: stat.faculty,
          batchCount: stat.batches.length,
          batches: stat.batches,
          totalSessions: stat.totalSessions,
          totalHours: parseFloat(stat.totalHours.toFixed(2)),
        })),
      },
    });
  } catch (error) {
    logger.error('Get batches by faculty error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batches by faculty',
    });
  }
};

// Get monthwise payment reports
export const getMonthwisePayments = async (
  req: AuthRequest & { query: { month?: string; year?: string } },
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.query;

    const whereClause: any = {};
    if (month && year) {
      const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59);
      whereClause.createdAt = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      const startDate = new Date(parseInt(year, 10), 0, 1);
      const endDate = new Date(parseInt(year, 10), 11, 31, 23, 59, 59);
      whereClause.createdAt = { [Op.between]: [startDate, endDate] };
    }

    const payments = await db.PaymentTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Group by month
    const monthlyStats: Record<
      string,
      { month: string; payments: any[]; totalAmount: number; paid: number; pending: number }
    > = {};

    payments.forEach((payment: any) => {
      const date = new Date(payment.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthLabel,
          payments: [],
          totalAmount: 0,
          paid: 0,
          pending: 0,
        };
      }

      const amount = parseFloat(payment.amount.toString());
      const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
      const remaining = Math.max(amount - paidAmount, 0);

      monthlyStats[monthKey].payments.push({
        id: payment.id,
        student: payment.student,
        amount,
        paidAmount,
        remainingAmount: remaining,
        status: payment.status,
        dueDate: payment.dueDate,
        createdAt: payment.createdAt,
      });

      monthlyStats[monthKey].totalAmount += amount;
      monthlyStats[monthKey].paid += paidAmount;
      monthlyStats[monthKey].pending += remaining;
    });

    res.status(200).json({
      status: 'success',
      data: {
        filter: {
          month: month || null,
          year: year || null,
        },
        monthlyStatistics: Object.values(monthlyStats).map((stat) => ({
          ...stat,
          totalAmount: parseFloat(stat.totalAmount.toFixed(2)),
          paid: parseFloat(stat.paid.toFixed(2)),
          pending: parseFloat(stat.pending.toFixed(2)),
        })),
      },
    });
  } catch (error) {
    logger.error('Get monthwise payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching monthwise payments',
    });
  }
};

// Get all analysis reports (comprehensive master report)
export const getAllAnalysisReports = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all data
    const [students, batches, sessions, payments, portfolios, enrollments] = await Promise.all([
      db.User.count({ where: { role: UserRole.STUDENT, isActive: true } }),
      db.Batch.count(),
      db.Session.count(),
      db.PaymentTransaction.count(),
      db.Portfolio.count(),
      db.Enrollment.count(),
    ]);

    const activeBatches = await db.Batch.count({ where: { status: { [Op.ne]: 'ended' } } });
    const pendingPayments = await db.PaymentTransaction.count({
      where: {
        status: {
          [Op.or]: [PaymentStatus.PENDING, PaymentStatus.PARTIAL],
        },
      },
    });
    const pendingPortfolios = await db.Portfolio.count({ where: { status: PortfolioStatus.PENDING } });

    const totalPaymentAmount = await db.PaymentTransaction.sum('amount') || 0;
    const totalPaidAmount = await db.PaymentTransaction.sum('paidAmount') || 0;
    const pendingAmount = Math.max(totalPaymentAmount - totalPaidAmount, 0);

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          students: {
            total: students,
            withBatch: enrollments,
            withoutBatch: students - enrollments,
          },
          batches: {
            total: batches,
            active: activeBatches,
            ended: batches - activeBatches,
          },
          sessions: {
            total: sessions,
          },
          payments: {
            total: payments,
            pending: pendingPayments,
            totalAmount: parseFloat(totalPaymentAmount.toString()),
            paidAmount: parseFloat(totalPaidAmount.toString()),
            pendingAmount: parseFloat(pendingAmount.toString()),
          },
          portfolios: {
            total: portfolios,
            pending: pendingPortfolios,
          },
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get all analysis reports error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching analysis reports',
    });
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data: any[], headers: string[]): string => {
  const csvRows = [headers.join(',')];
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] || '';
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  });
  return csvRows.join('\n');
};

// Download report as CSV
export const downloadReportCSV = async (
  req: AuthRequest & { query: { type: string; [key: string]: string } },
  res: Response
): Promise<void> => {
  try {
    const { type } = req.query;

    let csvData = '';
    let filename = 'report.csv';

    switch (type) {
      case 'students-without-batch': {
        const students = await db.User.findAll({
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
          include: [
            {
              model: db.Enrollment,
              as: 'enrollments',
              required: false,
              include: [
                {
                  model: db.Batch,
                  as: 'batch',
                  attributes: ['id', 'title', 'status'],
                },
              ],
            },
          ],
        });

        const studentsWithoutBatch = students.filter((student: any) => {
          const enrollments = student.enrollments || [];
          const activeEnrollments = enrollments.filter((enrollment: any) => {
            return enrollment.batch && enrollment.batch.status !== 'ended' && enrollment.batch.status !== 'cancelled';
          });
          return activeEnrollments.length === 0;
        });

        csvData = convertToCSV(
          studentsWithoutBatch.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone || '',
            createdAt: s.createdAt,
          })),
          ['id', 'name', 'email', 'phone', 'createdAt']
        );
        filename = 'students-without-batch.csv';
        break;
      }
      case 'pending-payments': {
        const payments = await db.PaymentTransaction.findAll({
          where: {
            status: {
              [Op.or]: [PaymentStatus.PENDING, PaymentStatus.PARTIAL],
            },
          },
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email', 'phone'],
            },
          ],
        });

        csvData = convertToCSV(
          payments.map((p: any) => ({
            id: p.id,
            studentName: p.student.name,
            studentEmail: p.student.email,
            studentPhone: p.student.phone || '',
            amount: p.amount,
            paidAmount: p.paidAmount || 0,
            remainingAmount: Math.max(parseFloat(p.amount.toString()) - parseFloat(p.paidAmount?.toString() || '0'), 0),
            dueDate: p.dueDate,
            status: p.status,
            isOverdue: new Date(p.dueDate) < new Date() ? 'Yes' : 'No',
          })),
          ['id', 'studentName', 'studentEmail', 'studentPhone', 'amount', 'paidAmount', 'remainingAmount', 'dueDate', 'status', 'isOverdue']
        );
        filename = 'pending-payments.csv';
        break;
      }
      case 'portfolio-status': {
        const portfolios = await db.Portfolio.findAll({
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email'],
            },
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title'],
            },
            {
              model: db.User,
              as: 'approver',
              attributes: ['id', 'name', 'email'],
              required: false,
            },
          ],
        });

        csvData = convertToCSV(
          portfolios.map((p: any) => ({
            id: p.id,
            studentName: p.student.name,
            studentEmail: p.student.email,
            batchTitle: p.batch.title,
            status: p.status,
            approvedBy: p.approver?.name || '',
            approvedAt: p.approvedAt || '',
            createdAt: p.createdAt,
          })),
          ['id', 'studentName', 'studentEmail', 'batchTitle', 'status', 'approvedBy', 'approvedAt', 'createdAt']
        );
        filename = 'portfolio-status.csv';
        break;
      }
      default:
        res.status(400).json({
          status: 'error',
          message: 'Invalid report type',
        });
        return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    logger.error('Download report CSV error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while generating CSV',
    });
  }
};
