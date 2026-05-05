import express from 'express';
import { createNLQJob, getNLQJobStatus, getNLQJobResult, listNLQJobs } from '../controllers/nlq.js';

const router = express.Router();

router.post('/', createNLQJob);
router.get('/project/:projectId', listNLQJobs);
router.get('/:id/result', getNLQJobResult);
router.get('/:id', getNLQJobStatus);

export default router;
