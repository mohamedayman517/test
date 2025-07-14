/**
 * Admin Service
 * Handles business logic for administrative operations
 */

const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const Project = require('../models/projectSchema');
const Package = require('../models/packageSchema');
const Message = require('../models/messageSchema');
const { NotFoundError, ValidationError } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');
const EmailService = require('./emailService');

class AdminService {

  /**
   * Get dashboard data
   */
  static async getDashboardData() {
    const startTime = Date.now();
    
    try {
      const [
        totalEngineers,
        totalClients,
        totalProjects,
        totalPackages,
        pendingEngineers,
        recentMessages,
        engineerStats,
        revenueStats
      ] = await Promise.all([
        User.countDocuments({ role: 'Engineer' }),
        Client.countDocuments(),
        Project.countDocuments(),
        Package.countDocuments(),
        User.countDocuments({ role: 'Engineer', isApproved: false }),
        Message.find().sort({ timestamp: -1 }).limit(10).lean(),
        this.getEngineerStatistics(),
        this.getRevenueStatistics()
      ]);

      const dashboardData = {
        overview: {
          totalEngineers,
          totalClients,
          totalProjects,
          totalPackages,
          pendingEngineers
        },
        recentMessages,
        engineerStats,
        revenueStats
      };

      const duration = Date.now() - startTime;
      logger.debug('Dashboard data retrieved', {
        totalEngineers,
        totalClients,
        duration: `${duration}ms`
      });

      return dashboardData;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get dashboard data', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get engineers with filters and pagination
   */
  static async getEngineers(filters = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        User.find({ role: 'Engineer', ...filters })
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments({ role: 'Engineer', ...filters })
      ]);

      const duration = Date.now() - startTime;
      logger.debug('Engineers retrieved for admin', {
        filters,
        page,
        limit,
        total,
        duration: `${duration}ms`
      });

      return { data, total, page, limit };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get engineers for admin', {
        filters,
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

      // Send approval email
      try {
        await EmailService.sendEngineerApprovalEmail(engineer.email, {
          firstName: engineer.firstName,
          lastName: engineer.lastName
        });
      } catch (emailError) {
        logger.warn('Failed to send approval email', {
          engineerId,
          email: engineer.email,
          error: emailError.message
        });
      }

      const duration = Date.now() - startTime;
      logger.info('Engineer approved successfully', {
        engineerId,
        engineerEmail: engineer.email,
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
   * Reject engineer
   */
  static async rejectEngineer(engineerId, reason) {
    const startTime = Date.now();
    
    try {
      const engineer = await User.findById(engineerId);
      
      if (!engineer) {
        throw new NotFoundError('Engineer');
      }

      if (engineer.role !== 'Engineer') {
        throw new ValidationError('User is not an engineer');
      }

      // Send rejection email
      try {
        await EmailService.sendEngineerRejectionEmail(engineer.email, {
          firstName: engineer.firstName,
          lastName: engineer.lastName,
          reason: reason || 'Application did not meet our requirements'
        });
      } catch (emailError) {
        logger.warn('Failed to send rejection email', {
          engineerId,
          email: engineer.email,
          error: emailError.message
        });
      }

      // Delete the engineer account
      await User.findByIdAndDelete(engineerId);

      const duration = Date.now() - startTime;
      logger.info('Engineer rejected and deleted', {
        engineerId,
        engineerEmail: engineer.email,
        reason,
        duration: `${duration}ms`
      });

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to reject engineer', {
        engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Delete engineer and related data
   */
  static async deleteEngineer(engineerId) {
    const startTime = Date.now();
    
    try {
      const engineer = await User.findById(engineerId);
      
      if (!engineer) {
        throw new NotFoundError('Engineer');
      }

      if (engineer.role !== 'Engineer') {
        throw new ValidationError('User is not an engineer');
      }

      // Delete related data
      await Promise.all([
        Project.deleteMany({ engID: engineerId }),
        Package.deleteMany({ engID: engineerId }),
        Message.deleteMany({ engineerId: engineerId }),
        Client.updateMany(
          {},
          { $pull: { bookings: { engineerId: engineerId } } }
        )
      ]);

      // Delete engineer
      await User.findByIdAndDelete(engineerId);

      const duration = Date.now() - startTime;
      logger.info('Engineer and related data deleted', {
        engineerId,
        duration: `${duration}ms`
      });

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to delete engineer', {
        engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get clients with pagination
   */
  static async getClients(options = {}) {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Client.find()
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Client.countDocuments()
      ]);

      const duration = Date.now() - startTime;
      logger.debug('Clients retrieved for admin', {
        page,
        limit,
        total,
        duration: `${duration}ms`
      });

      return { data, total, page, limit };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get clients for admin', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  static async getSystemStatistics() {
    const startTime = Date.now();
    
    try {
      const [
        userStats,
        projectStats,
        packageStats,
        messageStats
      ] = await Promise.all([
        this.getUserStatistics(),
        this.getProjectStatistics(),
        this.getPackageStatistics(),
        this.getMessageStatistics()
      ]);

      const systemStats = {
        users: userStats,
        projects: projectStats,
        packages: packageStats,
        messages: messageStats
      };

      const duration = Date.now() - startTime;
      logger.debug('System statistics retrieved', {
        duration: `${duration}ms`
      });

      return systemStats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get system statistics', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics() {
    const [
      totalEngineers,
      approvedEngineers,
      verifiedEngineers,
      totalClients,
      totalAdmins
    ] = await Promise.all([
      User.countDocuments({ role: 'Engineer' }),
      User.countDocuments({ role: 'Engineer', isApproved: true }),
      User.countDocuments({ role: 'Engineer', isVerified: true }),
      Client.countDocuments(),
      User.countDocuments({ role: 'Admin' })
    ]);

    return {
      totalEngineers,
      approvedEngineers,
      verifiedEngineers,
      pendingEngineers: totalEngineers - approvedEngineers,
      totalClients,
      totalAdmins,
      totalUsers: totalEngineers + totalClients + totalAdmins
    };
  }

  /**
   * Get engineer statistics
   */
  static async getEngineerStatistics() {
    const engineerStats = await User.aggregate([
      { $match: { role: 'Engineer' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: ['$isApproved', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } }
        }
      }
    ]);

    return engineerStats[0] || { total: 0, approved: 0, verified: 0 };
  }

  /**
   * Get revenue statistics
   */
  static async getRevenueStatistics(startDate, endDate) {
    // This would need to be implemented based on your booking/payment system
    // For now, returning mock data
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      averageBookingValue: 0,
      totalBookings: 0
    };
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId, newRole) {
    const startTime = Date.now();
    
    try {
      const validRoles = ['Engineer', 'Admin', 'User'];
      if (!validRoles.includes(newRole)) {
        throw new ValidationError('Invalid role');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      user.role = newRole;
      await user.save();

      const duration = Date.now() - startTime;
      logger.info('User role updated', {
        userId,
        oldRole: user.role,
        newRole,
        duration: `${duration}ms`
      });

      return user;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to update user role', {
        userId,
        newRole,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}

module.exports = AdminService;
