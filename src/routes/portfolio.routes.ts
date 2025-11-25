import { Router } from 'express';
import * as portfolioController from '../controllers/portfolio.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /students/:id/portfolio
router.post(
  '/students/:id/portfolio',
  verifyTokenMiddleware,
  portfolioController.uploadPortfolio
);

// POST /portfolio/:id/approve (Admin/SuperAdmin only)
router.post(
  '/portfolio/:id/approve',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  portfolioController.approvePortfolio
);

export default router;

