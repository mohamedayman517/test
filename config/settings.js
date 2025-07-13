/**
 * Application Settings
 * Centralized configuration for the application
 */

const path = require('path');

const settings = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    uri: process.env.MONGO_URI,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 1000, // 24 hours
      httpOnly: process.env.NODE_ENV === 'production',
      path: '/',
      domain: undefined
    },
    rolling: true
  },

  // CORS configuration
  cors: {
    origin: [
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
      'https://decoree-moree-production.up.railway.app',
      process.env.BASE_URL
    ].filter(Boolean),
    credentials: true
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://code.jquery.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11",
            "https://js.stripe.com",
            ...(process.env.NODE_ENV === 'development' ? ["http://localhost:35729"] : [])
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://fonts.googleapis.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11"
          ],
          styleSrcElem: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://fonts.googleapis.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11"
          ],
          connectSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11",
            "https://*.up.railway.app",
            "https://api.stripe.com",
            "https://*.stripe.com",
            process.env.BASE_URL,
            ...(process.env.NODE_ENV === 'development' ? ["http://localhost:35729"] : [])
          ],
          fontSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://fonts.gstatic.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11"
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://cdn.datatables.net",
            "https://cdn.jsdelivr.net/npm/sweetalert2@11",
            "https://js.stripe.com",
            "https://*.stripe.com"
          ],
          scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"]
        }
      }
    }
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // limit each IP to 100 requests per windowMs
  },

  // File upload configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    uploadDir: path.join(__dirname, '../uploads')
  },

  // Email configuration
  email: {
    service: 'gmail',
    user: process.env.EMAIL,
    pass: process.env.PASS
  },

  // Stripe configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    currency: 'egp'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: path.join(__dirname, '../logs')
  },

  // Paths
  paths: {
    views: path.join(__dirname, '../views'),
    public: path.join(__dirname, '../public'),
    uploads: path.join(__dirname, '../uploads'),
    user: path.join(__dirname, '../user')
  }
};

module.exports = settings; 