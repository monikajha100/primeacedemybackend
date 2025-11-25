import { Router } from 'express';
import * as sessionController from '../controllers/session.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /sessions → get sessions (with optional filters: facultyId, batchId, status)
router.get(
  '/',
  verifyTokenMiddleware,
  sessionController.getSessions
);

// POST /sessions → create session (faculty/admin)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN),
  sessionController.createSession
);

// POST /sessions/:id/checkin → faculty starts session (faculty-only)
router.post(
  '/:id/checkin',
  verifyTokenMiddleware,
  checkRole(UserRole.FACULTY),
  sessionController.checkinSession
);

// POST /sessions/:id/checkout → faculty ends session (faculty-only)
router.post(
  '/:id/checkout',
  verifyTokenMiddleware,
  checkRole(UserRole.FACULTY),
  sessionController.checkoutSession
);

// POST /sessions/:id/attendance → mark attendance
router.post(
  '/:id/attendance',
  verifyTokenMiddleware,
  sessionController.markAttendance
);

export default router;

