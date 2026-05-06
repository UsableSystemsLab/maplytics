import express from 'express';
import {
  createNLQJob,
  getNLQJobStatus,
  listNLQJobs,
  getNLQResult,
  updateNLQJobStatus,
} from '../controllers/nlq.js';

const router = express.Router();

router.post('/', createNLQJob);
router.get('/project/:projectId', listNLQJobs);
router.get('/:id/result', getNLQResult);
router.get('/:id', getNLQJobStatus);
router.patch('/:id/status', updateNLQJobStatus);

export default router;
