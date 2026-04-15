import express from 'express';
import { getProjects, createProject, deleteProject } from '../controllers/project.controller.js';
import { getProjectDatasets, deleteDataset, getDatasetData } from '../controllers/files.controller.js';

const router = express.Router();

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id/datasets', getProjectDatasets);
router.get('/:id/datasets/:datasetId/data', getDatasetData);
router.delete('/:id', deleteProject);
router.delete('/:id/datasets/:datasetId', deleteDataset);

export default router;
