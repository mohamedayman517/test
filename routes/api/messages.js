/**
 * Messages API Routes
 * Handles messaging system endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const MessageController = require('../../controllers/messageController');

// Middleware
const { requireAuth } = require('../../middleware/auth');
const { 
  validateMessageSending,
  validatePagination,
  validateSearch 
} = require('../../middleware/validation');

// Rate limiting
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sendMessageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute
  message: { error: 'Too many messages sent, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(messageLimiter);

/**
 * @route   POST /api/messages
 * @desc    Send message
 * @access  Private
 */
router.post('/',
  requireAuth,
  sendMessageLimiter,
  validateMessageSending,
  MessageController.sendMessage
);

/**
 * @route   GET /api/messages/conversation/:userId/:engineerId
 * @desc    Get conversation between user and engineer
 * @access  Private
 */
router.get('/conversation/:userId/:engineerId',
  requireAuth,
  validatePagination,
  MessageController.getConversation
);

/**
 * @route   GET /api/messages/conversations
 * @desc    Get user's conversations list
 * @access  Private
 */
router.get('/conversations',
  requireAuth,
  MessageController.getUserConversations
);

/**
 * @route   PUT /api/messages/mark-read
 * @desc    Mark messages as read
 * @access  Private
 */
router.put('/mark-read',
  requireAuth,
  MessageController.markAsRead
);

/**
 * @route   GET /api/messages/unread-count
 * @desc    Get unread messages count
 * @access  Private
 */
router.get('/unread-count',
  requireAuth,
  MessageController.getUnreadCount
);

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete message
 * @access  Private
 */
router.delete('/:messageId',
  requireAuth,
  MessageController.deleteMessage
);

/**
 * @route   GET /api/messages/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search',
  requireAuth,
  validateSearch,
  MessageController.searchMessages
);

/**
 * @route   GET /api/messages/stats/overview
 * @desc    Get message statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview',
  requireAuth,
  requireAdmin,
  MessageController.getMessageStats
);

module.exports = router;
