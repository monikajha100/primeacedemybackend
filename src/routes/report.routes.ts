import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /reports/all-students
router.get(
  '/all-students',
  verifyTokenMiddleware,
  reportController.getAllStudents
);

// GET /reports/students-without-batch
router.get(
  '/students-without-batch',
  verifyTokenMiddleware,
  reportController.getStudentsWithoutBatch
);

// GET /reports/batch-attendance?batchId=&from=&to=
router.get(
  '/batch-attendance',
  verifyTokenMiddleware,
  reportController.getBatchAttendance
);

// GET /reports/pending-payments
router.get(
  '/pending-payments',
  verifyTokenMiddleware,
  reportController.getPendingPayments
);

// GET /reports/portfolio-status
router.get(
  '/portfolio-status',
  verifyTokenMiddleware,
  reportController.getPortfolioStatus
);

// Import extended report functions
import * as extendedReportController from '../controllers/report-extended.controller';

// GET /reports/student/:studentId/current-batch
router.get(
  '/student/:studentId/current-batch',
  verifyTokenMiddleware,
  extendedReportController.getStudentCurrentBatch
);

// GET /reports/student/:studentId/attendance?from=&to=
router.get(
  '/student/:studentId/attendance',
  verifyTokenMiddleware,
  extendedReportController.getStudentAttendance
);

// GET /reports/batches-by-faculty?facultyId=&from=&to=
router.get(
  '/batches-by-faculty',
  verifyTokenMiddleware,
  extendedReportController.getBatchesByFaculty
);

// GET /reports/monthwise-payments?month=&year=
router.get(
  '/monthwise-payments',
  verifyTokenMiddleware,
  extendedReportController.getMonthwisePayments
);

// GET /reports/all-analysis
router.get(
  '/all-analysis',
  verifyTokenMiddleware,
  extendedReportController.getAllAnalysisReports
);

// GET /reports/download?type=
router.get(
  '/download',
  verifyTokenMiddleware,
  extendedReportController.downloadReportCSV
);

export default router;

