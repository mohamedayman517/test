/**
 * Authentication API Routes
 * Handles authentication endpoints only
 */

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// Controllers
const AuthController = require("../../controllers/authController");

// Middleware
const { requireAuth } = require("../../middleware/auth");
const { uploadConfigs } = require("../../middleware/upload");
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateEmailVerification,
} = require("../../middleware/validation");

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: "Too many registration attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    error: "Too many password reset attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (Engineer/Admin)
 * @access  Public
 */
router.post(
  "/register",
  registrationLimiter,
  uploadConfigs.userRegistration,
  validateUserRegistration,
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", authLimiter, validateUserLogin, AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", requireAuth, AuthController.logout);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validatePasswordResetRequest,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with code
 * @access  Public
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  validatePasswordReset,
  AuthController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with code
 * @access  Public
 */
router.post(
  "/verify-email",
  authLimiter,
  validateEmailVerification,
  AuthController.verifyEmail
);

/**
 * @route   POST /api/auth/verify-account
 * @desc    Verify account with code (legacy endpoint)
 * @access  Public
 */
router.post("/verify-account", authLimiter, AuthController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  "/resend-verification",
  authLimiter,
  AuthController.resendVerification
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get("/me", requireAuth, AuthController.getCurrentUser);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put("/change-password", requireAuth, AuthController.changePassword);

/**
 * @route   POST /api/auth/refresh-session
 * @desc    Refresh user session
 * @access  Private
 */
router.post("/refresh-session", requireAuth, AuthController.refreshSession);

/**
 * @route   GET /api/auth/check-email
 * @desc    Check if email exists
 * @access  Public
 */
router.get("/check-email", AuthController.checkEmailExists);

module.exports = router;
