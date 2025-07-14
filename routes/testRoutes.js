/**
 * Test Routes - لاختبار النظام الجديد
 * هذه المسارات للتجربة فقط ولا تؤثر على النظام الأصلي
 */

const express = require('express');
const router = express.Router();
const ResponseHandler = require('../utils/ResponseHandler');
const { globalErrorHandler } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');
const { redisManager } = require('../config/redis');
const { queueManager } = require('../config/queue');
const { monitoringSystem } = require('../utils/monitoring');
const { healthController } = require('../controllers/healthController');
const { userService } = require('../services/userService');
const { authController } = require('../controllers/authController');

// Test health check
router.get('/health', async (req, res) => {
  try {
    const health = await healthController.getHealth();
    ResponseHandler.success(res, 'Health check completed', health);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test Redis caching
router.get('/cache/test', async (req, res) => {
  try {
    const testKey = 'test:cache:key';
    const testData = { message: 'Hello from cache!', timestamp: new Date() };
    
    // Test set operation
    const setResult = await redisManager.set(testKey, testData, 300); // 5 minutes TTL
    
    // Test get operation
    const getResult = await redisManager.get(testKey);
    
    // Test exists operation
    const existsResult = await redisManager.exists(testKey);
    
    // Test delete operation
    const deleteResult = await redisManager.del(testKey);
    
    const result = {
      set: setResult,
      get: getResult,
      exists: existsResult,
      delete: deleteResult,
      isConnected: redisManager.isConnected
    };
    
    ResponseHandler.success(res, 'Cache test completed', result);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test queue system
router.get('/queue/test', async (req, res) => {
  try {
    // Setup queues
    await queueManager.setupEmailQueue();
    await queueManager.setupNotificationQueue();
    await queueManager.setupDataProcessingQueue();
    
    // Add test jobs
    const emailJob = await queueManager.addJob('email', {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test Email</h1>',
      text: 'Test Email'
    });
    
    const notificationJob = await queueManager.addJob('notification', {
      userId: 'test-user-id',
      type: 'booking_confirmation',
      data: { bookingId: 'test-booking-id' }
    });
    
    const dataJob = await queueManager.addJob('data-processing', {
      data: { test: 'data' },
      operation: 'test_operation'
    });
    
    // Get job counts
    const emailCounts = await queueManager.getJobCounts('email');
    const notificationCounts = await queueManager.getJobCounts('notification');
    const dataCounts = await queueManager.getJobCounts('data-processing');
    
    const result = {
      jobs: {
        email: { jobId: emailJob.id, counts: emailCounts },
        notification: { jobId: notificationJob.id, counts: notificationCounts },
        dataProcessing: { jobId: dataJob.id, counts: dataCounts }
      },
      queues: Array.from(queueManager.queues.keys())
    };
    
    ResponseHandler.success(res, 'Queue test completed', result);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test monitoring system
router.get('/monitoring/test', async (req, res) => {
  try {
    // Start monitoring if not already started
    if (!monitoringSystem.isMonitoring) {
      monitoringSystem.start();
    }
    
    // Simulate some metrics
    monitoringSystem.trackCacheHit();
    monitoringSystem.trackCacheMiss();
    monitoringSystem.trackDatabaseQuery('test query', 500);
    
    // Get metrics
    const metrics = monitoringSystem.getMetrics();
    const health = await monitoringSystem.getHealthStatus();
    const exportedMetrics = monitoringSystem.exportMetrics();
    
    const result = {
      isMonitoring: monitoringSystem.isMonitoring,
      uptime: monitoringSystem.metrics.uptime,
      metrics: exportedMetrics,
      health: health
    };
    
    ResponseHandler.success(res, 'Monitoring test completed', result);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test user service with caching
router.get('/users/cached/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Try to get from cache first
    let user = await redisManager.getCachedUser(userId);
    let source = 'cache';
    
    if (!user) {
      // If not in cache, get from database
      user = await userService.getUserById(userId);
      source = 'database';
      
      if (user) {
        // Cache the user data
        await redisManager.cacheUser(userId, user);
      }
    }
    
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }
    
    ResponseHandler.success(res, `User retrieved from ${source}`, { user, source });
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test authentication validation
router.post('/auth/validate', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return ResponseHandler.badRequest(res, 'Missing required fields');
    }
    
    // Test validation logic
    const validationResult = await authController.validateCredentials(email, password, role);
    
    ResponseHandler.success(res, 'Validation completed', validationResult);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test error handling
router.get('/error/test', async (req, res) => {
  try {
    const errorType = req.query.type || 'generic';
    
    switch (errorType) {
      case 'validation':
        throw new Error('Validation error: Invalid input data');
      case 'database':
        throw new Error('Database error: Connection failed');
      case 'authentication':
        throw new Error('Authentication error: Invalid credentials');
      case 'authorization':
        throw new Error('Authorization error: Insufficient permissions');
      case 'notfound':
        throw new Error('Not found error: Resource not found');
      case 'rateLimit':
        throw new Error('Rate limit error: Too many requests');
      default:
        throw new Error('Generic error: Something went wrong');
    }
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test performance monitoring
router.get('/performance/test', async (req, res) => {
  try {
    // Simulate some processing time
    const startTime = Date.now();
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate cache operations
    await redisManager.set('perf:test', { data: 'test' }, 60);
    await redisManager.get('perf:test');
    
    // Simulate queue job
    await queueManager.addJob('email', {
      to: 'perf@test.com',
      subject: 'Performance Test',
      html: '<p>Test</p>'
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Track the request
    monitoringSystem.trackRequest(req, res, () => {});
    
    const result = {
      processingTime: `${processingTime}ms`,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      metrics: monitoringSystem.exportMetrics()
    };
    
    ResponseHandler.success(res, 'Performance test completed', result);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test rate limiting
router.get('/rate-limit/test', async (req, res) => {
  try {
    // This endpoint will be rate limited by the middleware
    ResponseHandler.success(res, 'Rate limit test endpoint', {
      message: 'If you see this, rate limiting is working',
      timestamp: new Date()
    });
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test logging
router.get('/logging/test', async (req, res) => {
  try {
    logger.info('Test info message');
    logger.warn('Test warning message');
    logger.error('Test error message');
    logger.debug('Test debug message');
    
    ResponseHandler.success(res, 'Logging test completed', {
      message: 'Check the logs for test messages',
      timestamp: new Date()
    });
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test system status
router.get('/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: redisManager.isConnected,
        queues: Array.from(queueManager.queues.keys()),
        monitoring: monitoringSystem.isMonitoring,
        database: true // Assuming database is connected
      },
      metrics: monitoringSystem.exportMetrics(),
      health: await monitoringSystem.getHealthStatus()
    };
    
    ResponseHandler.success(res, 'System status retrieved', status);
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

// Test cleanup
router.post('/cleanup', async (req, res) => {
  try {
    // Clear cache
    await redisManager.flush();
    
    // Clean queues
    await queueManager.cleanQueue('email');
    await queueManager.cleanQueue('notification');
    await queueManager.cleanQueue('data-processing');
    
    // Reset monitoring metrics
    monitoringSystem.resetMetrics();
    
    ResponseHandler.success(res, 'Cleanup completed', {
      message: 'Cache, queues, and metrics have been cleared',
      timestamp: new Date()
    });
  } catch (error) {
    globalErrorHandler(error, req, res);
  }
});

module.exports = router; 