import { sequelize } from '../configs/postgresDB.js';
import { Dataset, Feature, Feature_Property } from '../models/index.js';
import logger from '../configs/logger.js';

/**
 * Create a Dataset row and bulk insert all features into Postgres.
 **/
export async function insertFeaturesIntoDB({ datasetName, description, userId, author, fileFormat, geojson, isPublic = true, isVerified = false }) {
    const transaction = await sequelize.transaction();

    try {
        const slug = datasetName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now();

        const dataset = await Dataset.create({
            name: datasetName,
            description: description || null,
            slug: slug,
            file_format: fileFormat,
            user_id: userId,
            author: author || 'unknown author',
            feature_count: geojson?.features?.length || 0,
            geometry_type: geojson?.features?.[0]?.geometry?.type || 'Point',
            is_public: isPublic,
            is_verified: isVerified,
        }, { transaction });

        const datasetId = dataset.id;

        const features = geojson?.features || [];
        if (features.length === 0) {
            await transaction.commit();
            logger.info(`[featureInserter] Created empty dataset "${datasetName}" (${datasetId})`);
            return datasetId;
        }

        const BATCH_SIZE = 500;

        for (let i = 0; i < features.length; i += BATCH_SIZE) {
            const batch = features.slice(i, i + BATCH_SIZE);
            const validFeatures = batch.filter(f => f.geometry);

            const featureRows = validFeatures.map(f => ({
                dataset_id: datasetId,
                geometry: {
                    type: f.geometry.type,
                    coordinates: f.geometry.coordinates,
                    crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                },
            }));

            const createdFeatures = await Feature.bulkCreate(featureRows, { transaction });

            const propertyRows = createdFeatures.map((created, idx) => ({
                feature_id: created.feature_id,
                properties: validFeatures[idx]?.properties || {},
            }));

            await Feature_Property.bulkCreate(propertyRows, { transaction });
        }

        await transaction.commit();
        logger.info(`[featureInserter] Inserted ${features.length} features for dataset "${datasetName}" (${datasetId})`);
        return datasetId;

    } catch (error) {
        await transaction.rollback();
        logger.error('[featureInserter] Failed to insert features:', error);
        return null;
    }
}
