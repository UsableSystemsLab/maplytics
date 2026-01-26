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
app.use(
  '/files',
  express.static(path.join(__dirname, '../dataset/uploads'))
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
  .then(() => {
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });
