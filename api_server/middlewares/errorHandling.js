import logger from '../configs/logger.js';

// Error handling middleware. Logs the error and sends a 500 response.
const errorHandlingMiddleware = (err, res) => {
  logger.error(err.message, { metadata: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
};

export default errorHandlingMiddleware;
