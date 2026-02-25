import { sequelize } from '../configs/postgresDB.js';
import { District, City, Region } from '../models/index.js';
import logger from '../configs/logger.js';

// ─── Validation helpers ────────────────────────────────────────────────────────

/**
 * Parse and validate a latitude value.
 * Valid range: -90 to 90.
 * @param {*} value - raw query param string
 * @returns {number} parsed latitude
 * @throws {Error} if invalid
 */
const parseLatitude = (value) => {
    if (value === undefined || value === null || value === '') {
        throw new Error('lat is required');
    }
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`lat must be a number, received: "${value}"`);
    }
    if (num < -90 || num > 90) {
        throw new Error(`lat must be between -90 and 90, received: ${num}`);
    }
    return num;
};

/**
 * Parse and validate a longitude value.
 * Valid range: -180 to 180.
 * @param {*} value - raw query param string
 * @returns {number} parsed longitude
 * @throws {Error} if invalid
 */
const parseLongitude = (value) => {
    if (value === undefined || value === null || value === '') {
        throw new Error('lng is required');
    }
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`lng must be a number, received: "${value}"`);
    }
    if (num < -180 || num > 180) {
        throw new Error(`lng must be between -180 and 180, received: ${num}`);
    }
    return num;
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /geo/city-info:
 *   get:
 *     summary: Get city information for a geographic point
 *     description: >
 *       Accepts a latitude/longitude pair, determines which district boundary
 *       contains the point using PostGIS ST_Contains, then returns the
 *       corresponding city and region information as a GeoJSON Feature.
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude of the point (WGS-84)
 *         example: 24.7136
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude of the point (WGS-84)
 *         example: 46.6753
 *     responses:
 *       200:
 *         description: GeoJSON Feature with city/district/region data in properties
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: Feature
 *                 geometry:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: Point
 *                     coordinates:
 *                       type: array
 *                       items:
 *                         type: number
 *                       example: [46.6753, 24.7136]
 *                 properties:
 *                   type: object
 *                   properties:
 *                     district:
 *                       type: object
 *                       properties:
 *                         district_id: { type: integer }
 *                         name_ar: { type: string }
 *                         name_en: { type: string }
 *                     city:
 *                       type: object
 *                       properties:
 *                         city_id: { type: integer }
 *                         name_ar: { type: string }
 *                         name_en: { type: string }
 *                     region:
 *                       type: object
 *                       properties:
 *                         region_id: { type: integer }
 *                         name_ar: { type: string }
 *                         name_en: { type: string }
 *                         code: { type: string }
 *       400:
 *         description: Invalid or missing lat/lng parameters
 *       404:
 *         description: No district found containing the given point
 *       500:
 *         description: Internal server error
 */
export const getCityInfo = async (req, res, next) => {

    let lat, lng;
    try {
        lat = parseLatitude(req.query.lat);
        lng = parseLongitude(req.query.lng);
    } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
    }

    try {
        // Find the district whose boundary contains the point
        const pointExpr = sequelize.fn(
            'ST_SetSRID',
            sequelize.fn('ST_Point', lng, lat),
            4326
        );

        const district = await District.findOne({
            where: sequelize.where(
                sequelize.fn('ST_Contains', sequelize.col('boundaries'), pointExpr),
                true
            ),
            attributes: ['district_id', 'name_ar', 'name_en', 'city_id', 'region_id'],
        });

        // no district found
        if (!district) {
            logger.warn(`No district found for point (lat=${lat}, lng=${lng})`);
            return res.status(404).json({
                error: 'No district found for the given coordinates.',
                point: { lat, lng },
            });
        }

        // Fetch city + parent region in one query
        const city = await City.findOne({
            where: { city_id: district.city_id },
            attributes: ['city_id', 'name_ar', 'name_en', 'region_id'],
            include: [
                {
                    model: Region,
                    as: 'region',
                    attributes: ['region_id', 'name_ar', 'name_en', 'code'],
                },
            ],
        });

        if (!city) {
            logger.error(
                `District ${district.district_id} has city_id=${district.city_id} but city record not found`
            );
            return res.status(404).json({
                error: 'City not found for the identified district.',
                district_id: district.district_id,
            });
        }

        // Return GeoJSON Feature
        logger.info(
            `Point (lat=${lat}, lng=${lng}) → district=${district.district_id}, city=${city.city_id}`
        );

        return res.status(200).json({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat],
            },
            properties: {
                district: {
                    district_id: district.district_id,
                    name_ar: district.name_ar,
                    name_en: district.name_en,
                },
                city: {
                    city_id: city.city_id,
                    name_ar: city.name_ar,
                    name_en: city.name_en,
                },
                region: city.region
                    ? {
                        region_id: city.region.region_id,
                        name_ar: city.region.name_ar,
                        name_en: city.region.name_en,
                        code: city.region.code,
                    }
                    : null,
            },
        });

    } catch (error) {
        logger.error('Error in getCityInfo:', error);
        next(error);
    }
};

// ─── Boundary endpoints ───────────────────────────────────────────────────────

/**
 * @swagger
 * /geo/regions:
 *   get:
 *     summary: Get all regions as a GeoJSON FeatureCollection
 *     tags: [Geo]
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection of region boundaries
 */
export const getRegionBoundaries = async (req, res, next) => {
    try {
        const regions = await Region.findAll({
            attributes: ['region_id', 'name_ar', 'name_en', 'code', 'population', 'boundaries'],
        });

        const features = regions
            .filter(r => r.boundaries)
            .map(r => ({
                type: 'Feature',
                geometry: r.boundaries,
                properties: {
                    region_id: r.region_id,
                    name_ar: r.name_ar,
                    name_en: r.name_en,
                    code: r.code,
                    population: r.population,
                },
            }));

        return res.json({ type: 'FeatureCollection', features });
    } catch (error) {
        logger.error('Error in getRegionBoundaries:', error);
        next(error);
    }
};

/**
 * @swagger
 * /geo/districts:
 *   get:
 *     summary: Get districts as a GeoJSON FeatureCollection
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: region_id
 *         schema:
 *           type: integer
 *         description: Filter by region
 *       - in: query
 *         name: city_id
 *         schema:
 *           type: integer
 *         description: Filter by city
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection of district boundaries
 */
export const getDistrictBoundaries = async (req, res, next) => {
    try {
        const where = {};
        if (req.query.region_id) where.region_id = Number(req.query.region_id);
        if (req.query.city_id) where.city_id = Number(req.query.city_id);

        const districts = await District.findAll({
            where,
            attributes: ['district_id', 'name_ar', 'name_en', 'city_id', 'region_id', 'boundaries'],
            include: [
                { model: City, as: 'city', attributes: ['name_en', 'name_ar'] },
                { model: Region, as: 'region', attributes: ['name_en', 'name_ar'] },
            ],
        });

        const features = districts
            .filter(d => d.boundaries)
            .map(d => ({
                type: 'Feature',
                geometry: d.boundaries,
                properties: {
                    district_id: d.district_id,
                    name_ar: d.name_ar,
                    name_en: d.name_en,
                    city_id: d.city_id,
                    city_name: d.city?.name_en || '',
                    region_id: d.region_id,
                    region_name: d.region?.name_en || '',
                },
            }));

        return res.json({ type: 'FeatureCollection', features });
    } catch (error) {
        logger.error('Error in getDistrictBoundaries:', error);
        next(error);
    }
};
