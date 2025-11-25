import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { SessionStatus } from '../models/Session';
import { AttendanceStatus } from '../models/Attendance';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreateSessionBody {
  batchId: number;
  facultyId: number;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  isBackup?: boolean;
}

interface CheckinParams {
  id: string;
}

interface CheckoutParams {
  id: string;
}

interface GetSessionsQuery {
  facultyId?: string;
  batchId?: string;
  status?: SessionStatus;
}

interface MarkAttendanceParams {
  id: string;
}

interface MarkAttendanceBody {
  studentId: number;
  status: AttendanceStatus;
  isManual?: boolean;
}

export const getSessions = async (req: AuthRequest & { query: GetSessionsQuery }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { facultyId, batchId, status } = req.query;

    // Build where clause
    const whereClause: any = {};

    if (facultyId) {
      const facultyIdNum = parseInt(facultyId, 10);
      if (isNaN(facultyIdNum)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid facultyId',
        });
        return;
      }
      whereClause.facultyId = facultyIdNum;
    }

    if (batchId) {
      const batchIdNum = parseInt(batchId, 10);
      if (isNaN(batchIdNum)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid batchId',
        });
        return;
      }
      whereClause.batchId = batchIdNum;
    }

    if (status && Object.values(SessionStatus).includes(status)) {
      whereClause.status = status;
    }

    // Get sessions with batch information
    const sessions = await db.Session.findAll({
      where: whereClause,
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'status'],
        },
      ],
      order: [['date', 'DESC'], ['startTime', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: sessions,
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching sessions',
    });
  }
};

export const createSession = async (req: AuthRequest & { body: CreateSessionBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { batchId, facultyId, date, startTime, endTime, topic, isBackup } = req.body;

    // Validation
    if (!batchId || !facultyId || !date || !startTime || !endTime) {
      res.status(400).json({
        status: 'error',
        message: 'batchId, facultyId, date, startTime, and endTime are required',
      });
      return;
    }

    // Verify batch exists
    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Verify faculty exists and has faculty role
    const faculty = await db.User.findByPk(facultyId);
    if (!faculty) {
      res.status(404).json({
        status: 'error',
        message: 'Faculty not found',
      });
      return;
    }

    if (faculty.role !== UserRole.FACULTY) {
      res.status(400).json({
        status: 'error',
        message: 'User is not a faculty member',
      });
      return;
    }

    // Validate date format
    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    // Validate time format (HH:mm or HH:mm:ss)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid time format. Use HH:mm or HH:mm:ss',
      });
      return;
    }

    // Create session
    const session = await db.Session.create({
      batchId,
      facultyId,
      date: sessionDate,
      startTime,
      endTime,
      topic: topic || null,
      isBackup: isBackup || false,
      status: SessionStatus.SCHEDULED,
    });

    res.status(201).json({
      status: 'success',
      message: 'Session created successfully',
      data: {
        session: {
          id: session.id,
          batchId: session.batchId,
          facultyId: session.facultyId,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          topic: session.topic,
          isBackup: session.isBackup,
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Create session error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating session',
    });
  }
};

export const checkinSession = async (req: AuthRequest & { params: CheckinParams }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid session ID',
      });
      return;
    }

    // Find session
    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    // Check if session is in scheduled status
    if (session.status !== SessionStatus.SCHEDULED) {
      res.status(400).json({
        status: 'error',
        message: `Cannot check-in. Session status must be 'scheduled'. Current status: ${session.status}`,
      });
      return;
    }

    // Check if user is the faculty for this session (faculty-only)
    if (session.facultyId !== req.user.userId) {
      res.status(403).json({
        status: 'error',
        message: 'Only the assigned faculty can check-in this session',
      });
      return;
    }

    // Verify faculty exists and is active (Prime Academy rule: cannot check-in without faculty)
    const faculty = await db.User.findByPk(session.facultyId);
    if (!faculty || !faculty.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot check-in: Faculty is not available or inactive',
      });
      return;
    }

    // Update session status and actual start time
    session.status = SessionStatus.ONGOING;
    session.actualStartAt = new Date();
    await session.save();

    res.status(200).json({
      status: 'success',
      message: 'Session checked in successfully',
      data: {
        session: {
          id: session.id,
          status: session.status,
          actualStartAt: session.actualStartAt,
          updatedAt: session.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Check-in session error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during check-in',
    });
  }
};

export const checkoutSession = async (req: AuthRequest & { params: CheckoutParams }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid session ID',
      });
      return;
    }

    // Find session
    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    // Check if session is ongoing (Prime Academy rule: cannot end without check-out)
    if (session.status !== SessionStatus.ONGOING) {
      res.status(400).json({
        status: 'error',
        message: `Cannot check-out. Session status must be 'ongoing'. Current status: ${session.status}`,
      });
      return;
    }

    // Check if user is the faculty for this session (faculty-only)
    if (session.facultyId !== req.user.userId) {
      res.status(403).json({
        status: 'error',
        message: 'Only the assigned faculty can check-out this session',
      });
      return;
    }

    // Check if session was checked in (Prime Academy rule: cannot end without check-out)
    if (!session.actualStartAt) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot check-out: Session was never checked in',
      });
      return;
    }

    // Update session status and actual end time
    session.status = SessionStatus.COMPLETED;
    session.actualEndAt = new Date();
    await session.save();

    res.status(200).json({
      status: 'success',
      message: 'Session checked out successfully',
      data: {
        session: {
          id: session.id,
          status: session.status,
          actualStartAt: session.actualStartAt,
          actualEndAt: session.actualEndAt,
          updatedAt: session.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Check-out session error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during check-out',
    });
  }
};

export const markAttendance = async (req: AuthRequest & { params: MarkAttendanceParams; body: MarkAttendanceBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const sessionId = parseInt(req.params.id, 10);
    const { studentId, status, isManual } = req.body;

    if (isNaN(sessionId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid session ID',
      });
      return;
    }

    // Validation
    if (!studentId || !status) {
      res.status(400).json({
        status: 'error',
        message: 'studentId and status are required',
      });
      return;
    }

    // Validate status
    if (!Object.values(AttendanceStatus).includes(status)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid status. Allowed values: ' + Object.values(AttendanceStatus).join(', '),
      });
      return;
    }

    // Find session
    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    // Verify student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // If status is 'manual_present', automatically set isManual=true and markedBy=facultyId
    const isManualAttendance = status === AttendanceStatus.MANUAL_PRESENT;
    const markedByUserId = isManualAttendance ? session.facultyId : req.user.userId;

    // Check if attendance already exists
    const existingAttendance = await db.Attendance.findOne({
      where: {
        sessionId,
        studentId,
      },
    });

    let attendance;

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.isManual = isManualAttendance || (isManual || false);
      existingAttendance.markedBy = markedByUserId;
      existingAttendance.markedAt = new Date();
      await existingAttendance.save();
      attendance = existingAttendance;
    } else {
      // Create new attendance record
      attendance = await db.Attendance.create({
        sessionId,
        studentId,
        status,
        isManual: isManualAttendance || (isManual || false),
        markedBy: markedByUserId,
        markedAt: new Date(),
      });
    }

    res.status(existingAttendance ? 200 : 201).json({
      status: 'success',
      message: existingAttendance ? 'Attendance updated successfully' : 'Attendance marked successfully',
      data: {
        attendance: {
          id: attendance.id,
          sessionId: attendance.sessionId,
          studentId: attendance.studentId,
          status: attendance.status,
          isManual: attendance.isManual,
          markedBy: attendance.markedBy,
          markedAt: attendance.markedAt,
          createdAt: attendance.createdAt,
          updatedAt: attendance.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while marking attendance',
    });
  }
};

