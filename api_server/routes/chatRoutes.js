import express from 'express';
import { getProjectChatHistory, sendMessage, getJobStatus } from '../controllers/chatController.js';

const router = express.Router();

router.get('/:projectId', getProjectChatHistory);
router.post('/:projectId/message', sendMessage);
router.get('/job-status/:sessionId', getJobStatus);

export default router;
