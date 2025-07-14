const logger = require('./Logger');
const { redisManager } = require('../config/redis');
const { queueManager } = require('../config/queue');

class MonitoringSystem {
  constructor() {
    this.logger = logger; // Use logger object directly
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        responseTimes: []
      },
      errors: {
        total: 0,
        byType: new Map(),
        recent: []
      },
      performance: {
        memory: [],
        cpu: [],
        responseTime: {
          avg: 0,
          min: Infinity,
          max: 0,
          p95: 0,
          p99: 0
        }
      },
      database: {
        queries: 0,
        slowQueries: 0,
        connections: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      queues: {
        jobs: 0,
        completed: 0,
        failed: 0,
        processing: 0
      }
    };
    
    this.startTime = Date.now();
    this.isMonitoring = false;
  }

  start() {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Monitoring system started');

    // Start periodic metrics collection
    this.startPeriodicCollection();
    
    // Start health checks
    this.startHealthChecks();
  }

  stop() {
    this.isMonitoring = false;
    this.logger.info('Monitoring system stopped');
  }

  // Request tracking
  trackRequest(req, res, next) {
    const startTime = Date.now();
    const originalSend = res.send;

    // Track request start
    this.metrics.requests.total++;
    
    const method = req.method;
    const endpoint = req.path;
    
    // Update method metrics
    this.metrics.requests.byMethod.set(method, 
      (this.metrics.requests.byMethod.get(method) || 0) + 1);
    
    // Update endpoint metrics
    this.metrics.requests.byEndpoint.set(endpoint, 
      (this.metrics.requests.byEndpoint.get(endpoint) || 0) + 1);

    // Override send method to track response
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Track response time
      this.metrics.performance.responseTime.avg = 
        (this.metrics.performance.responseTime.avg * (this.metrics.requests.total - 1) + responseTime) / this.metrics.requests.total;
      
      this.metrics.performance.responseTime.min = Math.min(this.metrics.performance.responseTime.min, responseTime);
      this.metrics.performance.responseTime.max = Math.max(this.metrics.performance.responseTime.max, responseTime);
      
      this.metrics.requests.responseTimes.push(responseTime);
      
      // Keep only last 1000 response times
      if (this.metrics.requests.responseTimes.length > 1000) {
        this.metrics.requests.responseTimes.shift();
      }
      
      // Track success/failure
      if (res.statusCode >= 200 && res.statusCode < 400) {
        this.metrics.requests.successful++;
      } else {
        this.metrics.requests.failed++;
      }
      
      originalSend.call(res, data);
    }.bind(this);

    next();
  }

  // Error tracking
  trackError(error, req = null) {
    this.metrics.errors.total++;
    
    const errorType = error.name || 'Unknown';
    this.metrics.errors.byType.set(errorType, 
      (this.metrics.errors.byType.get(errorType) || 0) + 1);
    
    // Add to recent errors (keep last 100)
    this.metrics.errors.recent.push({
      timestamp: new Date(),
      type: errorType,
      message: error.message,
      stack: error.stack,
      url: req?.url,
      method: req?.method
    });
    
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.shift();
    }
    
    this.logger.error('Error tracked:', error);
  }

  // Database tracking
  trackDatabaseQuery(query, duration) {
    this.metrics.database.queries++;
    
    if (duration > 1000) { // Slow query threshold: 1 second
      this.metrics.database.slowQueries++;
      this.logger.warn(`Slow database query detected: ${duration}ms`, query);
    }
  }

  // Cache tracking
  trackCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  trackCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  // Queue tracking
  async updateQueueMetrics() {
    try {
      const queueNames = ['email', 'notification', 'data-processing'];
      
      for (const queueName of queueNames) {
        const counts = await queueManager.getJobCounts(queueName);
        this.metrics.queues.jobs += counts.waiting + counts.active + counts.delayed;
        this.metrics.queues.completed += counts.completed;
        this.metrics.queues.failed += counts.failed;
        this.metrics.queues.processing += counts.active;
      }
    } catch (error) {
      this.logger.error('Failed to update queue metrics:', error);
    }
  }

  // Performance monitoring
  updatePerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.performance.memory.push({
      timestamp: new Date(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    });
    
    this.metrics.performance.cpu.push({
      timestamp: new Date(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });
    
    // Keep only last 100 measurements
    if (this.metrics.performance.memory.length > 100) {
      this.metrics.performance.memory.shift();
    }
    if (this.metrics.performance.cpu.length > 100) {
      this.metrics.performance.cpu.shift();
    }
    
    // Calculate percentiles
    if (this.metrics.requests.responseTimes.length > 0) {
      const sorted = [...this.metrics.requests.responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      
      this.metrics.performance.responseTime.p95 = sorted[p95Index] || 0;
      this.metrics.performance.responseTime.p99 = sorted[p99Index] || 0;
    }
  }

  // Periodic collection
  startPeriodicCollection() {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.updateQueueMetrics();
    }, 30000); // Every 30 seconds
  }

  // Health checks
  async startHealthChecks() {
    setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Every minute
  }

  async performHealthCheck() {
    const health = {
      timestamp: new Date(),
      status: 'healthy',
      checks: {}
    };

    // Database health check
    try {
      const mongoose = require('mongoose');
      health.checks.database = {
        status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      health.checks.database = { status: 'error', error: error.message };
    }

    // Redis health check
    try {
      const isConnected = redisManager.isConnected;
      health.checks.redis = {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected
      };
    } catch (error) {
      health.checks.redis = { status: 'error', error: error.message };
    }

    // Memory health check
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    health.checks.memory = {
      status: memoryUsagePercent < 80 ? 'healthy' : 'warning',
      usage: memoryUsagePercent,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    };

    // Overall status
    const unhealthyChecks = Object.values(health.checks).filter(check => check.status === 'unhealthy');
    const errorChecks = Object.values(health.checks).filter(check => check.status === 'error');
    
    if (errorChecks.length > 0) {
      health.status = 'critical';
    } else if (unhealthyChecks.length > 0) {
      health.status = 'unhealthy';
    }

    // Log health status
    if (health.status !== 'healthy') {
      this.logger.warn('Health check failed:', health);
    } else {
      this.logger.info('Health check passed');
    }

    return health;
  }

  // Get metrics
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      isMonitoring: this.isMonitoring
    };
  }

  // Get health status
  async getHealthStatus() {
    return await this.performHealthCheck();
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        responseTimes: []
      },
      errors: {
        total: 0,
        byType: new Map(),
        recent: []
      },
      performance: {
        memory: [],
        cpu: [],
        responseTime: {
          avg: 0,
          min: Infinity,
          max: 0,
          p95: 0,
          p99: 0
        }
      },
      database: {
        queries: 0,
        slowQueries: 0,
        connections: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      queues: {
        jobs: 0,
        completed: 0,
        failed: 0,
        processing: 0
      }
    };
    
    this.logger.info('Metrics reset');
  }

  // Export metrics for external monitoring
  exportMetrics() {
    return {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        successRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.successful / this.metrics.requests.total) * 100 : 0
      },
      performance: {
        responseTime: this.metrics.performance.responseTime,
        memoryUsage: this.metrics.performance.memory.length > 0 ? 
          this.metrics.performance.memory[this.metrics.performance.memory.length - 1] : null
      },
      errors: {
        total: this.metrics.errors.total,
        recentCount: this.metrics.errors.recent.length
      },
      cache: {
        hitRate: this.metrics.cache.hitRate
      },
      queues: {
        active: this.metrics.queues.processing,
        completed: this.metrics.queues.completed,
        failed: this.metrics.queues.failed
      }
    };
  }
}

// Singleton instance
const monitoringSystem = new MonitoringSystem();

module.exports = { MonitoringSystem, monitoringSystem }; 