/**
 * Health Check Controller
 * Provides system health monitoring endpoints
 */

const databaseConfig = require('../config/database');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');

class HealthController {

  /**
   * Basic health check
   */
  static healthCheck = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      };

      const duration = Date.now() - startTime;
      logger.debug('Health check completed', {
        duration: `${duration}ms`,
        status: health.status
      });

      return ResponseHandler.success(res, health, 'System is healthy');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Health check failed', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  });

  /**
   * Detailed health check with database
   */
  static detailedHealthCheck = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        services: {}
      };

      // Check database
      try {
        const dbHealth = await databaseConfig.healthCheck();
        health.services.database = dbHealth;
        
        if (dbHealth.status !== 'healthy') {
          health.status = 'degraded';
        }
      } catch (dbError) {
        health.services.database = {
          status: 'unhealthy',
          error: dbError.message
        };
        health.status = 'unhealthy';
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      health.services.memory = {
        status: 'healthy',
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
      };

      // Check if memory usage is too high
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        health.services.memory.status = 'warning';
        if (health.status === 'healthy') {
          health.status = 'degraded';
        }
      }

      const duration = Date.now() - startTime;
      health.responseTime = `${duration}ms`;

      logger.info('Detailed health check completed', {
        duration: `${duration}ms`,
        status: health.status,
        dbStatus: health.services.database?.status
      });

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      return res.status(statusCode).json({
        success: true,
        data: health,
        message: `System is ${health.status}`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Detailed health check failed', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  });

  /**
   * System metrics
   */
  static systemMetrics = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        process: {
          pid: process.pid,
          title: process.title,
          argv: process.argv,
          env: Object.keys(process.env).length
        }
      };

      const duration = Date.now() - startTime;
      logger.debug('System metrics retrieved', {
        duration: `${duration}ms`
      });

      return ResponseHandler.success(res, metrics, 'System metrics retrieved');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get system metrics', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  });

  /**
   * Database status
   */
  static databaseStatus = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const dbStatus = await databaseConfig.healthCheck();
      
      const duration = Date.now() - startTime;
      logger.debug('Database status checked', {
        status: dbStatus.status,
        duration: `${duration}ms`
      });

      return ResponseHandler.success(res, dbStatus, 'Database status retrieved');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to check database status', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  });
}

module.exports = HealthController; 