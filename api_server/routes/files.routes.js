import express from 'express';

const router = express.Router();

// Serve public datasets (organized by user ID)
router.use('/public', express.static('/datasets/public'));

// Serve private datasets (organized by project ID)
router.use('/private', express.static('/datasets/private'));

export default router;
