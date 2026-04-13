import express from 'express';
import { getDistrictComparison } from '../controllers/comparisonController.js';

const router = express.Router();

router.post('/stats', getDistrictComparison);

export default router;
