import express, { json } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerConfigs from './configs/swaggerConfig.js';
import apiRoutes from './routes/index.js';
import { postgresDB } from './configs/postgresDB.js';
import { authenticate } from './middlewares/firebaseAuth.js';
import errorHandling from './middlewares/errorHandling.js';
import { initBucket } from './configs/s3Client.js';
const app = express();

// middlewares
app.use(cors());
app.use(json());

const port = process.env.API_SERVER_PORT || 4000;


// only requests to /api/* will be sent to our router
const router = express.Router();
apiRoutes(router);
app.use('/api', authenticate, router);

// API docs
const swaggerUiOptions = {
  customSiteTitle: 'Maplytics API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
};
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerConfigs, swaggerUiOptions),
);
app.use(errorHandling);

// connect to the databases
postgresDB()
  .then(async () => {
    try {
      await initBucket();
    } catch (err) {
      console.error('Failed to initialize S3 bucket:', err);
    }

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });
