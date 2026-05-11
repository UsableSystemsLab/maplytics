import express from 'express';
import { createNLQJob, getNLQJobStatus, getNLQJobResult, listNLQJobs, updateNLQJobStatus } from '../controllers/nlq.js';

const router = express.Router();

router.post('/', createNLQJob);
router.get('/project/:projectId', listNLQJobs);
router.get('/:id/result', getNLQJobResult);
router.get('/:id', getNLQJobStatus);
router.patch('/:id/status', updateNLQJobStatus);

export default router;
