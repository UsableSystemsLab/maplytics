import express from 'express';
import { ingestDataset, getAllDatasets, getDatasetAsGeoJSON, getDatasetById, searchDatasets } from '../controllers/DatasetController.js';
import { uploadPublicFile, uploadProjectFile } from '../controllers/upload.controller.js';
import { uploadPublic, uploadProject } from '../middlewares/upload.middleware.js';
import { authenticate } from '../middlewares/firebaseAuth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Datasets
 *   description: Generic geospatial dataset management
 */

// POST /datasets/upload/public - Upload a dataset file (requires authentication)
router.post('/upload/public', authenticate, uploadPublic.single('file'), uploadPublicFile);

// POST /datasets/upload/project - Upload a dataset file to a specific project
router.post('/upload/project', authenticate, uploadProject.single('file'), uploadProjectFile);

// POST /datasets/ingest - Ingest a new dataset
router.post('/ingest', ingestDataset);

// GET /datasets/search - Search datasets
router.get('/search', searchDatasets);

// GET /datasets - List all datasets
router.get('/', getAllDatasets);

// GET /datasets/:id/geojson - Get dataset as GeoJSON
router.get('/:id/geojson', getDatasetAsGeoJSON);

// GET /datasets/:id - Get dataset details
router.get('/:id', getDatasetById);

// DELETE /datasets/:id - Delete a dataset
// router.delete('/:id', deleteDataset);

export default router;
