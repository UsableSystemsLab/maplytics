import express from 'express';
import { getProjects, createProject, deleteProject, getProjectDatasets } from '../controllers/project.controller.js';

const router = express.Router();

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id/datasets', getProjectDatasets);
router.delete('/:id', deleteProject);

export default router;
