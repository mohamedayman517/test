/**
 * Main Routes Index
 * Central routing hub for the entire application
 */

const express = require('express');
const router = express.Router();

// Import route modules
const apiRoutes = require('./api');
const webRoutes = require('./web');

// Health check endpoint (before any middleware)
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // You can add actual health checks here
      redis: 'connected',
      email: 'available'
    }
  });
});

// Mount API routes
router.use('/api', apiRoutes);

// Mount web routes
router.use('/', webRoutes);

module.exports = router;
