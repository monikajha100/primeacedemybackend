import { Router } from 'express';
import * as approvalController from '../controllers/approval.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /approvals → create change request
router.post(
  '/',
  verifyTokenMiddleware,
  approvalController.createApproval
);

// POST /approvals/:id/respond → SuperAdmin approves/rejects
router.post(
  '/:id/respond',
  verifyTokenMiddleware,
  checkRole(UserRole.SUPERADMIN),
  approvalController.respondToApproval
);

export default router;

