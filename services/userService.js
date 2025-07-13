/**
 * User Service
 * Handles business logic for user operations
 */

const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');

class UserService {

  /**
   * Find user by ID (checks both models)
   */
  static async findUserById(userId) {
    const startTime = Date.now();
    
    try {
      const user = await User.findById(userId);
      const client = await Client.findById(userId);
      
      const targetUser = user || client;
      if (!targetUser) {
        throw new NotFoundError('User');
      }

      const duration = Date.now() - startTime;
      logger.debug('User found by ID', {
        userId,
        userType: user ? 'engineer' : 'client',
        duration: `${duration}ms`
      });

      return targetUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to find user by ID', {
        userId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Find user by email (checks both models)
   */
  static async findUserByEmail(email) {
    const startTime = Date.now();
    
    try {
      const user = await User.findOne({ email });
      const client = await Client.findOne({ email });
      
      const duration = Date.now() - startTime;
      logger.debug('User search by email', {
        email,
        found: !!(user || client),
        duration: `${duration}ms`
      });

      return { user, client };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to find user by email', {
        email,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  static async isEmailExists(email) {
    const { user, client } = await this.findUserByEmail(email);
    return !!(user || client);
  }

  /**
   * Get engineers with filters
   */
  static async getEngineers(filters = {}) {
    const startTime = Date.now();
    
    try {
      const query = { role: 'Engineer', isApproved: true, isVerified: true };
      
      // Apply filters
      if (filters.specialties && filters.specialties.length > 0) {
        query.specialties = { $in: filters.specialties };
      }
      
      if (filters.minRating) {
        query.averageRating = { $gte: filters.minRating };
      }
      
      if (filters.eventType) {
        // This would need to be implemented based on your package structure
        // For now, we'll skip this filter
      }

      const engineers = await User.find(query)
        .select('firstName lastName email profilePhoto bio specialties averageRating badges')
        .lean();

      const duration = Date.now() - startTime;
      logger.info('Engineers retrieved', {
        count: engineers.length,
        filters,
        duration: `${duration}ms`
      });

      return engineers;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get engineers', {
        filters,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updateData) {
    const startTime = Date.now();
    
    try {
      const user = await User.findById(userId);
      const client = await Client.findById(userId);
      
      const targetUser = user || client;
      if (!targetUser) {
        throw new NotFoundError('User');
      }

      // Update allowed fields
      const allowedFields = ['firstName', 'lastName', 'bio', 'phone', 'profilePhoto'];
      const clientAllowedFields = ['name', 'bio', 'phone', 'profilePhoto'];
      
      const fieldsToUpdate = user ? allowedFields : clientAllowedFields;
      
      for (const field of fieldsToUpdate) {
        if (updateData[field] !== undefined) {
          targetUser[field] = updateData[field];
        }
      }

      await targetUser.save();

      const duration = Date.now() - startTime;
      logger.info('User profile updated', {
        userId,
        updatedFields: Object.keys(updateData),
        duration: `${duration}ms`
      });

      return targetUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to update user profile', {
        userId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId) {
    const startTime = Date.now();
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      const stats = {
        totalBookings: user.bookings?.length || 0,
        completedBookings: user.bookings?.filter(b => b.status === 'Completed').length || 0,
        pendingBookings: user.bookings?.filter(b => b.status === 'Active').length || 0,
        averageRating: user.averageRating || 0,
        totalEarnings: user.bookings?.reduce((sum, b) => sum + (b.priceAfterCommission || 0), 0) || 0,
        badges: user.badges || []
      };

      const duration = Date.now() - startTime;
      logger.debug('User stats retrieved', {
        userId,
        duration: `${duration}ms`
      });

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get user stats', {
        userId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Add testimonial to engineer
   */
  static async addTestimonial(engineerId, testimonialData) {
    const startTime = Date.now();
    
    try {
      const engineer = await User.findById(engineerId);
      if (!engineer) {
        throw new NotFoundError('Engineer');
      }

      if (engineer.role !== 'Engineer') {
        throw new ValidationError('User is not an engineer');
      }

      // Validate testimonial data
      if (!testimonialData.name || !testimonialData.rating || !testimonialData.comment) {
        throw new ValidationError('Missing required testimonial information');
      }

      if (testimonialData.rating < 1 || testimonialData.rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      // Add testimonial
      engineer.testimonials.push(testimonialData);
      await engineer.save();

      const duration = Date.now() - startTime;
      logger.info('Testimonial added', {
        engineerId,
        testimonialId: testimonialData._id,
        duration: `${duration}ms`
      });

      return engineer;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to add testimonial', {
        engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Approve engineer
   */
  static async approveEngineer(engineerId) {
    const startTime = Date.now();
    
    try {
      const engineer = await User.findById(engineerId);
      if (!engineer) {
        throw new NotFoundError('Engineer');
      }

      if (engineer.role !== 'Engineer') {
        throw new ValidationError('User is not an engineer');
      }

      engineer.isApproved = true;
      await engineer.save();

      const duration = Date.now() - startTime;
      logger.info('Engineer approved', {
        engineerId,
        duration: `${duration}ms`
      });

      return engineer;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to approve engineer', {
        engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(userId) {
    const startTime = Date.now();
    
    try {
      const user = await User.findById(userId);
      const client = await Client.findById(userId);
      
      const targetUser = user || client;
      if (!targetUser) {
        throw new NotFoundError('User');
      }

      await targetUser.deleteOne();

      const duration = Date.now() - startTime;
      logger.info('User deleted', {
        userId,
        userType: user ? 'engineer' : 'client',
        duration: `${duration}ms`
      });

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to delete user', {
        userId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get all users for admin
   */
  static async getAllUsers(role = null) {
    const startTime = Date.now();
    
    try {
      let users = [];
      let clients = [];

      if (!role || role === 'Engineer' || role === 'Admin') {
        const userQuery = role ? { role } : {};
        users = await User.find(userQuery).select('-password').lean();
      }

      if (!role || role === 'user') {
        clients = await Client.find().select('-password').lean();
      }

      const allUsers = [...users, ...clients];

      const duration = Date.now() - startTime;
      logger.info('All users retrieved', {
        count: allUsers.length,
        role,
        duration: `${duration}ms`
      });

      return allUsers;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get all users', {
        role,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}

module.exports = UserService; 