import { Router } from 'express';
import * as facultyController from '../controllers/faculty.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /faculty → create faculty profile
router.post(
  '/',
  verifyTokenMiddleware,
  facultyController.createFaculty
);

export default router;

