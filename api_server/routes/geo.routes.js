import express from 'express';
import { getCityInfo, getRegionBoundaries, getCityBoundaries, getDistrictBoundaries, choroplethCount } from '../controllers/geo.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Geo
 *   description: Geographic lookup endpoints
 */

router.get('/city-info', getCityInfo);
router.get('/regions', getRegionBoundaries);
router.get('/cities', getCityBoundaries);
router.get('/districts', getDistrictBoundaries);
router.post('/choropleth', choroplethCount);

export default router;
