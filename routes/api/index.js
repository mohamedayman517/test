/**
 * API Routes Index
 * Central hub for all API routes
 */

const express = require("express");
const router = express.Router();

// Import all API route modules
const authRoutes = require("./auth");
const userRoutes = require("./users");
const projectRoutes = require("./projects");
const packageRoutes = require("./packages");
const messageRoutes = require("./messages");
const bookingRoutes = require("./bookings");
const paymentRoutes = require("./payments");
const adminRoutes = require("./admin");

// Global API middleware
const requestLogger = require("../../middleware/requestLogger");
const {
  handleUploadError,
  cleanupOnError,
} = require("../../middleware/upload");
const logger = require("../../utils/Logger");

// Apply request logging to all API routes
router.use(requestLogger);

// API Health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// API Info
router.get("/info", (req, res) => {
  res.json({
    name: "Decore & More API",
    version: "1.0.0",
    description: "Interior Design Platform API",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      projects: "/api/projects",
      packages: "/api/packages",
      messages: "/api/messages",
      bookings: "/api/bookings",
      payments: "/api/payments",
      admin: "/api/admin",
    },
    documentation: "/api/docs",
  });
});

// Mount API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/packages", packageRoutes);
router.use("/messages", messageRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin", adminRoutes);

// Handle 404 for API routes
router.use("*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware for API routes
router.use(handleUploadError);
router.use(cleanupOnError);

// Global API error handler
router.use((err, req, res, next) => {
  // Log the error
  logger.error("API Error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle different error types
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let errorType = err.name || "Error";

  // Validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  // Authentication errors
  if (err.name === "AuthenticationError") {
    statusCode = 401;
    message = "Authentication required";
  }

  // Authorization errors
  if (err.name === "ForbiddenError") {
    statusCode = 403;
    message = "Access denied";
  }

  // Not found errors
  if (err.name === "NotFoundError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Conflict errors
  if (err.name === "ConflictError") {
    statusCode = 409;
    message = "Resource conflict";
  }

  // MongoDB errors
  if (err.name === "MongoError" || err.name === "MongoServerError") {
    statusCode = 500;
    message = "Database error";
  }

  // Mongoose validation errors
  if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    message = "Validation failed";
    const validationErrors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(statusCode).json({
      error: message,
      type: errorType,
      errors: validationErrors,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // Custom error response format
  const errorResponse = {
    error: message,
    type: errorType,
    timestamp: new Date().toISOString(),
  };

  // Add additional error details in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Add validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    errorResponse.errors = err.errors;
  }

  res.status(statusCode).json(errorResponse);
});

module.exports = router;
