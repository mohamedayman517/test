/**
 * Authentication Web Routes
 * Handles authentication page rendering
 */

const express = require("express");
const router = express.Router();

// Middleware
const { optionalAuth, requireAuth } = require("../../middleware/auth");

/**
 * @route   GET /login
 * @desc    Render login page
 * @access  Public
 */
router.get("/login", optionalAuth, (req, res) => {
  if (req.user) {
    // User already logged in, redirect based on role
    const redirectPath =
      req.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    return res.redirect(redirectPath);
  }
  res.render("auth/login", {
    title: "Login - Decore & More",
    error: req.query.error,
    message: req.query.message,
    layout: "layouts/auth",
  });
});

/**
 * @route   GET /register
 * @desc    Render registration page
 * @access  Public
 */
router.get("/register", optionalAuth, (req, res) => {
  if (req.user) {
    const redirectPath =
      req.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    return res.redirect(redirectPath);
  }
  res.render("auth/register", {
    title: "Register - Decore & More",
    error: req.query.error,
    message: req.query.message,
    layout: "layouts/auth",
  });
});

/**
 * @route   GET /forgot-password
 * @desc    Render forgot password page
 * @access  Public
 */
router.get("/forgot-password", optionalAuth, (req, res) => {
  if (req.user) {
    const redirectPath =
      req.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    return res.redirect(redirectPath);
  }
  res.render("auth/forgot-password", {
    title: "Forgot Password - Decore & More",
    error: req.query.error,
    message: req.query.message,
    layout: "layouts/auth",
  });
});

/**
 * @route   GET /reset-password
 * @desc    Render reset password page
 * @access  Public
 */
router.get("/reset-password", optionalAuth, (req, res) => {
  if (req.user) {
    const redirectPath =
      req.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    return res.redirect(redirectPath);
  }
  res.render("auth/reset-password", {
    title: "Reset Password - Decore & More",
    email: req.query.email,
    error: req.query.error,
    message: req.query.message,
    layout: "layouts/auth",
  });
});

/**
 * @route   GET /verify-email
 * @desc    Render email verification page
 * @access  Public
 */
router.get("/verify-email", optionalAuth, (req, res) => {
  if (req.user && req.user.isVerified) {
    const redirectPath =
      req.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    return res.redirect(redirectPath);
  }
  res.render("auth/verify-email", {
    title: "Email Verification - Decore & More",
    engineerId: req.query.engineerId,
    error: req.query.error,
    message: req.query.message,
    layout: "layouts/auth",
  });
});

/**
 * @route   GET /dashboard
 * @desc    Render user dashboard (redirect based on role)
 * @access  Private
 */
router.get("/dashboard", requireAuth, (req, res) => {
  const user = req.user;

  switch (user.role) {
    case "Admin":
      return res.redirect("/admin/dashboard");
    case "Engineer":
      return res.redirect("/engineer/dashboard");
    default:
      return res.redirect("/client/dashboard");
  }
});

module.exports = router;
