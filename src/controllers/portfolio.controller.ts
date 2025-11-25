import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { PortfolioStatus } from '../models/Portfolio';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

// Helper function to validate URLs
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Helper function to validate YouTube URLs
const isValidYoutubeUrl = (url: string): boolean => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return youtubeRegex.test(url);
};

interface UploadPortfolioParams {
  id: string;
}

interface UploadPortfolioBody {
  batchId: number;
  files?: string[]; // Array of file URLs
  pdfUrl?: string;
  youtubeUrl?: string;
}

interface ApprovePortfolioParams {
  id: string;
}

interface ApprovePortfolioBody {
  approve: boolean; // true to approve, false to reject
}

export const uploadPortfolio = async (
  req: AuthRequest & { params: UploadPortfolioParams; body: UploadPortfolioBody },
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
    const { batchId, files, pdfUrl, youtubeUrl } = req.body;

    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // Validation
    if (!batchId) {
      res.status(400).json({
        status: 'error',
        message: 'batchId is required',
      });
      return;
    }

    // At least one of files, pdfUrl, or youtubeUrl must be provided
    if (!files && !pdfUrl && !youtubeUrl) {
      res.status(400).json({
        status: 'error',
        message: 'At least one of files, pdfUrl, or youtubeUrl is required',
      });
      return;
    }

    // Validate files is an array if provided
    if (files && !Array.isArray(files)) {
      res.status(400).json({
        status: 'error',
        message: 'files must be an array of file URLs',
      });
      return;
    }

    // Validate URLs if provided
    if (pdfUrl && !isValidUrl(pdfUrl)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid PDF URL format',
      });
      return;
    }

    if (youtubeUrl && !isValidYoutubeUrl(youtubeUrl)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid YouTube URL format',
      });
      return;
    }

    // Check if user is the student or an admin
    if (req.user.userId !== studentId && req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only upload portfolios for yourself unless you are an admin',
      });
      return;
    }

    // Verify student exists and is a student
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
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

    // Check if student is enrolled in the batch
    const enrollment = await db.Enrollment.findOne({
      where: {
        studentId,
        batchId,
      },
    });

    if (!enrollment) {
      res.status(400).json({
        status: 'error',
        message: 'Student is not enrolled in this batch',
      });
      return;
    }

    // Check if portfolio already exists for this student-batch combination
    let portfolio = await db.Portfolio.findOne({
      where: {
        studentId,
        batchId,
      },
    });

    // Store files as JSON array
    const filesJson = files ? (files as any) : null;

    if (portfolio) {
      // Update existing portfolio
      if (filesJson) portfolio.files = filesJson;
      if (pdfUrl !== undefined) portfolio.pdfUrl = pdfUrl || null;
      if (youtubeUrl !== undefined) portfolio.youtubeUrl = youtubeUrl || null;
      portfolio.status = PortfolioStatus.PENDING; // Reset to pending when files are updated
      portfolio.approvedBy = null;
      portfolio.approvedAt = null;
      await portfolio.save();
    } else {
      // Create new portfolio
      portfolio = await db.Portfolio.create({
        studentId,
        batchId,
        files: filesJson,
        pdfUrl: pdfUrl || null,
        youtubeUrl: youtubeUrl || null,
        status: PortfolioStatus.PENDING,
      });
    }

    res.status(portfolio.createdAt === portfolio.updatedAt ? 201 : 200).json({
      status: 'success',
      message: portfolio.createdAt === portfolio.updatedAt ? 'Portfolio uploaded successfully' : 'Portfolio updated successfully',
      data: {
        portfolio: {
          id: portfolio.id,
          studentId: portfolio.studentId,
          batchId: portfolio.batchId,
          files: portfolio.files,
          pdfUrl: portfolio.pdfUrl,
          youtubeUrl: portfolio.youtubeUrl,
          status: portfolio.status,
          createdAt: portfolio.createdAt,
          updatedAt: portfolio.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Upload portfolio error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while uploading portfolio',
    });
  }
};

export const approvePortfolio = async (
  req: AuthRequest & { params: ApprovePortfolioParams; body: ApprovePortfolioBody },
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

    const portfolioId = parseInt(req.params.id, 10);
    const { approve } = req.body;

    if (isNaN(portfolioId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid portfolio ID',
      });
      return;
    }

    // Check if user is admin or superadmin (Admin/SuperAdmin only)
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins or superadmins can approve portfolios',
      });
      return;
    }

    if (typeof approve !== 'boolean') {
      res.status(400).json({
        status: 'error',
        message: 'approve field is required and must be a boolean',
      });
      return;
    }

    // Find portfolio
    const portfolio = await db.Portfolio.findByPk(portfolioId);
    if (!portfolio) {
      res.status(404).json({
        status: 'error',
        message: 'Portfolio not found',
      });
      return;
    }

    // Update portfolio status
    portfolio.status = approve ? PortfolioStatus.APPROVED : PortfolioStatus.REJECTED;
    portfolio.approvedBy = req.user.userId;
    portfolio.approvedAt = new Date();
    await portfolio.save();

    // Get student info for response
    const student = await db.User.findByPk(portfolio.studentId, {
      attributes: ['id', 'name', 'email'],
    });

    res.status(200).json({
      status: 'success',
      message: `Portfolio ${approve ? 'approved' : 'rejected'} successfully`,
      data: {
        portfolio: {
          id: portfolio.id,
          studentId: portfolio.studentId,
          studentName: student?.name,
          studentEmail: student?.email,
          batchId: portfolio.batchId,
          status: portfolio.status,
          approvedBy: portfolio.approvedBy,
          approvedAt: portfolio.approvedAt,
          updatedAt: portfolio.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Approve portfolio error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while approving portfolio',
    });
  }
};

