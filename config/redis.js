const redis = require('redis');
const { Logger } = require('../utils/Logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.logger = new Logger('RedisManager');
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            this.logger.error('Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            this.logger.error('Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            this.logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.info('Redis client ready');
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        this.logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected, skipping get operation');
        return null;
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected, skipping set operation');
        return false;
      }
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      this.logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected, skipping del operation');
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis exists error:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis not connected, skipping flush operation');
        return false;
      }
      await this.client.flushAll();
      return true;
    } catch (error) {
      this.logger.error('Redis flush error:', error);
      return false;
    }
  }

  // Cache helper methods
  async cacheUser(userId, userData, ttl = 1800) {
    const key = `user:${userId}`;
    return await this.set(key, userData, ttl);
  }

  async getCachedUser(userId) {
    const key = `user:${userId}`;
    return await this.get(key);
  }

  async cacheSession(sessionId, sessionData, ttl = 3600) {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getCachedSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async invalidateUserCache(userId) {
    const key = `user:${userId}`;
    return await this.del(key);
  }

  async invalidateSessionCache(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }
}

// Singleton instance
const redisManager = new RedisManager();

module.exports = { RedisManager, redisManager }; 