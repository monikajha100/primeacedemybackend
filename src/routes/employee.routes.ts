import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /employees → create employee profile (admin/superadmin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  employeeController.createEmployeeProfile
);

// GET /employees/:id → get employee profile
router.get(
  '/:id',
  verifyTokenMiddleware,
  employeeController.getEmployeeProfile
);

export default router;




