/**
 * Bookings API Routes
 * Handles booking management endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const BookingController = require('../../controllers/bookingController');

// Middleware
const { 
  requireAuth, 
  requireAdmin, 
  requireEngineerOrAdmin 
} = require('../../middleware/auth');
const { 
  validateBookingCreation,
  validatePagination 
} = require('../../middleware/validation');

// Rate limiting
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many booking requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(bookingLimiter);

/**
 * @route   POST /api/bookings
 * @desc    Create new booking
 * @access  Public
 */
router.post('/',
  validateBookingCreation,
  BookingController.createBooking
);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (Admin only)
 * @access  Private (Admin only)
 */
router.get('/',
  requireAuth,
  requireAdmin,
  validatePagination,
  BookingController.getAllBookings
);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:bookingId',
  requireAuth,
  BookingController.getBookingById
);

/**
 * @route   PUT /api/bookings/:bookingId/status
 * @desc    Update booking status
 * @access  Private (Engineer or Admin)
 */
router.put('/:bookingId/status',
  requireAuth,
  requireEngineerOrAdmin,
  BookingController.updateBookingStatus
);

/**
 * @route   GET /api/bookings/engineer/:engineerId
 * @desc    Get engineer's bookings
 * @access  Private (Engineer or Admin)
 */
router.get('/engineer/:engineerId',
  requireAuth,
  validatePagination,
  BookingController.getEngineerBookings
);

/**
 * @route   GET /api/bookings/client/:clientId
 * @desc    Get client's bookings
 * @access  Private (Client or Admin)
 */
router.get('/client/:clientId',
  requireAuth,
  validatePagination,
  BookingController.getClientBookings
);

/**
 * @route   DELETE /api/bookings/:bookingId
 * @desc    Cancel booking
 * @access  Private
 */
router.delete('/:bookingId',
  requireAuth,
  BookingController.cancelBooking
);

/**
 * @route   GET /api/bookings/stats/overview
 * @desc    Get booking statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview',
  requireAuth,
  requireAdmin,
  BookingController.getBookingStats
);

/**
 * @route   POST /api/bookings/:bookingId/review
 * @desc    Add review for completed booking
 * @access  Private
 */
router.post('/:bookingId/review',
  requireAuth,
  BookingController.addBookingReview
);

module.exports = router;
