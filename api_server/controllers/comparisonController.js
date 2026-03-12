import { sequelize } from '../configs/postgresDB.js';
import { District } from '../models/index.js';
import { inferFieldTypes, computeFieldStats } from '../utils/fieldUtils.js';
import logger from '../configs/logger.js';
import { QueryTypes } from 'sequelize';

/**
 * @swagger
 * tags:
 *   name: Comparison
 *   description: District comparison and spatial statistics
 */

/**
 * @swagger
 * /comparison/stats:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Compare a dataset across multiple districts
 *     description: Uses PostGIS ST_Contains to spatially filter dataset features by district boundaries and compute per-district field statistics.
 *     tags: [Comparison]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataset_id
 *               - district_ids
 *             properties:
 *               dataset_id:
 *                 type: string
 *                 description: The ID of the dataset to analyze
 *                 example: "ds-123456"
 *               district_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of district IDs to compare
 *                 example: ["10200018057", "10200018073"]
 *     responses:
 *       200:
 *         description: Comparison statistics for each district
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fields:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [string, number]
 *                 districts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       district_id:
 *                         type: string
 *                       name_en:
 *                         type: string
 *                       name_ar:
 *                         type: string
 *                       total_count:
 *                         type: integer
 *                       field_stats:
 *                         type: object
 *       400:
 *         description: Missing or invalid parameters
 */
export const getDistrictComparison = async (req, res, next) => {
    const { dataset_id, district_ids } = req.body;

    if (!dataset_id || !district_ids || !Array.isArray(district_ids) || district_ids.length === 0) {
        return res.status(400).json({
            error: 'dataset_id and district_ids (non-empty array) are required.',
        });
    }

    try {
        //Sample properties to infer field schema
        const sampleRows = await sequelize.query(`
            SELECT fp.properties
            FROM "Feature_Property" fp
            JOIN "Feature" f ON f.feature_id = fp.feature_id
            WHERE f.dataset_id = :dataset_id
            LIMIT 100
        `, {
            replacements: { dataset_id },
            type: QueryTypes.SELECT,
        });

        const fields = inferFieldTypes(sampleRows.map(r => r.properties));

        // Compute stats for each district
        const districts = await Promise.all(
            district_ids.map(districtId => computeDistrictStats(dataset_id, districtId, fields))
        );

        return res.status(200).json({ fields, districts });
    } catch (error) {
        logger.error('Error in getDistrictComparison:', error);
        next(error);
    }
};

/**
 * Compute statistics for features of a dataset within a single district.
 * Uses PostGIS ST_Contains for spatial intersection.
**/
async function computeDistrictStats(datasetId, districtId, fields) {
    const district = await District.findByPk(districtId, {
        attributes: ['district_id', 'name_en', 'name_ar'],
    });

    if (!district) {
        return { district_id: districtId, error: 'District not found' };
    }

    const rows = await sequelize.query(`
        SELECT fp.properties
        FROM "Feature" f
        JOIN "Feature_Property" fp ON fp.feature_id = f.feature_id
        JOIN districts d ON ST_Contains(d.boundaries, f.geometry)
        WHERE f.dataset_id = :datasetId
          AND d.district_id = :districtId
    `, {
        replacements: { datasetId, districtId },
        type: QueryTypes.SELECT,
    });

    const propertiesList = rows.map(r => r.properties);

    return {
        district_id: district.district_id,
        name_en: district.name_en,
        name_ar: district.name_ar,
        total_count: propertiesList.length,
        field_stats: computeFieldStats(propertiesList, fields),
    };
}
