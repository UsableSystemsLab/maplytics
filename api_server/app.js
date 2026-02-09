import express, { json } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerConfigs from './configs/swaggerConfig.js';
import apiRoutes from './routes/index.js';
import { postgresDB } from './configs/postgresDB.js';
import validateApiKey from './middlewares/validateApiKey.js';
import errorHandling from './middlewares/errorHandling.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use(cors());
app.use(json());

const port = process.env.API_SERVER_PORT || 4000;

/* ------------------ SERVE UPLOADED FILES ------------------ */
// Serve public datasets (organized by user ID)
app.use(
  '/files/public',
  express.static('/datasets/public')
);

// Serve private datasets (will be organized by project ID later)
app.use(
  '/files/private',
  express.static('/datasets/private')
);
/* --------------------------------------------------------- */

// only requests to /api/* will be sent to our router
const router = express.Router();
apiRoutes(router);
app.use('/api', validateApiKey, router);

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
      await import('./configs/s3Client.js').then(module => module.initBucket());
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
