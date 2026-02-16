import express from 'express';
import { getProjects, createProject, deleteProject, getProjectDatasets, deleteDataset, getDatasetData } from '../controllers/project.controller.js';

const router = express.Router();

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id/datasets', getProjectDatasets);
router.get('/:id/datasets/:datasetId/data', getDatasetData);
router.delete('/:id', deleteProject);
router.delete('/:id/datasets/:datasetId', deleteDataset);

export default router;
