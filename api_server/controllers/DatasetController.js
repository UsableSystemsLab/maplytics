import { Dataset, Feature, Feature_Property, Dataset_Metadata, User_Dataset_Filter_Prefs } from '../models/index.js';
import { sequelize } from '../configs/postgresDB.js';
import logger from '../configs/logger.js';
import { Op } from 'sequelize';
import { extractLatitude, extractLongitude, removeCoordinateFields, inferFields } from '../lib/geo/index.js';
import { resolveFilterableFields } from '../lib/filter-prefs/resolve.js';

/**
 * DatasetController - Responsible for managing geospatial datasets.
 **/

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // anything other than digits and lower case letters
        .replace(/(^-|-$)/g, '') // removes leading and trailing dashes
        + '-' + Date.now();
};

const SUPPORTED_GEOMETRY_TYPES = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];


const extractGeometry = (item) => {
    // Item has GeoJSON geometry field
    if (item.geometry && typeof item.geometry === 'object') {
        const geom = item.geometry;
        if (geom.type && SUPPORTED_GEOMETRY_TYPES.includes(geom.type) && geom.coordinates) {
            return {
                geometry: sequelize.fn('ST_SetSRID',
                    sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(geom)),
                    4326),
                type: geom.type
            };
        }
    }

    // Item has lat/lng fields
    const lat = extractLatitude(item);
    const lng = extractLongitude(item);
    if (lat !== null && lng !== null) {
        return {
            geometry: sequelize.fn('ST_SetSRID', sequelize.fn('ST_Point', lng, lat), 4326),
            type: 'Point'
        };
    }

    return null;
};


const calculateBoundingBox = (items) => {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    items.forEach(item => {
        if (item.geometry && item.geometry.coordinates) {

            // Handle different geometry types
            const coords = item.geometry.coordinates;
            const flatCoords = flattenCoordinates(coords, item.geometry.type);
            flatCoords.forEach(([lng, lat]) => {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            });
        } else {
            const lat = extractLatitude(item);
            const lng = extractLongitude(item);
            if (lat !== null && lng !== null) {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            }
        }
    });

    return { minLat, maxLat, minLng, maxLng };
};


const flattenCoordinates = (coords, type) => {
    if (type === 'Point') return [coords];
    if (type === 'LineString' || type === 'MultiPoint') return coords;
    if (type === 'Polygon' || type === 'MultiLineString') return coords.flat();
    if (type === 'MultiPolygon') return coords.flat(2); // flattens the array by two levels.
    return [];
};

/**
 * @swagger
 * /datasets/ingest:
 *   post:
 *     summary: Ingest a generic geospatial dataset
 *     tags: [Datasets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataset_name
 *               - data
 *             properties:
 *               dataset_name:
 *                 type: string
 *                 example: 'Riyadh Restaurants'
 *               entity_type:
 *                 type: string
 *                 example: 'restaurant'
 *               description:
 *                 type: string
 *                 example: 'Restaurant locations in Riyadh'
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Dataset ingested successfully
 *       400:
 *         description: Invalid request data
 */
export const ingestDataset = async (req, res, next) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const transaction = await sequelize.transaction();

    try {
        const {
            dataset_name,
            entity_type = 'generic',
            description = '',
            data_source = 'user_upload',
            spatial_coverage = '',
            is_public = true,
            data
        } = req.body;

        // Validate required fields
        if (!dataset_name || !data || !Array.isArray(data)) {
            return res.status(400).json({
                error: 'Invalid request. dataset_name and data (array) are required.'
            });
        }

        if (data.length === 0) {
            return res.status(400).json({
                error: 'Data array is empty. At least one feature is required.'
            });
        }

        // Check for duplicate dataset (same name for same user)
        const effectiveUserId = req.userId;
        const existingDataset = await Dataset.findOne({
            where: {
                name: dataset_name,
                user_id: effectiveUserId
            }
        });

        if (existingDataset && !req.body.force_override) {
            return res.status(409).json({
                error: 'A dataset with this name already exists.',
                existing_dataset: {
                    id: existingDataset.id,
                    name: existingDataset.name,
                    feature_count: existingDataset.feature_count,
                    created_at: existingDataset.createdAt
                },
                hint: 'Use a different name or set force_override: true to replace the existing dataset.'
            });
        }

        if (existingDataset && req.body.force_override) {
            logger.info(`Overriding existing dataset: ${existingDataset.id}`);
            // delete the old dataset
            await existingDataset.destroy({ transaction });
        }

        const itemsWithGeometry = data.filter(item => extractGeometry(item) !== null);

        if (itemsWithGeometry.length === 0) {
            return res.status(400).json({
                error: 'No valid geometry found. Each item must have either a GeoJSON geometry field or latitude/longitude fields.'
            });
        }

        const geometryTypeCounts = {};
        itemsWithGeometry.forEach(item => {
            const geom = extractGeometry(item);
            if (geom) {
                geometryTypeCounts[geom.type] = (geometryTypeCounts[geom.type] || 0) + 1;
            }
        });

        // the most common geometry type in the dataset is the primary one
        const primaryGeometryType = Object.keys(geometryTypeCounts)
            .reduce((a, b) => geometryTypeCounts[a] > geometryTypeCounts[b] ? a : b, 'Point');

        const { minLat, maxLat, minLng, maxLng } = calculateBoundingBox(itemsWithGeometry);



        const dataset = await Dataset.create({  
            slug: generateSlug(dataset_name),
            name: dataset_name,
            description,
            data_source,
            entity_type,
            geometry_type: primaryGeometryType.toUpperCase(),
            spatial_coverage,
            bounding_box: sequelize.fn(
                'ST_MakeEnvelope',
                minLng, minLat, maxLng, maxLat, 4326
            ),
            feature_count: itemsWithGeometry.length,
            file_format: 'JSON',
            user_id: effectiveUserId,
            is_public: is_public,
            is_verified: req.isAdmin || false
        }, { transaction });

        for (const item of itemsWithGeometry) {
            const geomResult = extractGeometry(item);

            const feature = await Feature.create({
                dataset_id: dataset.id,
                geometry: geomResult.geometry
            }, { transaction });

            const properties = removeCoordinateFields(item);

            await Feature_Property.create({
                feature_id: feature.feature_id,
                properties
            }, { transaction });
        }

        await transaction.commit();

        logger.info(`Dataset "${dataset_name}" ingested with ${itemsWithGeometry.length} features (${primaryGeometryType})`);

        res.status(201).json({
            message: 'Dataset ingested successfully',
            id: dataset.id,
            slug: dataset.slug,
            geometry_type: primaryGeometryType,
            feature_count: itemsWithGeometry.length
        });

    } catch (error) {
        await transaction.rollback();
        logger.error('Error ingesting dataset:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets:
 *   get:
 *     summary: Get all available datasets
 *     tags: [Datasets]
 *     responses:
 *       200:
 *         description: List of datasets
 */
export const getAllDatasets = async (req, res, next) => {
    try {
        // Authenticated endpoint - returns only the user's private datasets
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const datasets = await Dataset.findAll({
            where: {
                user_id: req.userId,
                is_public: false
            },
            attributes: [
                'id',
                'slug',
                'name',
                'description',
                'entity_type',
                'geometry_type',
                'feature_count',
                'user_id',
                'author',
                'is_public',
                'is_verified',
                'last_updated'
            ],
            order: [['last_updated', 'DESC']]
        });

        res.status(200).json({
            count: datasets.length,
            datasets
        });
    } catch (error) {
        logger.error('Error fetching user datasets:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets/public:
 *   get:
 *     summary: Get all public datasets
 *     tags: [Datasets]
 *     responses:
 *       200:
 *         description: List of public datasets
 */
export const getAllPublicDatasets = async (req, res, next) => {
    try {
        const datasets = await Dataset.findAll({
            where: { is_public: true },
            attributes: [
                'id',
                'slug',
                'name',
                'description',
                'entity_type',
                'geometry_type',
                'feature_count',
                'user_id',
                'author',
                'is_public',
                'is_verified',
                'last_updated'
            ],
            order: [['last_updated', 'DESC']]
        });

        res.status(200).json({
            count: datasets.length,
            datasets
        });
    } catch (error) {
        logger.error('Error fetching public datasets:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets/{id}/geojson:
 *   get:
 *     summary: Get dataset as GeoJSON FeatureCollection
 *     tags: [Datasets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dataset ID (UUID) or slug
 *     responses:
 *       200:
 *         description: GeoJSON FeatureCollection
 *       404:
 *         description: Dataset not found
 */
export const getDatasetAsGeoJSON = async (req, res, next) => {
    try {
        const { id } = req.params;

        const dataset = await Dataset.findOne({
            where: sequelize.or(
                { id: id },
                { slug: id }
            )
        });

        if (!dataset) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        // Fetch all features with their properties
        const features = await Feature.findAll({
            where: { dataset_id: dataset.id },
            include: [{
                model: Feature_Property,
                as: 'properties'
            }],
            attributes: [
                'feature_id',
                [sequelize.fn('ST_AsGeoJSON', sequelize.col('geometry')), 'geometry_json']
            ]
        });

        // Build GeoJSON FeatureCollection
        const geojson = {
            type: 'FeatureCollection',
            metadata: {
                id: dataset.id,
                name: dataset.name,
                entity_type: dataset.entity_type,
                feature_count: dataset.feature_count
            },
            features: features.map(f => ({
                type: 'Feature',
                id: f.feature_id,
                geometry: JSON.parse(f.dataValues.geometry_json),
                properties: f.properties ? f.properties.properties : {}
            }))
        };

        const fields = inferFields(geojson);
        const userId = req.userId ?? null;
        const [userRow, meta] = await Promise.all([
            userId
                ? User_Dataset_Filter_Prefs.findOne({ where: { user_id: userId, dataset_id: dataset.id } })
                : Promise.resolve(null),
            Dataset_Metadata.findOne({ where: { dataset_id: dataset.id } }),
        ]);
        const { filterableFields, source } = resolveFilterableFields({
            userPref: userRow ? userRow.filterable_fields : null,
            datasetDefault: meta?.metadata?.defaultFilterableFields ?? null,
        });

        res.status(200).json({ ...geojson, fields, filterableFields, source });
    } catch (error) {
        logger.error('Error generating GeoJSON:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets/{id}:
 *   get:
 *     summary: Get dataset details by ID
 *     tags: [Datasets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset details
 *       404:
 *         description: Dataset not found
 */
export const getDatasetById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const dataset = await Dataset.findOne({
            where: sequelize.or(
                { id: id },
                { slug: id }
            ),
            include: [{
                model: Dataset_Metadata,
                as: 'metadata'
            }]
        });

        if (!dataset) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        res.status(200).json(dataset);
    } catch (error) {
        logger.error('Error fetching dataset:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets/{id}:
 *   delete:
 *     summary: Delete a dataset and all its features
 *     tags: [Datasets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset deleted successfully
 *       404:
 *         description: Dataset not found
 */
export const deleteDataset = async (req, res, next) => {
    try {
        const { id } = req.params;

        const dataset = await Dataset.findOne({
            where: sequelize.or(
                { id: id },
                { slug: id }
            )
        });

        if (!dataset) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        await dataset.destroy(); // Cascade deletes features and properties

        logger.info(`Dataset "${dataset.name}" deleted`);

        res.status(200).json({
            message: 'Dataset deleted successfully',
            id: dataset.id
        });
    } catch (error) {
        logger.error('Error deleting dataset:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets/search:
 *   get:
 *     summary: Search datasets by name or description
 *     tags: [Datasets]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of matching datasets
 */
export const searchDatasets = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const whereClause = {
            [Op.and]: [
                {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${q}%` } },
                        { description: { [Op.iLike]: `%${q}%` } }
                    ]
                },
                { user_id: req.userId },
                { is_public: false }
            ]
        };

        const datasets = await Dataset.findAll({
            where: whereClause,
            attributes: [
                'id',
                'slug',
                'name',
                'description',
                'entity_type',
                'geometry_type',
                'feature_count',
                'user_id',
                'is_public',
                'is_verified',
                'last_updated'
            ],
            order: [['last_updated', 'DESC']],
            limit: 20
        });

        res.status(200).json({
            count: datasets.length,
            query: q,
            datasets
        });
    } catch (error) {
        logger.error('Error searching user datasets:', error);
        next(error);
    }
};

/**
 * @swagger
 * /datasets/search/public:
 *   get:
 *     summary: Search public datasets
 *     tags: [Datasets]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of public matching datasets
 */
export const searchPublicDatasets = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const whereClause = {
            [Op.and]: [
                {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${q}%` } },
                        { description: { [Op.iLike]: `%${q}%` } }
                    ]
                },
                { is_public: true }
            ]
        };

        const datasets = await Dataset.findAll({
            where: whereClause,
            attributes: [
                'id',
                'slug',
                'name',
                'description',
                'entity_type',
                'geometry_type',
                'feature_count',
                'user_id',
                'is_public',
                'is_verified',
                'last_updated'
            ],
            order: [['last_updated', 'DESC']],
            limit: 20
        });

        res.status(200).json({
            count: datasets.length,
            query: q,
            datasets
        });
    } catch (error) {
        logger.error('Error searching public datasets:', error);
        next(error);
    }
};
