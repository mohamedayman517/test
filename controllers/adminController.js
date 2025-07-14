/**
 * Admin Controller
 * Handles administrative operations
 */

const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const Project = require('../models/projectSchema');
const Package = require('../models/packageSchema');
const { 
  AuthenticationError, 
  NotFoundError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const AdminService = require('../services/adminService');

class AdminController {
  
  /**
   * Get admin dashboard data
   */
  static getDashboard = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can access dashboard
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const dashboardData = await AdminService.getDashboardData();
      
      return ResponseHandler.success(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Render admin dashboard page
   */
  static renderDashboard = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can access dashboard
      if (!sessionUser || sessionUser.role !== 'Admin') {
        return res.status(403).send('Access denied. Admins only.');
      }
      
      const dashboardData = await AdminService.getDashboardData();
      
      res.render('AdminDashboard', {
        user: sessionUser,
        ...dashboardData
      });
    } catch (error) {
      logger.error('Failed to render dashboard', {
        userId: sessionUser?.id,
        error: error.message
      });
      res.status(500).send('Error loading dashboard');
    }
  });

  /**
   * Get all engineers for admin management
   */
  static getEngineers = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    const { page = 1, limit = 10, approved, verified } = req.query;
    
    try {
      // Only admin can access this
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const filters = { role: 'Engineer' };
      
      if (approved !== undefined) {
        filters.isApproved = approved === 'true';
      }
      
      if (verified !== undefined) {
        filters.isVerified = verified === 'true';
      }
      
      const engineers = await AdminService.getEngineers(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ResponseHandler.paginated(
        res,
        engineers.data,
        parseInt(page),
        parseInt(limit),
        engineers.total,
        'Engineers retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get engineers for admin', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Approve engineer
   */
  static approveEngineer = asyncHandler(async (req, res) => {
    const { engineerId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      // Only admin can approve engineers
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const engineer = await AdminService.approveEngineer(engineerId);
      
      return ResponseHandler.success(res, engineer, 'Engineer approved successfully');
    } catch (error) {
      logger.error('Failed to approve engineer', {
        engineerId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Reject engineer
   */
  static rejectEngineer = asyncHandler(async (req, res) => {
    const { engineerId } = req.params;
    const { reason } = req.body;
    const sessionUser = req.session.user;
    
    try {
      // Only admin can reject engineers
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      await AdminService.rejectEngineer(engineerId, reason);
      
      return ResponseHandler.success(res, null, 'Engineer rejected successfully');
    } catch (error) {
      logger.error('Failed to reject engineer', {
        engineerId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Delete engineer
   */
  static deleteEngineer = asyncHandler(async (req, res) => {
    const { engineerId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      // Only admin can delete engineers
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      await AdminService.deleteEngineer(engineerId);
      
      return ResponseHandler.success(res, null, 'Engineer deleted successfully');
    } catch (error) {
      logger.error('Failed to delete engineer', {
        engineerId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get all clients
   */
  static getClients = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    const { page = 1, limit = 10 } = req.query;
    
    try {
      // Only admin can access this
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const clients = await AdminService.getClients({
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ResponseHandler.paginated(
        res,
        clients.data,
        parseInt(page),
        parseInt(limit),
        clients.total,
        'Clients retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get clients for admin', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get system statistics
   */
  static getSystemStats = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can view system stats
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const stats = await AdminService.getSystemStatistics();
      
      return ResponseHandler.success(res, stats, 'System statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get system statistics', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get revenue statistics
   */
  static getRevenueStats = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    const { startDate, endDate } = req.query;
    
    try {
      // Only admin can view revenue stats
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const stats = await AdminService.getRevenueStatistics(startDate, endDate);
      
      return ResponseHandler.success(res, stats, 'Revenue statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get revenue statistics', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get client count
   */
  static getClientCount = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can access this
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const count = await Client.countDocuments();
      
      return ResponseHandler.success(res, { count }, 'Client count retrieved successfully');
    } catch (error) {
      logger.error('Failed to get client count', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Manage user roles
   */
  static updateUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    const sessionUser = req.session.user;
    
    try {
      // Only admin can update user roles
      if (!sessionUser || sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admins only.');
      }
      
      const updatedUser = await AdminService.updateUserRole(userId, role);
      
      return ResponseHandler.success(res, updatedUser, 'User role updated successfully');
    } catch (error) {
      logger.error('Failed to update user role', {
        userId,
        newRole: role,
        adminId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = AdminController;
