import express from 'express';
import { getProjects, createProject, deleteProject } from '../controllers/project.controller.js';
import { getProjectDatasets, deleteDataset, getDatasetData } from '../controllers/files.controller.js';
import { extractUserId } from '../middlewares/firebaseAuth.js';

const router = express.Router();

router.get('/', extractUserId, getProjects);
router.post('/', extractUserId, createProject);
router.get('/:id/datasets', extractUserId, getProjectDatasets);
router.get('/:id/datasets/:datasetId/data', extractUserId, getDatasetData);
router.delete('/:id', extractUserId, deleteProject);
router.delete('/:id/datasets/:datasetId', extractUserId, deleteDataset);

export default router;
