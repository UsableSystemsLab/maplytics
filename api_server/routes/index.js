import UserRoutes from './UserRoutes.js';
import DatasetRoutes from './DatasetRoutes.js';
import uploadRoutes from './upload.routes.js';
import projectRoutes from './project.routes.js';
import GeoRoutes from './geo.routes.js';

const apiRoutes = (router) => {
  /**
   * @swagger
   * /health:
   *   get:
   *     security:
   *       - bearerAuth: []
   *     summary: Health check endpoint
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Returns the health status of the API
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: Healthy
   *
   * /projects:
   *   get:
   *     summary: Get all projects
   *     tags: [Projects]
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *   delete:
   *     summary: Delete a project
   *     tags: [Projects]
   */
  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'Healthy' });
  });

  router.use('/users', UserRoutes);
  router.use('/datasets', DatasetRoutes);
  router.use('/upload', uploadRoutes);
  router.use('/projects', projectRoutes);
  router.use('/geo', GeoRoutes);

  // Middleware to catch 404 errors
  router.use((req, res) => {
    console.log(`404 Not Found: ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
  });
};

export default apiRoutes;