import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { logger } from '../utils/logger';

interface AcknowledgeOrientationBody {
  studentId: number;
  studentName: string;
  course: string;
  specialCommitment?: string;
  specialBatchTiming?: string;
  unableToPracticeReason?: string;
  paymentExemption?: string;
  confirmed: boolean;
}

export const acknowledgeOrientation = async (
  req: { body: AcknowledgeOrientationBody } & { user?: any },
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      studentName,
      course,
      specialCommitment,
      specialBatchTiming,
      unableToPracticeReason,
      paymentExemption,
      confirmed,
    } = req.body;

    // Validation
    if (!studentId || !studentName || !course || !confirmed) {
      res.status(400).json({
        status: 'error',
        message: 'studentId, studentName, course, and confirmed are required',
      });
      return;
    }

    // Verify student exists
    const student = await db.User.findByPk(studentId);
    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Get or create student profile
    let studentProfile = await db.StudentProfile.findOne({ where: { userId: studentId } });
    
    if (!studentProfile) {
      // Create student profile if it doesn't exist
      studentProfile = await db.StudentProfile.create({
        userId: studentId,
        documents: null,
        softwareList: null,
        photoUrl: null,
      });
    }

    // Update student profile with orientation data
    const orientationData = {
      acknowledged: true,
      acknowledgedAt: new Date(),
      course: course,
      specialCommitment: specialCommitment || null,
      specialBatchTiming: specialBatchTiming || null,
      unableToPracticeReason: unableToPracticeReason || null,
      paymentExemption: paymentExemption || null,
    };

    // Store orientation data in documents JSON field
    const currentDocuments = studentProfile.documents || {};
    studentProfile.documents = {
      ...currentDocuments,
      orientation: orientationData,
    };

    await studentProfile.save();

    res.status(200).json({
      status: 'success',
      message: 'Orientation acknowledged successfully',
      data: {
        orientation: {
          studentId,
          studentName,
          course,
          acknowledgedAt: orientationData.acknowledgedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Acknowledge orientation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while acknowledging orientation',
    });
  }
};

export const getOrientationStatus = async (
  req: AuthRequest & { params: { id: string } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const studentId = parseInt(req.params.id, 10);

    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // Students can only view their own orientation status, unless they are admin/superadmin
    if (req.user.userId !== studentId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own orientation status unless you are an admin',
      });
      return;
    }

    const studentProfile = await db.StudentProfile.findOne({
      where: { userId: studentId },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!studentProfile) {
      res.status(404).json({
        status: 'error',
        message: 'Student profile not found',
      });
      return;
    }

    const orientation = (studentProfile.documents as any)?.orientation || null;

    res.status(200).json({
      status: 'success',
      data: {
        orientation: orientation
          ? {
              acknowledged: true,
              acknowledgedAt: orientation.acknowledgedAt,
              course: orientation.course,
              specialCommitment: orientation.specialCommitment,
              specialBatchTiming: orientation.specialBatchTiming,
              unableToPracticeReason: orientation.unableToPracticeReason,
              paymentExemption: orientation.paymentExemption,
            }
          : { acknowledged: false },
      },
    });
  } catch (error) {
    logger.error('Get orientation status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching orientation status',
    });
  }
};

