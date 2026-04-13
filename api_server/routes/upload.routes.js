import express from 'express';
import { uploadPublic, uploadPrivate } from '../middlewares/upload.middleware.js';
import { uploadPublicFile, uploadPrivateFile } from '../controllers/upload.controller.js';

const router = express.Router();

// User ID is extracted first, then file is uploaded
router.post('/public', uploadPublic.single('file'), uploadPublicFile);
router.post('/private', uploadPrivate.single('file'), uploadPrivateFile);

export default router;