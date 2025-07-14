/**
 * Admin Web Routes
 * Handles admin dashboard and management pages
 */

const express = require("express");
const router = express.Router();

// Controllers
const AdminController = require("../../controllers/adminController");

// Middleware
const { requireAuth, requireAdmin } = require("../../middleware/auth");

// Apply authentication and admin role check to all routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /admin/dashboard
 * @desc    Render admin dashboard
 * @access  Private (Admin only)
 */
router.get("/dashboard", AdminController.renderDashboard);

/**
 * @route   GET /admin/engineers
 * @desc    Render engineers management page
 * @access  Private (Admin only)
 */
router.get("/engineers", (req, res) => {
  res.render("admin/engineers", {
    title: "Manage Engineers - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/engineers/pending
 * @desc    Render pending engineers approval page
 * @access  Private (Admin only)
 */
router.get("/engineers/pending", (req, res) => {
  res.render("admin/pending-engineers", {
    title: "Pending Engineers - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/clients
 * @desc    Render clients management page
 * @access  Private (Admin only)
 */
router.get("/clients", (req, res) => {
  res.render("admin/clients", {
    title: "Manage Clients - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/projects
 * @desc    Render projects management page
 * @access  Private (Admin only)
 */
router.get("/projects", (req, res) => {
  res.render("admin/projects", {
    title: "Manage Projects - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/packages
 * @desc    Render packages management page
 * @access  Private (Admin only)
 */
router.get("/packages", (req, res) => {
  res.render("admin/packages", {
    title: "Manage Packages - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/bookings
 * @desc    Render bookings management page
 * @access  Private (Admin only)
 */
router.get("/bookings", (req, res) => {
  res.render("admin/bookings", {
    title: "Manage Bookings - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/payments
 * @desc    Render payments management page
 * @access  Private (Admin only)
 */
router.get("/payments", (req, res) => {
  res.render("admin/payments", {
    title: "Manage Payments - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/messages
 * @desc    Render messages management page
 * @access  Private (Admin only)
 */
router.get("/messages", (req, res) => {
  res.render("admin/messages", {
    title: "Manage Messages - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/analytics
 * @desc    Render analytics page
 * @access  Private (Admin only)
 */
router.get("/analytics", (req, res) => {
  res.render("admin/analytics", {
    title: "Analytics & Statistics - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/settings
 * @desc    Render admin settings page
 * @access  Private (Admin only)
 */
router.get("/settings", (req, res) => {
  res.render("admin/settings", {
    title: "System Settings - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/reports
 * @desc    Render reports page
 * @access  Private (Admin only)
 */
router.get("/reports", (req, res) => {
  res.render("admin/reports", {
    title: "Reports - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

/**
 * @route   GET /admin/users
 * @desc    Render users management page
 * @access  Private (Admin only)
 */
router.get("/users", (req, res) => {
  res.render("admin/users", {
    title: "Manage Users - Decore & More",
    user: req.user,
    layout: "layouts/admin",
  });
});

module.exports = router;
