/**
 * Client Web Routes
 * Handles client dashboard and user pages
 */

const express = require("express");
const router = express.Router();

// Middleware
const { requireAuth } = require("../../middleware/auth");

// Apply authentication to all routes
router.use(requireAuth);

// Middleware to ensure only clients can access these routes
const requireClient = (req, res, next) => {
  // Allow clients (users without specific roles or with 'User' role)
  if (req.user.role && req.user.role !== "User" && req.user.role !== "user") {
    return res.redirect("/dashboard");
  }
  next();
};

router.use(requireClient);

/**
 * @route   GET /client/dashboard
 * @desc    Render client dashboard
 * @access  Private (Client only)
 */
router.get("/dashboard", (req, res) => {
  res.render("client/dashboard", {
    title: "Dashboard - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/profile
 * @desc    Render client profile page
 * @access  Private (Client only)
 */
router.get("/profile", (req, res) => {
  res.render("client/profile", {
    title: "Profile - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/bookings
 * @desc    Render client bookings page
 * @access  Private (Client only)
 */
router.get("/bookings", (req, res) => {
  res.render("client/bookings", {
    title: "My Bookings - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/bookings/:bookingId
 * @desc    Render booking details page
 * @access  Private (Client only)
 */
router.get("/bookings/:bookingId", (req, res) => {
  const { bookingId } = req.params;

  res.render("client/booking-details", {
    title: "Booking Details - Decore & More",
    bookingId,
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/messages
 * @desc    Render client messages page
 * @access  Private (Client only)
 */
router.get("/messages", (req, res) => {
  res.render("client/messages", {
    title: "Messages - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/messages/:engineerId
 * @desc    Render conversation with specific engineer
 * @access  Private (Client only)
 */
router.get("/messages/:engineerId", (req, res) => {
  const { engineerId } = req.params;

  res.render("client/conversation", {
    title: "Conversation - Decore & More",
    engineerId,
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/favorites
 * @desc    Render client favorites page
 * @access  Private (Client only)
 */
router.get("/favorites", (req, res) => {
  res.render("client/favorites", {
    title: "Favorites - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/reviews
 * @desc    Render client reviews page
 * @access  Private (Client only)
 */
router.get("/reviews", (req, res) => {
  res.render("client/reviews", {
    title: "My Reviews - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/settings
 * @desc    Render client settings page
 * @access  Private (Client only)
 */
router.get("/settings", (req, res) => {
  res.render("client/settings", {
    title: "Settings - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

/**
 * @route   GET /client/notifications
 * @desc    Render client notifications page
 * @access  Private (Client only)
 */
router.get("/notifications", (req, res) => {
  res.render("client/notifications", {
    title: "Notifications - Decore & More",
    user: req.user,
    layout: "layouts/client",
  });
});

module.exports = router;
