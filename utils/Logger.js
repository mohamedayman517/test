/**
 * Centralized Logging Service
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content + '\n');
  }

  log(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Console output
    const consoleMessage = `[${level.toUpperCase()}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'info':
        console.info(consoleMessage, data || '');
        break;
      default:
        console.log(consoleMessage, data || '');
    }

    // File output
    const filename = `${level}.log`;
    this.writeToFile(filename, formattedMessage);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }

  // Request logging
  logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.session?.user?.id || 'anonymous'
      };

      if (res.statusCode >= 400) {
        this.error(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
      } else {
        this.info(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
      }
    });

    next();
  }

  // Database logging
  logDatabase(operation, collection, duration, success = true) {
    const message = `DB ${operation} on ${collection}`;
    const data = {
      operation,
      collection,
      duration: `${duration}ms`,
      success
    };

    if (success) {
      this.debug(message, data);
    } else {
      this.error(message, data);
    }
  }

  // Payment logging
  logPayment(operation, amount, currency, success = true, error = null) {
    const message = `Payment ${operation}`;
    const data = {
      operation,
      amount,
      currency,
      success,
      ...(error && { error: error.message })
    };

    if (success) {
      this.info(message, data);
    } else {
      this.error(message, data);
    }
  }

  // File upload logging
  logFileUpload(filename, size, success = true, error = null) {
    const message = `File upload: ${filename}`;
    const data = {
      filename,
      size: `${size} bytes`,
      success,
      ...(error && { error: error.message })
    };

    if (success) {
      this.info(message, data);
    } else {
      this.error(message, data);
    }
  }

  // User activity logging
  logUserActivity(userId, action, details = null) {
    const message = `User activity: ${action}`;
    const data = {
      userId,
      action,
      ...(details && { details })
    };

    this.info(message, data);
  }

  // Security logging
  logSecurity(event, details = null) {
    const message = `Security event: ${event}`;
    const data = {
      event,
      timestamp: this.getTimestamp(),
      ...(details && { details })
    };

    this.warn(message, data);
  }

  // Performance logging
  logPerformance(operation, duration, details = null) {
    const message = `Performance: ${operation}`;
    const data = {
      operation,
      duration: `${duration}ms`,
      ...(details && { details })
    };

    if (duration > 1000) {
      this.warn(message, data);
    } else {
      this.debug(message, data);
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 