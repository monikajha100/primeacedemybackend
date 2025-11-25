import { Router } from 'express';
import * as employeeAttendanceController from '../controllers/employeeAttendance.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /employee-attendance/punch-in → punch in
router.post(
  '/punch-in',
  verifyTokenMiddleware,
  employeeAttendanceController.punchIn
);

// POST /employee-attendance/punch-out → punch out
router.post(
  '/punch-out',
  verifyTokenMiddleware,
  employeeAttendanceController.punchOut
);

// GET /employee-attendance/today → get today's punch status
router.get(
  '/today',
  verifyTokenMiddleware,
  employeeAttendanceController.getTodayPunch
);

// GET /employee-attendance/daily-log → get daily log
router.get(
  '/daily-log',
  verifyTokenMiddleware,
  employeeAttendanceController.getDailyLog
);

// POST /employee-attendance/break → add break
router.post(
  '/break',
  verifyTokenMiddleware,
  employeeAttendanceController.addBreak
);

// POST /employee-attendance/break/:breakId/end → end break
router.post(
  '/break/:breakId/end',
  verifyTokenMiddleware,
  employeeAttendanceController.endBreak
);

// GET /employee-attendance/all → get all employees attendance (admin only)
router.get(
  '/all',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  employeeAttendanceController.getAllEmployeesAttendance
);

export default router;




