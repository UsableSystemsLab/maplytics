import express from 'express';
import {
    ingestDataset,
    getAllDatasets,
    getDatasetAsGeoJSON,
    getDatasetById,
    deleteDataset
} from '../controllers/DatasetController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Datasets
 *   description: Generic geospatial dataset management
 */

// POST /datasets/ingest - Ingest a new dataset
router.post('/ingest', ingestDataset);

// GET /datasets - List all datasets
router.get('/', getAllDatasets);

// GET /datasets/:id/geojson - Get dataset as GeoJSON
router.get('/:id/geojson', getDatasetAsGeoJSON);

// GET /datasets/:id - Get dataset details
router.get('/:id', getDatasetById);

// DELETE /datasets/:id - Delete a dataset
router.delete('/:id', deleteDataset);

export default router;
