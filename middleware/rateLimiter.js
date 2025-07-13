/**
 * Rate Limiting Middleware
 */

const logger = require('../utils/Logger');

// Simple in-memory store for rate limiting
const rateLimitStore = new Map();

const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Get current rate limit data
    const rateLimitData = rateLimitStore.get(key) || {
      requests: 0,
      resetTime: now + windowMs
    };

    // Reset if window has passed
    if (now > rateLimitData.resetTime) {
      rateLimitData.requests = 0;
      rateLimitData.resetTime = now + windowMs;
    }

    // Check if limit exceeded
    if (rateLimitData.requests >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: key,
        requests: rateLimitData.requests,
        maxRequests,
        resetTime: new Date(rateLimitData.resetTime)
      });

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
      });
    }

    // Increment request count
    rateLimitData.requests++;
    rateLimitStore.set(key, rateLimitData);

    // Add headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - rateLimitData.requests,
      'X-RateLimit-Reset': rateLimitData.resetTime
    });

    next();
  };
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

module.exports = rateLimiter; 