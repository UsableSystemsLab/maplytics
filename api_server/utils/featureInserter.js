// Inserts parsed GeoJSON features into db (Feature + Feature_Property tables).
// Called after file upload to make data queryable via PostGIS.


import { sequelize } from '../configs/postgresDB.js';
import { Dataset, Feature, Feature_Property } from '../models/index.js';
import logger from '../configs/logger.js';

/**
 * Create a Dataset row and bulk insert all features into Postgres.
**/
export async function insertFeaturesIntoDB({ datasetName, userId, fileFormat, geojson }) {
    if (!geojson?.features?.length) {
        logger.warn('[featureInserter] No features to insert');
        return null;
    }

    const transaction = await sequelize.transaction();

    try {
        // Create Dataset row
        const slug = datasetName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now();

        const dataset = await Dataset.create({
            dataset_name: datasetName,
            dataset_slug: slug,
            file_format: fileFormat,
            user_id: userId,
            feature_count: geojson.features.length,
            geometry_type: geojson.features[0]?.geometry?.type || 'Point',
        }, { transaction });

        const datasetId = dataset.dataset_id;

        // Prepare bulk data
        const BATCH_SIZE = 500;
        const features = geojson.features;

        for (let i = 0; i < features.length; i += BATCH_SIZE) {
            const batch = features.slice(i, i + BATCH_SIZE);

            // Filter out features without geometry
            const validFeatures = batch.filter(f => f.geometry);

            const featureRows = validFeatures.map(f => ({
                dataset_id: datasetId,
                geometry: {
                    type: f.geometry.type,
                    coordinates: f.geometry.coordinates,
                    crs: { type: 'name', properties: { name: 'EPSG:4326' } }, // crs is a coordinate reference system definition, here we specify WGS 84
                },
            }));

            const createdFeatures = await Feature.bulkCreate(featureRows, { transaction });

            // Use the IDs from the created features to link feature properties as a Fkey
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
