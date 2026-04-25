import express from 'express';
import { 
    ingestDataset, 
    getAllDatasets, 
    getDatasetAsGeoJSON, 
    getDatasetById, 
    searchDatasets,
    getAllPublicDatasets,
    searchPublicDatasets
} from '../controllers/DatasetController.js';
import { uploadPublicFile, uploadPrivateFile } from '../controllers/upload.controller.js';
import { uploadPublic, uploadPrivate } from '../middlewares/upload.middleware.js';
import { authenticate, optionalAuthenticate } from '../middlewares/firebaseAuth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Datasets
 *   description: Generic geospatial dataset management
 */

// --- Public Endpoints (No Authentication) ---

// GET /datasets/public - List all public datasets
router.get('/public', getAllPublicDatasets);

// GET /datasets/search/public - Search public datasets
router.get('/search/public', searchPublicDatasets);

// GET /datasets/:id/geojson - Get dataset as GeoJSON (Public datasets should be accessible)
router.get('/:id/geojson', optionalAuthenticate, getDatasetAsGeoJSON);

// GET /datasets/:id - Get dataset details
router.get('/:id', getDatasetById);


// --- Protected Endpoints (Require Authentication) ---

// POST /datasets/upload/public - Upload a dataset file (requires authentication)
router.post('/upload/public', authenticate, uploadPublic.single('file'), uploadPublicFile);

// POST /datasets/upload/private - Upload a dataset file as private
router.post('/upload/private', authenticate, uploadPrivate.single('file'), uploadPrivateFile);

// POST /datasets/ingest - Ingest a new dataset
router.post('/ingest', authenticate, ingestDataset);

// GET /datasets/search - Search user's private datasets
router.get('/search', authenticate, searchDatasets);

// GET /datasets - List user's private datasets
router.get('/', authenticate, getAllDatasets);

// DELETE /datasets/:id - Delete a dataset
// router.delete('/:id', authenticate, deleteDataset);

export default router;
