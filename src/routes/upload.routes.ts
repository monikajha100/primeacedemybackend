import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';
import { upload, handleUploadError } from '../middleware/upload.middleware';

const router = Router();

// POST /upload → upload multiple files
router.post(
  '/',
  verifyTokenMiddleware,
  upload.array('files', 10), // Accept up to 10 files with field name 'files'
  handleUploadError,
  uploadController.uploadFiles
);

export default router;

