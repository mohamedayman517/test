/**
 * User Controller
 * Handles user management operations
 */

const bcrypt = require('bcrypt');
const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const { 
  ValidationError, 
  AuthenticationError, 
  ConflictError,
  NotFoundError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const UserService = require('../services/userService');
const FileUploadService = require('../services/fileUploadService');

class UserController {
  
  /**
   * Get user profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      const user = await UserService.findUserById(userId);
      
      // Check if user can view this profile
      if (sessionUser.id !== userId && sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied');
      }
      
      return ResponseHandler.success(res, user, 'Profile retrieved successfully');
    } catch (error) {
      logger.error('Failed to get user profile', {
        userId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const sessionUser = req.session.user;
    const updateData = req.body;
    
    try {
      // Check if user can update this profile
      if (sessionUser.id !== userId && sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied');
      }
      
      // Handle file uploads if present
      if (req.files) {
        if (req.files.profilePhoto) {
          updateData.profilePhoto = await FileUploadService.processImageToBase64(req.files.profilePhoto[0]);
        }
        if (req.files.idCardPhoto) {
          updateData.idCardPhoto = await FileUploadService.processImageToBase64(req.files.idCardPhoto[0]);
        }
      }
      
      const updatedUser = await UserService.updateUser(userId, updateData);
      
      return ResponseHandler.success(res, updatedUser, 'Profile updated successfully');
    } catch (error) {
      logger.error('Failed to update user profile', {
        userId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Delete user
   */
  static deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      // Only admin can delete users
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      await UserService.deleteUser(userId);
      
      return ResponseHandler.success(res, null, 'User deleted successfully');
    } catch (error) {
      logger.error('Failed to delete user', {
        userId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get all engineers
   */
  static getEngineers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, specialty, approved } = req.query;
    
    try {
      const filters = { role: 'Engineer' };
      
      if (specialty) {
        filters.specialties = { $in: [new RegExp(specialty, 'i')] };
      }
      
      if (approved !== undefined) {
        filters.isApproved = approved === 'true';
      }
      
      const engineers = await UserService.getUsers(filters, {
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
      logger.error('Failed to get engineers', {
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
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      const engineer = await UserService.updateUser(engineerId, { 
        isApproved: true 
      });
      
      return ResponseHandler.success(res, engineer, 'Engineer approved successfully');
    } catch (error) {
      logger.error('Failed to approve engineer', {
        engineerId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get user statistics
   */
  static getUserStats = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can view stats
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      const stats = await UserService.getUserStatistics();
      
      return ResponseHandler.success(res, stats, 'User statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get user statistics', {
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    const sessionUser = req.session.user;
    
    try {
      // Check if user can change this password
      if (sessionUser.id !== userId && sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied');
      }
      
      await UserService.changePassword(userId, currentPassword, newPassword);
      
      return ResponseHandler.success(res, null, 'Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password', {
        userId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get user by email
   */
  static getUserByEmail = asyncHandler(async (req, res) => {
    const { email } = req.params;
    const sessionUser = req.session.user;
    
    try {
      // Only admin can search by email
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      const { user, client } = await UserService.findUserByEmail(email);
      const foundUser = user || client;
      
      if (!foundUser) {
        throw new NotFoundError('User');
      }
      
      return ResponseHandler.success(res, foundUser, 'User found successfully');
    } catch (error) {
      logger.error('Failed to find user by email', {
        email,
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = UserController;
