import express from 'express';
import { getCityInfo } from '../controllers/geo.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Geo
 *   description: Geographic lookup endpoints
 */

router.get('/city-info', getCityInfo);

export default router;
