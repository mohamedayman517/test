/**
 * Admin API Routes
 * Handles administrative endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const AdminController = require('../../controllers/adminController');

// Middleware
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { validatePagination } = require('../../middleware/validation');

// Rate limiting
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and rate limiting to all admin routes
router.use(requireAuth);
router.use(requireAdmin);
router.use(adminLimiter);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard',
  AdminController.getDashboard
);

/**
 * @route   GET /api/admin/engineers
 * @desc    Get all engineers for admin management
 * @access  Private (Admin only)
 */
router.get('/engineers',
  validatePagination,
  AdminController.getEngineers
);

/**
 * @route   PUT /api/admin/engineers/:engineerId/approve
 * @desc    Approve engineer
 * @access  Private (Admin only)
 */
router.put('/engineers/:engineerId/approve',
  AdminController.approveEngineer
);

/**
 * @route   PUT /api/admin/engineers/:engineerId/reject
 * @desc    Reject engineer
 * @access  Private (Admin only)
 */
router.put('/engineers/:engineerId/reject',
  AdminController.rejectEngineer
);

/**
 * @route   DELETE /api/admin/engineers/:engineerId
 * @desc    Delete engineer
 * @access  Private (Admin only)
 */
router.delete('/engineers/:engineerId',
  AdminController.deleteEngineer
);

/**
 * @route   GET /api/admin/clients
 * @desc    Get all clients
 * @access  Private (Admin only)
 */
router.get('/clients',
  validatePagination,
  AdminController.getClients
);

/**
 * @route   GET /api/admin/stats/system
 * @desc    Get system statistics
 * @access  Private (Admin only)
 */
router.get('/stats/system',
  AdminController.getSystemStats
);

/**
 * @route   GET /api/admin/stats/revenue
 * @desc    Get revenue statistics
 * @access  Private (Admin only)
 */
router.get('/stats/revenue',
  AdminController.getRevenueStats
);

/**
 * @route   GET /api/admin/clients/count
 * @desc    Get client count
 * @access  Private (Admin only)
 */
router.get('/clients/count',
  AdminController.getClientCount
);

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put('/users/:userId/role',
  AdminController.updateUserRole
);

module.exports = router;
