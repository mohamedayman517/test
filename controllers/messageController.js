/**
 * Message Controller
 * Handles messaging and chat operations
 */

const Message = require('../models/messageSchema');
const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const MessageService = require('../services/messageService');

class MessageController {
  
  /**
   * Send message
   */
  static sendMessage = asyncHandler(async (req, res) => {
    const { engineerId, content } = req.body;
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      if (!engineerId || !content) {
        throw new ValidationError('Engineer ID and message content are required');
      }
      
      // Verify engineer exists
      const engineer = await User.findById(engineerId);
      if (!engineer || engineer.role !== 'Engineer') {
        throw new NotFoundError('Engineer');
      }
      
      // Determine sender type and name
      let senderType, senderName;
      if (sessionUser.role === 'Engineer') {
        senderType = 'engineer';
        senderName = `${sessionUser.firstName} ${sessionUser.lastName}`;
      } else {
        senderType = 'user';
        senderName = sessionUser.name || 'Guest';
      }
      
      const messageData = {
        userId: sessionUser.id,
        engineerId,
        content: content.trim(),
        senderType,
        senderName
      };
      
      const newMessage = await MessageService.createMessage(messageData);
      
      return ResponseHandler.created(res, newMessage, 'Message sent successfully');
    } catch (error) {
      logger.error('Failed to send message', {
        userId: sessionUser?.id,
        engineerId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get conversation between user and engineer
   */
  static getConversation = asyncHandler(async (req, res) => {
    const { userId, engineerId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      // Check if user can access this conversation
      if (sessionUser.role !== 'Admin' && 
          sessionUser.id !== userId && 
          sessionUser.id !== engineerId) {
        throw new AuthenticationError('Access denied');
      }
      
      const messages = await MessageService.getConversation(userId, engineerId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      // Mark messages as read if user is viewing their own conversation
      if (sessionUser.id === userId || sessionUser.id === engineerId) {
        await MessageService.markMessagesAsRead(userId, engineerId, sessionUser.id);
      }
      
      return ResponseHandler.paginated(
        res,
        messages.data,
        parseInt(page),
        parseInt(limit),
        messages.total,
        'Conversation retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get conversation', {
        userId,
        engineerId,
        sessionUserId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get user's conversations list
   */
  static getUserConversations = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      const conversations = await MessageService.getUserConversations(sessionUser.id, sessionUser.role);
      
      return ResponseHandler.success(res, conversations, 'Conversations retrieved successfully');
    } catch (error) {
      logger.error('Failed to get user conversations', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Mark messages as read
   */
  static markAsRead = asyncHandler(async (req, res) => {
    const { userId, engineerId } = req.body;
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      // Check if user can mark these messages as read
      if (sessionUser.id !== userId && sessionUser.id !== engineerId) {
        throw new AuthenticationError('Access denied');
      }
      
      await MessageService.markMessagesAsRead(userId, engineerId, sessionUser.id);
      
      return ResponseHandler.success(res, null, 'Messages marked as read');
    } catch (error) {
      logger.error('Failed to mark messages as read', {
        userId,
        engineerId,
        sessionUserId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get unread messages count
   */
  static getUnreadCount = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      const count = await MessageService.getUnreadMessagesCount(sessionUser.id, sessionUser.role);
      
      return ResponseHandler.success(res, { count }, 'Unread messages count retrieved');
    } catch (error) {
      logger.error('Failed to get unread messages count', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Delete message
   */
  static deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      const message = await MessageService.getMessageById(messageId);
      
      if (!message) {
        throw new NotFoundError('Message');
      }
      
      // Check if user can delete this message
      if (sessionUser.role !== 'Admin' && 
          sessionUser.id !== message.userId && 
          sessionUser.id !== message.engineerId) {
        throw new AuthenticationError('Access denied');
      }
      
      await MessageService.deleteMessage(messageId);
      
      return ResponseHandler.success(res, null, 'Message deleted successfully');
    } catch (error) {
      logger.error('Failed to delete message', {
        messageId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Search messages
   */
  static searchMessages = asyncHandler(async (req, res) => {
    const { query, userId, engineerId } = req.query;
    const { page = 1, limit = 20 } = req.query;
    const sessionUser = req.session.user;
    
    try {
      if (!sessionUser) {
        throw new AuthenticationError('User not authenticated');
      }
      
      if (!query) {
        throw new ValidationError('Search query is required');
      }
      
      // Check access permissions
      if (sessionUser.role !== 'Admin') {
        if (userId && sessionUser.id !== userId) {
          throw new AuthenticationError('Access denied');
        }
        if (engineerId && sessionUser.id !== engineerId) {
          throw new AuthenticationError('Access denied');
        }
      }
      
      const searchFilters = { query };
      if (userId) searchFilters.userId = userId;
      if (engineerId) searchFilters.engineerId = engineerId;
      
      const messages = await MessageService.searchMessages(searchFilters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ResponseHandler.paginated(
        res,
        messages.data,
        parseInt(page),
        parseInt(limit),
        messages.total,
        'Messages search completed'
      );
    } catch (error) {
      logger.error('Failed to search messages', {
        query,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get message statistics
   */
  static getMessageStats = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can view stats
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      const stats = await MessageService.getMessageStatistics();
      
      return ResponseHandler.success(res, stats, 'Message statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get message statistics', {
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = MessageController;
