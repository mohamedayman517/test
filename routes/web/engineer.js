/**
 * Engineer Web Routes
 * Handles engineer dashboard and management pages
 */

const express = require("express");
const router = express.Router();

// Middleware
const {
  requireAuth,
  requireEngineerOrAdmin,
} = require("../../middleware/auth");

// Apply authentication and engineer role check to all routes
router.use(requireAuth);
router.use(requireEngineerOrAdmin);

/**
 * @route   GET /engineer/dashboard
 * @desc    Render engineer dashboard
 * @access  Private (Engineer only)
 */
router.get("/dashboard", (req, res) => {
  res.render("engineer/dashboard", {
    title: "Dashboard - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/profile
 * @desc    Render engineer profile management
 * @access  Private (Engineer only)
 */
router.get("/profile", (req, res) => {
  res.render("engineer/profile", {
    title: "Profile Management - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/projects
 * @desc    Render engineer projects management
 * @access  Private (Engineer only)
 */
router.get("/projects", (req, res) => {
  res.render("engineer/projects", {
    title: "Manage Projects - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/projects/create
 * @desc    Render create project page
 * @access  Private (Engineer only)
 */
router.get("/projects/create", (req, res) => {
  res.render("engineer/create-project", {
    title: "Add New Project - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/projects/edit/:projectId
 * @desc    Render edit project page
 * @access  Private (Engineer only)
 */
router.get("/projects/edit/:projectId", (req, res) => {
  const { projectId } = req.params;

  res.render("engineer/edit-project", {
    title: "Edit Project - Decore & More",
    projectId,
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/packages
 * @desc    Render engineer packages management
 * @access  Private (Engineer only)
 */
router.get("/packages", (req, res) => {
  res.render("engineer/packages", {
    title: "Manage Packages - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/packages/create
 * @desc    Render create package page
 * @access  Private (Engineer only)
 */
router.get("/packages/create", (req, res) => {
  res.render("engineer/create-package", {
    title: "Add New Package - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/packages/edit/:packageId
 * @desc    Render edit package page
 * @access  Private (Engineer only)
 */
router.get("/packages/edit/:packageId", (req, res) => {
  const { packageId } = req.params;

  res.render("engineer/edit-package", {
    title: "Edit Package - Decore & More",
    packageId,
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/bookings
 * @desc    Render engineer bookings management
 * @access  Private (Engineer only)
 */
router.get("/bookings", (req, res) => {
  res.render("engineer/bookings", {
    title: "Manage Bookings - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/messages
 * @desc    Render engineer messages
 * @access  Private (Engineer only)
 */
router.get("/messages", (req, res) => {
  res.render("engineer/messages", {
    title: "Messages - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/earnings
 * @desc    Render engineer earnings page
 * @access  Private (Engineer only)
 */
router.get("/earnings", (req, res) => {
  res.render("engineer/earnings", {
    title: "Earnings - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/analytics
 * @desc    Render engineer analytics page
 * @access  Private (Engineer only)
 */
router.get("/analytics", (req, res) => {
  res.render("engineer/analytics", {
    title: "Analytics - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/settings
 * @desc    Render engineer settings page
 * @access  Private (Engineer only)
 */
router.get("/settings", (req, res) => {
  res.render("engineer/settings", {
    title: "Settings - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

/**
 * @route   GET /engineer/reviews
 * @desc    Render engineer reviews page
 * @access  Private (Engineer only)
 */
router.get("/reviews", (req, res) => {
  res.render("engineer/reviews", {
    title: "Reviews - Decore & More",
    user: req.user,
    layout: "layouts/engineer",
  });
});

module.exports = router;
