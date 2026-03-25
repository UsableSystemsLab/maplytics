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
 * /geo/cities:
 *   get:
 *     summary: Get city boundaries derived by merging district polygons
 *     description: >
 *       Returns city-level boundaries computed by ST_Union of all district
 *       polygons belonging to each city. Optionally filtered by region_id.
 *     tags: [Geo]
 *     parameters:
 *       - in: query
 *         name: region_id
 *         schema:
 *           type: integer
 *         description: Filter cities by region
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection of city boundaries
 */
export const getCityBoundaries = async (req, res, next) => {
    try {
        const regionFilter = req.query.region_id ? Number(req.query.region_id) : null;

        let whereClause = 'd.boundaries IS NOT NULL';
        const bind = [];
        if (regionFilter) {
            bind.push(regionFilter);
            whereClause += ` AND d.region_id = $1`;
        }

        const [results] = await sequelize.query(
            `SELECT d.city_id, c.name_ar, c.name_en, c.region_id,
                    r.name_en AS region_name, r.name_ar AS region_name_ar,
                    ST_AsGeoJSON(ST_Union(ST_MakeValid(d.boundaries)))::json AS geometry
             FROM districts d
             JOIN cities c ON c.city_id = d.city_id
             JOIN regions r ON r.region_id = c.region_id
             WHERE ${whereClause}
             GROUP BY d.city_id, c.name_ar, c.name_en, c.region_id,
                      r.name_en, r.name_ar`,
            { bind }
        );

        const features = results.map(row => ({
            type: 'Feature',
            geometry: row.geometry,
            properties: {
                city_id: row.city_id,
                name_ar: row.name_ar,
                name_en: row.name_en,
                region_id: row.region_id,
                region_name: row.region_name,
            },
        }));

        return res.json({ type: 'FeatureCollection', features });
    } catch (error) {
        logger.error('Error in getCityBoundaries:', error);
        next(error);
    }
};

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

/**
 * @swagger
 * /geo/choropleth:
 *   post:
 *     summary: Count points per boundary using PostGIS ST_Contains
 *     description: >
 *       Accepts an array of [lng, lat] points and a boundary level.
 *       Returns a GeoJSON FeatureCollection with a `count` property per boundary.
 *     tags: [Geo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               points:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items: { type: number }
 *               level:
 *                 type: string
 *                 enum: [regions, cities, districts]
 *               region_id:
 *                 type: integer
 *               city_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection with count per boundary
 */
export const choroplethCount = async (req, res, next) => {
    try {
        const { points, level, region_id, city_id } = req.body;

        if (!points || !Array.isArray(points) || !level) {
            return res.status(400).json({ error: 'points (array of [lng, lat]) and level are required' });
        }

        const pointsJson = JSON.stringify(points.map(([lng, lat]) => ({ lng, lat })));

        let sql;
        const bind = [pointsJson];

        if (level === 'regions') {
            sql = `
                WITH pts AS (
                    SELECT ST_SetSRID(ST_MakePoint((p->>'lng')::float, (p->>'lat')::float), 4326) AS geom
                    FROM json_array_elements($1::json) AS p
                ),
                valid_regions AS MATERIALIZED (
                    SELECT region_id, name_ar, name_en, code, population,
                           ST_MakeValid(boundaries) AS valid_geom
                    FROM regions
                    WHERE boundaries IS NOT NULL
                )
                SELECT vr.region_id, vr.name_ar, vr.name_en, vr.code, vr.population,
                       ST_AsGeoJSON(vr.valid_geom)::json AS geometry,
                       (SELECT COUNT(*) FROM pts WHERE ST_Contains(vr.valid_geom, pts.geom)) AS count
                FROM valid_regions vr`;
        } else if (level === 'cities') {
            let whereClause = 'd.boundaries IS NOT NULL';
            if (region_id) {
                bind.push(Number(region_id));
                whereClause += ` AND d.region_id = $${bind.length}`;
            }
            sql = `
                WITH pts AS (
                    SELECT ST_SetSRID(ST_MakePoint((p->>'lng')::float, (p->>'lat')::float), 4326) AS geom
                    FROM json_array_elements($1::json) AS p
                ),
                city_bounds AS (
                    SELECT d.city_id, c.name_ar, c.name_en, c.region_id,
                           r.name_en AS region_name,
                           ST_Union(ST_MakeValid(d.boundaries)) AS boundaries
                    FROM districts d
                    JOIN cities c ON c.city_id = d.city_id
                    JOIN regions r ON r.region_id = c.region_id
                    WHERE ${whereClause}
                    GROUP BY d.city_id, c.name_ar, c.name_en, c.region_id, r.name_en
                )
                SELECT cb.city_id, cb.name_ar, cb.name_en, cb.region_id, cb.region_name,
                       ST_AsGeoJSON(cb.boundaries)::json AS geometry,
                       (SELECT COUNT(*) FROM pts WHERE ST_Contains(cb.boundaries, pts.geom)) AS count
                FROM city_bounds cb`;
        } else if (level === 'districts') {
            let whereClause = 'd.boundaries IS NOT NULL';
            if (city_id) {
                bind.push(Number(city_id));
                whereClause += ` AND d.city_id = $${bind.length}`;
            } else if (region_id) {
                bind.push(Number(region_id));
                whereClause += ` AND d.region_id = $${bind.length}`;
            }
            sql = `
                WITH pts AS (
                    SELECT ST_SetSRID(ST_MakePoint((p->>'lng')::float, (p->>'lat')::float), 4326) AS geom
                    FROM json_array_elements($1::json) AS p
                )
                SELECT d.district_id, d.name_ar, d.name_en, d.city_id, d.region_id,
                       c.name_en AS city_name, r.name_en AS region_name,
                       ST_AsGeoJSON(d.boundaries)::json AS geometry,
                       (SELECT COUNT(*) FROM pts WHERE ST_Contains(d.boundaries, pts.geom)) AS count
                FROM districts d
                JOIN cities c ON c.city_id = d.city_id
                JOIN regions r ON r.region_id = d.region_id
                WHERE ${whereClause}`;
        } else {
            return res.status(400).json({ error: 'level must be regions, cities, or districts' });
        }

        const [results] = await sequelize.query(sql, { bind });

        const features = results.map(row => ({
            type: 'Feature',
            geometry: row.geometry,
            properties: {
                ...Object.fromEntries(
                    Object.entries(row).filter(([k]) => k !== 'geometry')
                ),
                count: Number(row.count),
            },
        }));

        return res.json({ type: 'FeatureCollection', features });
    } catch (error) {
        logger.error('Error in choroplethCount:', error);
        next(error);
    }
};
