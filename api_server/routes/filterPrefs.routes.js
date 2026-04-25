import express from 'express';
import {
    getFilterPrefs,
    putFilterPrefs,
    deleteFilterPrefs,
    putDefaultFilterFields,
} from '../controllers/filterPrefs.controller.js';
import { authenticate } from '../middlewares/firebaseAuth.js';

const router = express.Router();

router.get('/:datasetId/filter-prefs', authenticate, getFilterPrefs);
router.put('/:datasetId/filter-prefs', authenticate, putFilterPrefs);
router.delete('/:datasetId/filter-prefs', authenticate, deleteFilterPrefs);
router.put('/:datasetId/default-filter-fields', authenticate, putDefaultFilterFields);

export default router;
