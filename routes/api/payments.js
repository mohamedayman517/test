/**
 * Payments API Routes
 * Handles payment processing endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const PaymentController = require('../../controllers/paymentController');

// Middleware
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// Rate limiting
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many payment requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(paymentLimiter);

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create payment intent
 * @access  Public
 */
router.post('/create-intent',
  PaymentController.createPaymentIntent
);

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirm payment
 * @access  Public
 */
router.post('/confirm',
  PaymentController.confirmPayment
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Stripe webhook endpoint
 * @access  Public (Stripe only)
 */
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook
);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get payment details
 * @access  Private
 */
router.get('/:paymentId',
  requireAuth,
  PaymentController.getPaymentDetails
);

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get payment by booking ID
 * @access  Private
 */
router.get('/booking/:bookingId',
  requireAuth,
  PaymentController.getPaymentByBooking
);

/**
 * @route   POST /api/payments/:paymentId/refund
 * @desc    Process refund
 * @access  Private (Admin only)
 */
router.post('/:paymentId/refund',
  requireAuth,
  requireAdmin,
  PaymentController.processRefund
);

/**
 * @route   GET /api/payments/stats/overview
 * @desc    Get payment statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview',
  requireAuth,
  requireAdmin,
  PaymentController.getPaymentStats
);

/**
 * @route   GET /api/payments/engineer/:engineerId/earnings
 * @desc    Get engineer earnings
 * @access  Private (Engineer or Admin)
 */
router.get('/engineer/:engineerId/earnings',
  requireAuth,
  PaymentController.getEngineerEarnings
);

module.exports = router;
