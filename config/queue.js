const Queue = require('bull');
const { Logger } = require('../utils/Logger');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.logger = new Logger('QueueManager');
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  createQueue(name, options = {}) {
    try {
      if (this.queues.has(name)) {
        return this.queues.get(name);
      }

      const queue = new Queue(name, this.redisUrl, {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        },
        ...options
      });

      // Queue event handlers
      queue.on('error', (error) => {
        this.logger.error(`Queue ${name} error:`, error);
      });

      queue.on('waiting', (jobId) => {
        this.logger.info(`Job ${jobId} waiting in queue ${name}`);
      });

      queue.on('active', (job) => {
        this.logger.info(`Job ${job.id} started processing in queue ${name}`);
      });

      queue.on('completed', (job, result) => {
        this.logger.info(`Job ${job.id} completed in queue ${name}`, result);
      });

      queue.on('failed', (job, err) => {
        this.logger.error(`Job ${job.id} failed in queue ${name}:`, err);
      });

      queue.on('stalled', (jobId) => {
        this.logger.warn(`Job ${jobId} stalled in queue ${name}`);
      });

      this.queues.set(name, queue);
      this.logger.info(`Queue ${name} created successfully`);
      return queue;
    } catch (error) {
      this.logger.error(`Failed to create queue ${name}:`, error);
      throw error;
    }
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  async addJob(queueName, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(data, options);
      this.logger.info(`Job ${job.id} added to queue ${queueName}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async processQueue(queueName, processor, concurrency = 1) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      queue.process(concurrency, processor);
      this.logger.info(`Processor registered for queue ${queueName} with concurrency ${concurrency}`);
    } catch (error) {
      this.logger.error(`Failed to process queue ${queueName}:`, error);
      throw error;
    }
  }

  async getJobCounts(queueName) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      return await queue.getJobCounts();
    } catch (error) {
      this.logger.error(`Failed to get job counts for queue ${queueName}:`, error);
      throw error;
    }
  }

  async cleanQueue(queueName, grace = 1000 * 60 * 60 * 24) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      this.logger.info(`Queue ${queueName} cleaned successfully`);
    } catch (error) {
      this.logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  async closeAll() {
    try {
      const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
      await Promise.all(closePromises);
      this.queues.clear();
      this.logger.info('All queues closed successfully');
    } catch (error) {
      this.logger.error('Failed to close queues:', error);
      throw error;
    }
  }

  // Predefined queue processors
  async setupEmailQueue() {
    const emailQueue = this.createQueue('email', {
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    await this.processQueue('email', async (job) => {
      const { to, subject, html, text } = job.data;
      
      try {
        // Email sending logic here
        this.logger.info(`Sending email to ${to}: ${subject}`);
        
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { success: true, messageId: `email_${Date.now()}` };
      } catch (error) {
        this.logger.error(`Email job failed:`, error);
        throw error;
      }
    }, 2);

    return emailQueue;
  }

  async setupNotificationQueue() {
    const notificationQueue = this.createQueue('notification', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000
        }
      }
    });

    await this.processQueue('notification', async (job) => {
      const { userId, type, data } = job.data;
      
      try {
        this.logger.info(`Sending notification to user ${userId}: ${type}`);
        
        // Notification logic here
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return { success: true, notificationId: `notif_${Date.now()}` };
      } catch (error) {
        this.logger.error(`Notification job failed:`, error);
        throw error;
      }
    }, 3);

    return notificationQueue;
  }

  async setupDataProcessingQueue() {
    const dataQueue = this.createQueue('data-processing', {
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 10000
        }
      }
    });

    await this.processQueue('data-processing', async (job) => {
      const { data, operation } = job.data;
      
      try {
        this.logger.info(`Processing data operation: ${operation}`);
        
        // Data processing logic here
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { success: true, processedAt: new Date() };
      } catch (error) {
        this.logger.error(`Data processing job failed:`, error);
        throw error;
      }
    }, 1);

    return dataQueue;
  }
}

// Singleton instance
const queueManager = new QueueManager();

module.exports = { QueueManager, queueManager }; 