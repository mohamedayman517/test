/**
 * Package Controller
 * Handles package management operations
 */

const Package = require('../models/packageSchema');
const User = require('../models/userSchema');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const PackageService = require('../services/packageService');

class PackageController {
  
  /**
   * Create new package
   */
  static createPackage = asyncHandler(async (req, res) => {
    const { name, description, price, eventType, essentialItems } = req.body;
    const sessionUser = req.session.user;
    
    try {
      // Only engineers can create packages
      if (!sessionUser || sessionUser.role !== 'Engineer') {
        throw new AuthenticationError('Only engineers can create packages');
      }
      
      // Validate required fields
      if (!name || !description || !price || !eventType) {
        throw new ValidationError('Name, description, price, and event type are required');
      }
      
      // Validate price
      const packagePrice = parseFloat(price);
      if (isNaN(packagePrice) || packagePrice <= 0) {
        throw new ValidationError('Invalid package price');
      }
      
      // Process essential items
      let itemsArray = [];
      if (essentialItems) {
        if (Array.isArray(essentialItems)) {
          itemsArray = essentialItems.filter(item => item && item.trim());
        } else if (typeof essentialItems === 'string') {
          itemsArray = essentialItems.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      
      const packageData = {
        engID: sessionUser.id,
        name: name.trim(),
        description: description.trim(),
        price: packagePrice,
        eventType,
        essentialItems: itemsArray
      };
      
      const newPackage = await PackageService.createPackage(packageData);
      
      return ResponseHandler.created(res, newPackage, 'Package created successfully');
    } catch (error) {
      logger.error('Failed to create package', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get all packages
   */
  static getPackages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, eventType, engineerId, minPrice, maxPrice } = req.query;
    
    try {
      const filters = {};
      
      if (eventType) {
        filters.eventType = eventType;
      }
      
      if (engineerId) {
        filters.engID = engineerId;
      }
      
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
      }
      
      const packages = await PackageService.getPackages(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ResponseHandler.paginated(
        res,
        packages.data,
        parseInt(page),
        parseInt(limit),
        packages.total,
        'Packages retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get packages', {
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get package by ID
   */
  static getPackageById = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    
    try {
      const package = await PackageService.getPackageById(packageId);
      
      if (!package) {
        throw new NotFoundError('Package');
      }
      
      return ResponseHandler.success(res, package, 'Package retrieved successfully');
    } catch (error) {
      logger.error('Failed to get package', {
        packageId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Update package
   */
  static updatePackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const updateData = req.body;
    const sessionUser = req.session.user;
    
    try {
      const package = await PackageService.getPackageById(packageId);
      
      if (!package) {
        throw new NotFoundError('Package');
      }
      
      // Check if user can update this package
      if (sessionUser.role !== 'Admin' && package.engID.toString() !== sessionUser.id) {
        throw new AuthenticationError('Access denied');
      }
      
      // Validate price if provided
      if (updateData.price) {
        const packagePrice = parseFloat(updateData.price);
        if (isNaN(packagePrice) || packagePrice <= 0) {
          throw new ValidationError('Invalid package price');
        }
        updateData.price = packagePrice;
      }
      
      // Process essential items if provided
      if (updateData.essentialItems) {
        let itemsArray = [];
        if (Array.isArray(updateData.essentialItems)) {
          itemsArray = updateData.essentialItems.filter(item => item && item.trim());
        } else if (typeof updateData.essentialItems === 'string') {
          itemsArray = updateData.essentialItems.split(',').map(item => item.trim()).filter(item => item);
        }
        updateData.essentialItems = itemsArray;
      }
      
      // Trim string fields
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.description) updateData.description = updateData.description.trim();
      
      const updatedPackage = await PackageService.updatePackage(packageId, updateData);
      
      return ResponseHandler.success(res, updatedPackage, 'Package updated successfully');
    } catch (error) {
      logger.error('Failed to update package', {
        packageId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Delete package
   */
  static deletePackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      const package = await PackageService.getPackageById(packageId);
      
      if (!package) {
        throw new NotFoundError('Package');
      }
      
      // Check if user can delete this package
      if (sessionUser.role !== 'Admin' && package.engID.toString() !== sessionUser.id) {
        throw new AuthenticationError('Access denied');
      }
      
      await PackageService.deletePackage(packageId);
      
      return ResponseHandler.success(res, null, 'Package deleted successfully');
    } catch (error) {
      logger.error('Failed to delete package', {
        packageId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get engineer's packages
   */
  static getEngineerPackages = asyncHandler(async (req, res) => {
    const { engineerId } = req.params;
    const { page = 1, limit = 10, eventType } = req.query;
    
    try {
      // Verify engineer exists
      const engineer = await User.findById(engineerId);
      if (!engineer || engineer.role !== 'Engineer') {
        throw new NotFoundError('Engineer');
      }
      
      const filters = { engID: engineerId };
      if (eventType) {
        filters.eventType = eventType;
      }
      
      const packages = await PackageService.getPackages(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ResponseHandler.paginated(
        res,
        packages.data,
        parseInt(page),
        parseInt(limit),
        packages.total,
        'Engineer packages retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get engineer packages', {
        engineerId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get packages by event type with engineers
   */
  static getPackagesByEventType = asyncHandler(async (req, res) => {
    const { eventType } = req.query;
    
    try {
      if (!eventType) {
        throw new ValidationError('Event type is required');
      }
      
      const result = await PackageService.getPackagesByEventTypeWithEngineers(eventType);
      
      return ResponseHandler.success(res, result, 'Packages with engineers retrieved successfully');
    } catch (error) {
      logger.error('Failed to get packages by event type', {
        eventType,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get package statistics
   */
  static getPackageStats = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can view stats
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      const stats = await PackageService.getPackageStatistics();
      
      return ResponseHandler.success(res, stats, 'Package statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get package statistics', {
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = PackageController;
