import express from 'express';
import { resolveLocations } from '../controllers/locations.js';

const router = express.Router();

router.get('/resolve', resolveLocations);

export default router;
