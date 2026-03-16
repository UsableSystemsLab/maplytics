import express from 'express';
import { getCityInfo, getRegionBoundaries, getDistrictBoundaries } from '../controllers/geo.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Geo
 *   description: Geographic lookup endpoints
 */

router.get('/city-info', getCityInfo);
router.get('/regions', getRegionBoundaries);
router.get('/districts', getDistrictBoundaries);

export default router;
