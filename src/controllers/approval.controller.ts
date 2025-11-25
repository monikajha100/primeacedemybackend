import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { ChangeRequestStatus } from '../models/ChangeRequest';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreateApprovalBody {
  entityType: string;
  entityId: number;
  reason?: string;
}

interface RespondToApprovalParams {
  id: string;
}

interface RespondToApprovalBody {
  approve: boolean; // true to approve, false to reject
}

export const createApproval = async (
  req: AuthRequest & { body: CreateApprovalBody },
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

    const { entityType, entityId, reason } = req.body;

    // Validation
    if (!entityType || !entityId) {
      res.status(400).json({
        status: 'error',
        message: 'entityType and entityId are required',
      });
      return;
    }

    if (typeof entityId !== 'number' || entityId <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'entityId must be a positive number',
      });
      return;
    }

    // Create change request
    const changeRequest = await db.ChangeRequest.create({
      entityType,
      entityId,
      requestedBy: req.user.userId,
      reason: reason || null,
      status: ChangeRequestStatus.PENDING,
    });

    // Fetch with requester information
    const changeRequestWithDetails = await db.ChangeRequest.findByPk(changeRequest.id);
    const requester = changeRequestWithDetails ? await changeRequestWithDetails.getRequester() : null;

    res.status(201).json({
      status: 'success',
      message: 'Change request created successfully',
      data: {
        changeRequest: {
          id: changeRequestWithDetails?.id,
          entityType: changeRequestWithDetails?.entityType,
          entityId: changeRequestWithDetails?.entityId,
          reason: changeRequestWithDetails?.reason,
          status: changeRequestWithDetails?.status,
          requestedBy: requester
            ? {
                id: requester.id,
                name: requester.name,
                email: requester.email,
              }
            : null,
          createdAt: changeRequestWithDetails?.createdAt,
          updatedAt: changeRequestWithDetails?.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Create approval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating change request',
    });
  }
};

export const respondToApproval = async (
  req: AuthRequest & { params: RespondToApprovalParams; body: RespondToApprovalBody },
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

    // Check if user is SuperAdmin
    if (req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only SuperAdmin can respond to approval requests',
      });
      return;
    }

    const changeRequestId = parseInt(req.params.id, 10);
    const { approve } = req.body;

    if (isNaN(changeRequestId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid change request ID',
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

    // Find change request
    const changeRequest = await db.ChangeRequest.findByPk(changeRequestId);

    if (!changeRequest) {
      res.status(404).json({
        status: 'error',
        message: 'Change request not found',
      });
      return;
    }

    // Check if already processed
    if (changeRequest.status !== ChangeRequestStatus.PENDING) {
      res.status(400).json({
        status: 'error',
        message: `Change request has already been ${changeRequest.status}`,
      });
      return;
    }

    // Update change request (let Sequelize handle timestamp)
    await changeRequest.update({
      status: approve ? ChangeRequestStatus.APPROVED : ChangeRequestStatus.REJECTED,
      approverId: req.user.userId,
    });

    // Fetch with approver information
    const updatedChangeRequest = await db.ChangeRequest.findByPk(changeRequest.id);
    const updatedRequester = updatedChangeRequest ? await updatedChangeRequest.getRequester() : null;
    const updatedApprover = updatedChangeRequest ? await updatedChangeRequest.getApprover() : null;

    res.status(200).json({
      status: 'success',
      message: `Change request ${approve ? 'approved' : 'rejected'} successfully`,
      data: {
        changeRequest: {
          id: updatedChangeRequest?.id,
          entityType: updatedChangeRequest?.entityType,
          entityId: updatedChangeRequest?.entityId,
          reason: updatedChangeRequest?.reason,
          status: updatedChangeRequest?.status,
          requestedBy: updatedRequester
            ? {
                id: updatedRequester.id,
                name: updatedRequester.name,
                email: updatedRequester.email,
              }
            : null,
          approver: updatedApprover
            ? {
                id: updatedApprover.id,
                name: updatedApprover.name,
                email: updatedApprover.email,
              }
            : null,
          createdAt: updatedChangeRequest?.createdAt,
          updatedAt: updatedChangeRequest?.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Respond to approval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while responding to approval',
    });
  }
};

