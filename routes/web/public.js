/**
 * Public Web Routes
 * Handles public pages that don't require authentication
 */

const express = require("express");
const router = express.Router();

// Middleware
const { optionalAuth } = require("../../middleware/auth");

/**
 * @route   GET /
 * @desc    Render home page
 * @access  Public
 */
router.get("/", optionalAuth, (req, res) => {
  res.render("public/home", {
    title: "Decore & More - Interior Design Platform",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /about
 * @desc    Render about page
 * @access  Public
 */
router.get("/about", optionalAuth, (req, res) => {
  res.render("public/about", {
    title: "About Us - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /services
 * @desc    Render services page
 * @access  Public
 */
router.get("/services", optionalAuth, (req, res) => {
  res.render("public/services", {
    title: "Our Services - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /contact
 * @desc    Render contact page
 * @access  Public
 */
router.get("/contact", optionalAuth, (req, res) => {
  res.render("public/contact", {
    title: "Contact Us - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /engineers
 * @desc    Render engineers listing page
 * @access  Public
 */
router.get("/engineers", optionalAuth, (req, res) => {
  res.render("public/engineers", {
    title: "Engineers - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /engineer/:engineerId
 * @desc    Render engineer profile page
 * @access  Public
 */
router.get("/engineer/:engineerId", optionalAuth, (req, res) => {
  const { engineerId } = req.params;

  res.render("public/engineer-profile", {
    title: "Engineer Profile - Decore & More",
    engineerId,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /projects
 * @desc    Render projects gallery page
 * @access  Public
 */
router.get("/projects", optionalAuth, (req, res) => {
  res.render("public/projects", {
    title: "Projects Gallery - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /project/:projectId
 * @desc    Render project details page
 * @access  Public
 */
router.get("/project/:projectId", optionalAuth, (req, res) => {
  const { projectId } = req.params;

  res.render("public/project-details", {
    title: "Project Details - Decore & More",
    projectId,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /packages
 * @desc    Render packages page
 * @access  Public
 */
router.get("/packages", optionalAuth, (req, res) => {
  const { eventType } = req.query;

  res.render("public/packages", {
    title: "Packages - Decore & More",
    eventType: eventType || null,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /package/:packageId
 * @desc    Render package details page
 * @access  Public
 */
router.get("/package/:packageId", optionalAuth, (req, res) => {
  const { packageId } = req.params;

  res.render("public/package-details", {
    title: "Package Details - Decore & More",
    packageId,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /book/:packageId
 * @desc    Render booking page
 * @access  Public
 */
router.get("/book/:packageId", optionalAuth, (req, res) => {
  const { packageId } = req.params;

  res.render("public/booking", {
    title: "Book Service - Decore & More",
    packageId,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /booking
 * @desc    Render general booking page
 * @access  Public
 */
router.get("/booking", optionalAuth, (req, res) => {
  res.render("public/booking", {
    title: "Book Service - Decore & More",
    packageId: req.query.packageId || null,
    eventType: req.query.eventType || null,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /booking-success
 * @desc    Render booking success page
 * @access  Public
 */
router.get("/booking-success", optionalAuth, (req, res) => {
  const { bookingId } = req.query;

  res.render("public/booking-success", {
    title: "Booking Successful - Decore & More",
    bookingId,
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /privacy
 * @desc    Render privacy policy page
 * @access  Public
 */
router.get("/privacy", optionalAuth, (req, res) => {
  res.render("public/privacy", {
    title: "Privacy Policy - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

/**
 * @route   GET /terms
 * @desc    Render terms of service page
 * @access  Public
 */
router.get("/terms", optionalAuth, (req, res) => {
  res.render("public/terms", {
    title: "Terms of Service - Decore & More",
    user: req.user || null,
    layout: "layouts/main",
  });
});

module.exports = router;
