/**
 * Message Service
 * Handles business logic for messaging operations
 */

const Message = require('../models/messageSchema');
const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const { NotFoundError, ValidationError } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');

class MessageService {

  /**
   * Create new message
   */
  static async createMessage(messageData) {
    const startTime = Date.now();
    
    try {
      const newMessage = new Message({
        ...messageData,
        timestamp: new Date(),
        isRead: false
      });
      
      await newMessage.save();

      const duration = Date.now() - startTime;
      logger.info('Message created successfully', {
        messageId: newMessage._id,
        userId: messageData.userId,
        engineerId: messageData.engineerId,
        senderType: messageData.senderType,
        duration: `${duration}ms`
      });

      return newMessage;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to create message', {
        userId: messageData.userId,
        engineerId: messageData.engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get conversation between user and engineer
   */
  static async getConversation(userId, engineerId, options = {}) {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 50, sort = { timestamp: -1 } } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Message.find({
          userId: userId,
          engineerId: engineerId
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
        Message.countDocuments({
          userId: userId,
          engineerId: engineerId
        })
      ]);

      const duration = Date.now() - startTime;
      logger.debug('Conversation retrieved', {
        userId,
        engineerId,
        page,
        limit,
        total,
        duration: `${duration}ms`
      });

      return { data, total, page, limit };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get conversation', {
        userId,
        engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get user's conversations list
   */
  static async getUserConversations(userId, userRole) {
    const startTime = Date.now();
    
    try {
      let matchCondition;
      let groupBy;
      let lookupField;
      let lookupFrom;

      if (userRole === 'Engineer') {
        matchCondition = { engineerId: userId };
        groupBy = '$userId';
        lookupField = 'userId';
        lookupFrom = 'clients';
      } else {
        matchCondition = { userId: userId };
        groupBy = '$engineerId';
        lookupField = 'engineerId';
        lookupFrom = 'users';
      }

      const conversations = await Message.aggregate([
        { $match: matchCondition },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: groupBy,
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$isRead', false] },
                      userRole === 'Engineer' 
                        ? { $eq: ['$senderType', 'user'] }
                        : { $eq: ['$senderType', 'engineer'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: lookupFrom,
            localField: '_id',
            foreignField: '_id',
            as: 'participant'
          }
        },
        {
          $unwind: '$participant'
        },
        {
          $project: {
            participantId: '$_id',
            participant: {
              _id: '$participant._id',
              name: userRole === 'Engineer' 
                ? '$participant.name' 
                : { $concat: ['$participant.firstName', ' ', '$participant.lastName'] },
              profilePhoto: '$participant.profilePhoto'
            },
            lastMessage: {
              content: '$lastMessage.content',
              timestamp: '$lastMessage.timestamp',
              senderType: '$lastMessage.senderType'
            },
            unreadCount: 1
          }
        },
        {
          $sort: { 'lastMessage.timestamp': -1 }
        }
      ]);

      const duration = Date.now() - startTime;
      logger.debug('User conversations retrieved', {
        userId,
        userRole,
        conversationsCount: conversations.length,
        duration: `${duration}ms`
      });

      return conversations;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get user conversations', {
        userId,
        userRole,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(userId, engineerId, readerId) {
    const startTime = Date.now();
    
    try {
      // Determine which messages to mark as read based on who is reading
      let updateCondition;
      if (readerId === userId) {
        // User is reading, mark engineer's messages as read
        updateCondition = {
          userId: userId,
          engineerId: engineerId,
          senderType: 'engineer',
          isRead: false
        };
      } else if (readerId === engineerId) {
        // Engineer is reading, mark user's messages as read
        updateCondition = {
          userId: userId,
          engineerId: engineerId,
          senderType: 'user',
          isRead: false
        };
      } else {
        throw new ValidationError('Invalid reader ID');
      }

      const result = await Message.updateMany(
        updateCondition,
        { $set: { isRead: true, readAt: new Date() } }
      );

      const duration = Date.now() - startTime;
      logger.debug('Messages marked as read', {
        userId,
        engineerId,
        readerId,
        modifiedCount: result.modifiedCount,
        duration: `${duration}ms`
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to mark messages as read', {
        userId,
        engineerId,
        readerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get unread messages count
   */
  static async getUnreadMessagesCount(userId, userRole) {
    const startTime = Date.now();
    
    try {
      let matchCondition;

      if (userRole === 'Engineer') {
        matchCondition = {
          engineerId: userId,
          senderType: 'user',
          isRead: false
        };
      } else {
        matchCondition = {
          userId: userId,
          senderType: 'engineer',
          isRead: false
        };
      }

      const count = await Message.countDocuments(matchCondition);

      const duration = Date.now() - startTime;
      logger.debug('Unread messages count retrieved', {
        userId,
        userRole,
        count,
        duration: `${duration}ms`
      });

      return count;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get unread messages count', {
        userId,
        userRole,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  static async getMessageById(messageId) {
    const startTime = Date.now();
    
    try {
      const message = await Message.findById(messageId).lean();

      const duration = Date.now() - startTime;
      logger.debug('Message retrieved by ID', {
        messageId,
        found: !!message,
        duration: `${duration}ms`
      });

      return message;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get message by ID', {
        messageId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(messageId) {
    const startTime = Date.now();
    
    try {
      const deletedMessage = await Message.findByIdAndDelete(messageId);
      
      if (!deletedMessage) {
        throw new NotFoundError('Message');
      }

      const duration = Date.now() - startTime;
      logger.info('Message deleted successfully', {
        messageId,
        duration: `${duration}ms`
      });

      return deletedMessage;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to delete message', {
        messageId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Search messages
   */
  static async searchMessages(searchFilters, options = {}) {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 20, sort = { timestamp: -1 } } = options;
      const skip = (page - 1) * limit;

      const filters = {
        content: { $regex: searchFilters.query, $options: 'i' }
      };

      if (searchFilters.userId) {
        filters.userId = searchFilters.userId;
      }

      if (searchFilters.engineerId) {
        filters.engineerId = searchFilters.engineerId;
      }

      const [data, total] = await Promise.all([
        Message.find(filters)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Message.countDocuments(filters)
      ]);

      const duration = Date.now() - startTime;
      logger.debug('Messages search completed', {
        query: searchFilters.query,
        total,
        duration: `${duration}ms`
      });

      return { data, total, page, limit };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to search messages', {
        query: searchFilters.query,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get message statistics
   */
  static async getMessageStatistics() {
    const startTime = Date.now();
    
    try {
      const [
        totalMessages,
        messagesByType,
        unreadMessages,
        messagesLast24h
      ] = await Promise.all([
        Message.countDocuments(),
        Message.aggregate([
          { $group: { _id: '$senderType', count: { $sum: 1 } } }
        ]),
        Message.countDocuments({ isRead: false }),
        Message.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      const stats = {
        totalMessages,
        messagesByType: messagesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        unreadMessages,
        messagesLast24h
      };

      const duration = Date.now() - startTime;
      logger.debug('Message statistics retrieved', {
        totalMessages,
        duration: `${duration}ms`
      });

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get message statistics', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}

module.exports = MessageService;
