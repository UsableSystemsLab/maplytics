import express from 'express';
import { getProjects, createProject, deleteProject, getProjectDatasets, deleteDataset } from '../controllers/project.controller.js';

const router = express.Router();

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id/datasets', getProjectDatasets);
router.delete('/:id', deleteProject);
router.delete('/:id/datasets/:datasetId', deleteDataset);

export default router;
