import { Router } from 'express';
import * as orientationController from '../controllers/orientation.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /orientation/acknowledge → acknowledge orientation (no auth required - students may not be logged in yet)
router.post(
  '/acknowledge',
  orientationController.acknowledgeOrientation
);

// GET /orientation/:id/status → get orientation status (auth required)
router.get(
  '/:id/status',
  verifyTokenMiddleware,
  orientationController.getOrientationStatus
);

export default router;

