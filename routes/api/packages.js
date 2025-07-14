/**
 * Packages API Routes
 * Handles package management endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const PackageController = require('../../controllers/packageController');

// Middleware
const { 
  requireAuth, 
  requireAdmin, 
  requireEngineerOrAdmin 
} = require('../../middleware/auth');
const { 
  validatePackageCreation,
  validatePackageUpdate,
  validatePagination 
} = require('../../middleware/validation');

// Rate limiting
const packageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(packageLimiter);

/**
 * @route   POST /api/packages
 * @desc    Create new package
 * @access  Private (Engineer only)
 */
router.post('/',
  requireAuth,
  requireEngineerOrAdmin,
  validatePackageCreation,
  PackageController.createPackage
);

/**
 * @route   GET /api/packages
 * @desc    Get all packages with filters
 * @access  Public
 */
router.get('/',
  validatePagination,
  PackageController.getPackages
);

/**
 * @route   GET /api/packages/:packageId
 * @desc    Get package by ID
 * @access  Public
 */
router.get('/:packageId',
  PackageController.getPackageById
);

/**
 * @route   PUT /api/packages/:packageId
 * @desc    Update package
 * @access  Private (Package owner or Admin)
 */
router.put('/:packageId',
  requireAuth,
  validatePackageUpdate,
  PackageController.updatePackage
);

/**
 * @route   DELETE /api/packages/:packageId
 * @desc    Delete package
 * @access  Private (Package owner or Admin)
 */
router.delete('/:packageId',
  requireAuth,
  PackageController.deletePackage
);

/**
 * @route   GET /api/packages/engineer/:engineerId
 * @desc    Get packages by engineer
 * @access  Public
 */
router.get('/engineer/:engineerId',
  validatePagination,
  PackageController.getEngineerPackages
);

/**
 * @route   GET /api/packages/event-type/:eventType
 * @desc    Get packages by event type with engineers
 * @access  Public
 */
router.get('/event-type/:eventType',
  PackageController.getPackagesByEventType
);

/**
 * @route   GET /api/packages/stats/overview
 * @desc    Get package statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview',
  requireAuth,
  requireAdmin,
  PackageController.getPackageStats
);

/**
 * @route   POST /api/packages/search
 * @desc    Search packages
 * @access  Public
 */
router.post('/search',
  validatePagination,
  PackageController.searchPackages
);

module.exports = router;
