/**
 * Web Routes Index
 * Central hub for all web page routes
 */

const express = require("express");
const router = express.Router();

// Import all web route modules
const publicRoutes = require("./public");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const engineerRoutes = require("./engineer");
const clientRoutes = require("./client");

// Global web middleware
const { requestLogger } = require("../../middleware/requestLogger");
const logger = require("../../utils/Logger");

// Apply request logging to all web routes
router.use(requestLogger);

// Mount web routes
router.use("/", publicRoutes);
router.use("/", authRoutes);
router.use("/", adminRoutes);
router.use("/", engineerRoutes);
router.use("/", clientRoutes);

// Handle 404 for web routes
router.use("*", (req, res) => {
  // Don't handle API routes here
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({
      error: "API endpoint not found",
      path: req.originalUrl,
    });
  }

  // Render 404 page for web routes
  res.status(404).render("errors/404", {
    title: "Page Not Found - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

// Global web error handler
router.use((err, req, res, next) => {
  // Log the error
  logger.error("Web Route Error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Don't handle API errors here
  if (req.originalUrl.startsWith("/api/")) {
    return next(err);
  }

  // Handle different error types for web routes
  let statusCode = err.statusCode || err.status || 500;
  let errorTemplate = "errors/500";
  let errorTitle = "Server Error - Decore & More";

  // Authentication errors - redirect to login
  if (err.name === "AuthenticationError") {
    return res.redirect("/login?error=authentication_required");
  }

  // Authorization errors
  if (err.name === "ForbiddenError") {
    statusCode = 403;
    errorTemplate = "errors/403";
    errorTitle = "Access Denied - Decore & More";
  }

  // Not found errors
  if (err.name === "NotFoundError" || statusCode === 404) {
    statusCode = 404;
    errorTemplate = "errors/404";
    errorTitle = "Page Not Found - Decore & More";
  }

  // Validation errors - redirect back with error
  if (err.name === "ValidationError") {
    const redirectUrl = req.get("Referer") || "/";
    return res.redirect(
      `${redirectUrl}?error=validation_failed&message=${encodeURIComponent(
        err.message
      )}`
    );
  }

  // Render error page
  res.status(statusCode).render(errorTemplate, {
    title: errorTitle,
    error: {
      message: err.message,
      status: statusCode,
      stack: process.env.NODE_ENV === "development" ? err.stack : null,
    },
    user: req.user || null,
    layout: "layouts/main",
  });
});

module.exports = router;
