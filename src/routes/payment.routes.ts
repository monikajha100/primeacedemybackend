import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /payments → list all payments (admin only)
router.get(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  paymentController.getAllPayments
);

// POST /payments → create payment transaction (admin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  paymentController.createPayment
);

// POST /payments/:id/pay → record payment/receipt (admin only)
router.post(
  '/:id/pay',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  paymentController.recordPayment
);

// GET /payments/students/:id/payments → list all payments for a student
router.get(
  '/students/:id/payments',
  verifyTokenMiddleware,
  paymentController.getStudentPayments
);

export default router;
