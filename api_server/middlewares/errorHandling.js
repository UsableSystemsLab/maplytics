import logger from '../configs/logger.js';


const errorHandlingMiddleware = (err, req, res, next) => {
  logger.error(err.message, { metadata: err.stack });

    if (err.name === 'MulterError' || err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'Upload Error',
      message: err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
};

export default errorHandlingMiddleware;
