/**
 * Users API Routes
 * Handles user management endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const UserController = require('../../controllers/userController');

// Middleware
const { 
  requireAuth, 
  requireAdmin, 
  requireEngineerOrAdmin,
  requireOwnershipOrAdmin 
} = require('../../middleware/auth');
const { uploadConfigs } = require('../../middleware/upload');
const { validatePagination } = require('../../middleware/validation');

// Rate limiting
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all user routes
router.use(userLimiter);

/**
 * @route   GET /api/users/profile/:userId
 * @desc    Get user profile by ID
 * @access  Private (Own profile or Admin)
 */
router.get('/profile/:userId',
  requireAuth,
  requireOwnershipOrAdmin('userId'),
  UserController.getProfile
);

/**
 * @route   PUT /api/users/profile/:userId
 * @desc    Update user profile
 * @access  Private (Own profile or Admin)
 */
router.put('/profile/:userId',
  requireAuth,
  requireOwnershipOrAdmin('userId'),
  uploadConfigs.profileUpdate,
  UserController.updateProfile
);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:userId',
  requireAuth,
  requireAdmin,
  UserController.deleteUser
);

/**
 * @route   GET /api/users/engineers
 * @desc    Get all engineers with filters
 * @access  Public
 */
router.get('/engineers',
  validatePagination,
  UserController.getEngineers
);

/**
 * @route   PUT /api/users/engineers/:engineerId/approve
 * @desc    Approve engineer
 * @access  Private (Admin only)
 */
router.put('/engineers/:engineerId/approve',
  requireAuth,
  requireAdmin,
  UserController.approveEngineer
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get('/stats',
  requireAuth,
  requireAdmin,
  UserController.getUserStats
);

/**
 * @route   PUT /api/users/:userId/change-password
 * @desc    Change user password
 * @access  Private (Own account or Admin)
 */
router.put('/:userId/change-password',
  requireAuth,
  requireOwnershipOrAdmin('userId'),
  UserController.changePassword
);

/**
 * @route   GET /api/users/email/:email
 * @desc    Get user by email
 * @access  Private (Admin only)
 */
router.get('/email/:email',
  requireAuth,
  requireAdmin,
  UserController.getUserByEmail
);

module.exports = router;
