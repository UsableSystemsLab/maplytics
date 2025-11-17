import UserRoutes from './UserRoutes.js';

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
   */

  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'Healthy' });
  });
  router.use('/users', UserRoutes);
  // Middleware to catch 404 errors
  router.use((req, res) => {
    console.log(`404 Not Found: ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
  });
};
export default apiRoutes;
