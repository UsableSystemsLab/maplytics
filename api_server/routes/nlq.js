import express from 'express';
import {
  createNLQJob,
  getNLQJobStatus,
  listNLQJobs,
  getNLQResult,
} from '../controllers/nlq.js';

const router = express.Router();

router.post('/', createNLQJob);
router.get('/project/:projectId', listNLQJobs);
router.get('/:id/result', getNLQResult);
router.get('/:id', getNLQJobStatus);

export default router;
