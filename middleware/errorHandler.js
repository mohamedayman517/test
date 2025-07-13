/**
 * Advanced Error Handling Middleware
 */

const { globalErrorHandler } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.session?.user?.id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress
  });

  // Use the global error handler
  globalErrorHandler(err, req, res, next);
};

module.exports = errorHandler; 