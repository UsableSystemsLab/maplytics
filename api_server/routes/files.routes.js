import express from 'express';
import { getPublicFile, getPrivateFile } from '../controllers/files.controller.js';

const router = express.Router();

// Serve public datasets (organized by user ID) - Fetched from S3
router.get('/public/:userId/:filename', getPublicFile);

// Serve private datasets (organized by project ID) - Fetched from S3
router.get('/private/:projectId/:filename', getPrivateFile);

export default router;

