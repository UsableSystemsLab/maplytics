import express from 'express';
import { uploadPublic, uploadPrivate } from '../middlewares/upload.middleware.js';
import { uploadPublicFile, uploadPrivateFile } from '../controllers/upload.controller.js';

const router = express.Router();

// POST /api/upload/public
router.post('/public', uploadPublic.single('file'), uploadPublicFile);

// POST /api/upload/private
router.post('/private', uploadPrivate.single('file'), uploadPrivateFile);

export default router;