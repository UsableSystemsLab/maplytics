import express from 'express';
import { extractAndExecute } from '../controllers/aiPoiController.js';

const router = express.Router();

router.post('/', extractAndExecute);

export default router;
