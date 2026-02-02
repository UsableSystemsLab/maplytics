import express from 'express';
import { uploadPublic, uploadPrivate } from '../middlewares/upload.middleware.js';
import { uploadPublicFile, uploadPrivateFile } from '../controllers/upload.controller.js';
import { extractUserId } from '../middlewares/firebaseAuth.js';

const router = express.Router();

// User ID is extracted first, then file is uploaded
router.post('/public', extractUserId, uploadPublic.single('file'), uploadPublicFile);
router.post('/private', extractUserId, uploadPrivate.single('file'), uploadPrivateFile);

export default router;