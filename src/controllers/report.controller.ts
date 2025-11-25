import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { PaymentStatus } from '../models/PaymentTransaction';
import { PortfolioStatus } from '../models/Portfolio';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

interface BatchAttendanceQuery {
  batchId?: string;
  from?: string;
  to?: string;
}

export const getAllStudents = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all active students
    const students = await db.User.findAll({
      where: {
        role: UserRole.STUDENT,
        isActive: true,
      },
      attributes: ['id', 'name', 'email', 'phone', 'createdAt'],
      order: [['name', 'ASC']],
    });

    // Format response
    const formattedStudents = students.map((student: any) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      createdAt: student.createdAt,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        students: formattedStudents,
        totalCount: formattedStudents.length,
      },
    });
  } catch (error) {
    logger.error('Get all students error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students',
    });
  }
};

export const getStudentsWithoutBatch = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all students who don't have any active enrollment
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
      attributes: ['id', 'name', 'email', 'phone', 'createdAt'],
    });

    // Filter students without any enrollment or with only inactive batches
    const studentsWithoutBatch = students.filter((student: any) => {
      const enrollments = student.enrollments || [];
      const activeEnrollments = enrollments.filter((enrollment: any) => {
        return enrollment.batch && enrollment.batch.status !== 'ended' && enrollment.batch.status !== 'cancelled';
      });
      return activeEnrollments.length === 0;
    });

    // Format response
    const formattedStudents = studentsWithoutBatch.map((student: any) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      createdAt: student.createdAt,
      enrollments: student.enrollments || [],
    }));

    res.status(200).json({
      status: 'success',
      data: {
        students: formattedStudents,
        totalCount: formattedStudents.length,
      },
    });
  } catch (error) {
    logger.error('Get students without batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students without batch',
    });
  }
};

export const getBatchAttendance = async (req: AuthRequest & { query: BatchAttendanceQuery }, res: Response): Promise<void> => {
  try {
    const { batchId, from, to } = req.query;

    if (!batchId) {
      res.status(400).json({
        status: 'error',
        message: 'batchId query parameter is required',
      });
      return;
    }

    const batchIdNum = parseInt(batchId, 10);
    if (isNaN(batchIdNum)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batchId',
      });
      return;
    }

    // Verify batch exists
    const batch = await db.Batch.findByPk(batchIdNum);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Build session filter
    const sessionWhere: any = { batchId: batchIdNum };
    
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid from date format. Use YYYY-MM-DD',
        });
        return;
      }
      sessionWhere.date = { [Op.gte]: fromDate };
    }

    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid to date format. Use YYYY-MM-DD',
        });
        return;
      }
      if (from) {
        sessionWhere.date = {
          ...sessionWhere.date,
          [Op.lte]: toDate,
        };
      } else {
        sessionWhere.date = { [Op.lte]: toDate };
      }
    }

    // Get sessions for this batch (and date range if provided)
    const sessions = await db.Session.findAll({
      where: sessionWhere,
      attributes: ['id'],
    });

    const sessionIds = sessions.map((s: any) => s.id);
    
    if (sessionIds.length === 0) {
      // No sessions in date range
      res.status(200).json({
        status: 'success',
        data: {
          batch: {
            id: batch.id,
            title: batch.title,
            startDate: batch.startDate,
            endDate: batch.endDate,
          },
          dateRange: {
            from: from || null,
            to: to || null,
          },
          sessions: [],
          studentStatistics: [],
          totalSessions: 0,
          totalAttendances: 0,
        },
      });
      return;
    }

    // Build attendance filter
    const whereClause: any = {
      sessionId: { [Op.in]: sessionIds },
    };

    // Get attendance records
    const attendances = await db.Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: db.Session,
          as: 'session',
          attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'status'],
        },
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.User,
          as: 'marker',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [
        [{ model: db.Session, as: 'session' }, 'date', 'ASC'],
        [{ model: db.Session, as: 'session' }, 'startTime', 'ASC'],
      ],
    });

    // Group by session and calculate statistics
    const attendanceBySession: Record<number, any> = {};
    const studentStats: Record<number, { present: number; absent: number; manualPresent: number; total: number }> = {};

    attendances.forEach((attendance: any) => {
      const sessionId = attendance.sessionId;
      const studentId = attendance.studentId;

      // Initialize session if not exists
      if (!attendanceBySession[sessionId]) {
        attendanceBySession[sessionId] = {
          session: {
            id: attendance.session.id,
            date: attendance.session.date,
            startTime: attendance.session.startTime,
            endTime: attendance.session.endTime,
            topic: attendance.session.topic,
            status: attendance.session.status,
          },
          attendances: [],
        };
      }

      // Initialize student stats if not exists
      if (!studentStats[studentId]) {
        studentStats[studentId] = { present: 0, absent: 0, manualPresent: 0, total: 0 };
      }

      // Add attendance record
      attendanceBySession[sessionId].attendances.push({
        id: attendance.id,
        studentId: attendance.student.id,
        studentName: attendance.student.name,
        studentEmail: attendance.student.email,
        status: attendance.status,
        isManual: attendance.isManual,
        markedBy: attendance.marker ? {
          id: attendance.marker.id,
          name: attendance.marker.name,
        } : null,
        markedAt: attendance.markedAt,
      });

      // Update student stats
      studentStats[studentId].total++;
      if (attendance.status === 'present') {
        studentStats[studentId].present++;
      } else if (attendance.status === 'absent') {
        studentStats[studentId].absent++;
      } else if (attendance.status === 'manual_present') {
        studentStats[studentId].manualPresent++;
      }
    });

    // Format response
    const sessionsList = Object.values(attendanceBySession);
    const studentStatsList = Object.entries(studentStats).map(([studentId, stats]) => ({
      studentId: parseInt(studentId, 10),
      ...stats,
      attendanceRate: stats.total > 0 ? ((stats.present + stats.manualPresent) / stats.total * 100).toFixed(2) + '%' : '0%',
    }));

    // Calculate attendance statistics
    const totalSessions = sessions.length;
    const totalAttendanceCount = attendances.length;
    
    // Count present (including manual_present) attendances
    const presentCount = attendances.filter((a: any) => 
      a.status === 'present' || a.status === 'manual_present'
    ).length;
    
    // Calculate attendance percentage
    const attendancePercentage = totalAttendanceCount > 0 
      ? ((presentCount / totalAttendanceCount) * 100).toFixed(2) + '%'
      : '0%';

    res.status(200).json({
      status: 'success',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
          startDate: batch.startDate,
          endDate: batch.endDate,
        },
        dateRange: {
          from: from || null,
          to: to || null,
        },
        statistics: {
          totalSessions,
          totalAttendanceCount,
          attendancePercentage,
          presentCount,
          absentCount: attendances.filter((a: any) => a.status === 'absent').length,
        },
        sessions: sessionsList,
        studentStatistics: studentStatsList,
      },
    });
  } catch (error) {
    logger.error('Get batch attendance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch attendance',
    });
  }
};

export const getPendingPayments = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all pending payment transactions
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
      order: [['dueDate', 'ASC']],
    });

    // Calculate summary
    const totalPendingAmount = payments.reduce((sum: number, payment: any) => {
      const amount = parseFloat(payment.amount.toString());
      const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
      const remaining = Math.max(amount - paidAmount, 0);
      return sum + remaining;
    }, 0);

    // Group by overdue and upcoming
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = payments.filter((payment: any) => {
      const dueDate = new Date(payment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const remaining = parseFloat(payment.amount.toString()) - parseFloat(payment.paidAmount?.toString() || '0');
      return dueDate < today && remaining > 0;
    });

    const upcoming = payments.filter((payment: any) => {
      const dueDate = new Date(payment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const remaining = parseFloat(payment.amount.toString()) - parseFloat(payment.paidAmount?.toString() || '0');
      return dueDate >= today && remaining > 0;
    });

    // Format response
    const formattedPayments = payments
      .map((payment: any) => {
        const amount = parseFloat(payment.amount.toString());
        const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
        const remaining = Math.max(amount - paidAmount, 0);

        if (remaining <= 0) {
          return null;
        }

        return {
          id: payment.id,
          student: {
            id: payment.student.id,
            name: payment.student.name,
            email: payment.student.email,
            phone: payment.student.phone,
          },
          amount,
          paidAmount,
          remainingAmount: remaining,
          dueDate: payment.dueDate,
          status: payment.status,
          isOverdue: new Date(payment.dueDate) < today,
          receiptUrl: payment.receiptUrl,
          createdAt: payment.createdAt,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      status: 'success',
      data: {
        payments: formattedPayments,
        summary: {
          totalPending: formattedPayments.length,
          totalPendingAmount: totalPendingAmount.toFixed(2),
          overdue: {
            count: overdue.length,
            amount: overdue
              .reduce((sum: number, payment: any) => {
                const amount = parseFloat(payment.amount.toString());
                const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
                return sum + Math.max(amount - paidAmount, 0);
              }, 0)
              .toFixed(2),
          },
          upcoming: {
            count: upcoming.length,
            amount: upcoming
              .reduce((sum: number, payment: any) => {
                const amount = parseFloat(payment.amount.toString());
                const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
                return sum + Math.max(amount - paidAmount, 0);
              }, 0)
              .toFixed(2),
          },
        },
      },
    });
  } catch (error) {
    logger.error('Get pending payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching pending payments',
    });
  }
};

export const getPortfolioStatus = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all portfolios with their status
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
          attributes: ['id', 'title', 'status'],
        },
        {
          model: db.User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Group by status
    const byStatus: Record<string, any[]> = {
      [PortfolioStatus.PENDING]: [],
      [PortfolioStatus.APPROVED]: [],
      [PortfolioStatus.REJECTED]: [],
    };

    portfolios.forEach((portfolio: any) => {
      byStatus[portfolio.status].push(portfolio);
    });

    // Format response
    const formattedPortfolios = portfolios.map((portfolio: any) => ({
      id: portfolio.id,
      student: {
        id: portfolio.student.id,
        name: portfolio.student.name,
        email: portfolio.student.email,
      },
      batch: {
        id: portfolio.batch.id,
        title: portfolio.batch.title,
        status: portfolio.batch.status,
      },
      status: portfolio.status,
      files: portfolio.files,
      approvedBy: portfolio.approver ? {
        id: portfolio.approver.id,
        name: portfolio.approver.name,
        email: portfolio.approver.email,
      } : null,
      approvedAt: portfolio.approvedAt,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        portfolios: formattedPortfolios,
        summary: {
          total: portfolios.length,
          pending: byStatus[PortfolioStatus.PENDING].length,
          approved: byStatus[PortfolioStatus.APPROVED].length,
          rejected: byStatus[PortfolioStatus.REJECTED].length,
        },
        byStatus: {
          pending: byStatus[PortfolioStatus.PENDING].map((p: any) => ({
            id: p.id,
            studentName: p.student.name,
            batchTitle: p.batch.title,
            createdAt: p.createdAt,
          })),
          approved: byStatus[PortfolioStatus.APPROVED].map((p: any) => ({
            id: p.id,
            studentName: p.student.name,
            batchTitle: p.batch.title,
            approvedAt: p.approvedAt,
          })),
          rejected: byStatus[PortfolioStatus.REJECTED].map((p: any) => ({
            id: p.id,
            studentName: p.student.name,
            batchTitle: p.batch.title,
            updatedAt: p.updatedAt,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('Get portfolio status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching portfolio status',
    });
  }
};



// Extended report functions


// Extended report functions - see report-extended.controller.ts for implementation
