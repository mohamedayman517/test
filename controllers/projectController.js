/**
 * Project Controller
 * Handles project management operations
 */

const Project = require('../models/projectSchema');
const User = require('../models/userSchema');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const ProjectService = require('../services/projectService');
const FileUploadService = require('../services/fileUploadService');

class ProjectController {
  
  /**
   * Create new project
   */
  static createProject = asyncHandler(async (req, res) => {
    const { projectName, projectType, projectArea, projectPrice } = req.body;
    const sessionUser = req.session.user;
    
    try {
      // Only engineers can create projects
      if (!sessionUser || sessionUser.role !== 'Engineer') {
        throw new AuthenticationError('Only engineers can create projects');
      }
      
      // Validate required fields
      if (!projectName || !projectType || !projectArea || !projectPrice || !req.file) {
        throw new ValidationError('All fields are required including project image');
      }
      
      // Validate numeric fields
      const area = parseFloat(projectArea);
      const price = parseFloat(projectPrice);
      
      if (isNaN(area) || area <= 0) {
        throw new ValidationError('Invalid project area');
      }
      
      if (isNaN(price) || price <= 0) {
        throw new ValidationError('Invalid project price');
      }
      
      // Process image
      const imageBase64 = await FileUploadService.processImageToBase64(req.file);
      
      const projectData = {
        name: projectName,
        engID: sessionUser.id,
        image: imageBase64,
        price: price,
        type: projectType,
        area: area
      };
      
      const newProject = await ProjectService.createProject(projectData);
      
      return ResponseHandler.created(res, newProject, 'Project created successfully');
    } catch (error) {
      logger.error('Failed to create project', {
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get all projects
   */
  static getProjects = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, type, engineerId, minPrice, maxPrice } = req.query;
    
    try {
      const filters = {};
      
      if (type) {
        filters.type = new RegExp(type, 'i');
      }
      
      if (engineerId) {
        filters.engID = engineerId;
      }
      
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
      }
      
      const projects = await ProjectService.getProjects(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return ResponseHandler.paginated(
        res,
        projects.data,
        parseInt(page),
        parseInt(limit),
        projects.total,
        'Projects retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get projects', {
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get project by ID
   */
  static getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    try {
      const project = await ProjectService.getProjectById(projectId);
      
      if (!project) {
        throw new NotFoundError('Project');
      }
      
      return ResponseHandler.success(res, project, 'Project retrieved successfully');
    } catch (error) {
      logger.error('Failed to get project', {
        projectId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Update project
   */
  static updateProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const updateData = req.body;
    const sessionUser = req.session.user;
    
    try {
      const project = await ProjectService.getProjectById(projectId);
      
      if (!project) {
        throw new NotFoundError('Project');
      }
      
      // Check if user can update this project
      if (sessionUser.role !== 'Admin' && project.engID.toString() !== sessionUser.id) {
        throw new AuthenticationError('Access denied');
      }
      
      // Handle image update if provided
      if (req.file) {
        updateData.image = await FileUploadService.processImageToBase64(req.file);
      }
      
      // Validate numeric fields if provided
      if (updateData.projectArea) {
        const area = parseFloat(updateData.projectArea);
        if (isNaN(area) || area <= 0) {
          throw new ValidationError('Invalid project area');
        }
        updateData.area = area;
        delete updateData.projectArea;
      }
      
      if (updateData.projectPrice) {
        const price = parseFloat(updateData.projectPrice);
        if (isNaN(price) || price <= 0) {
          throw new ValidationError('Invalid project price');
        }
        updateData.price = price;
        delete updateData.projectPrice;
      }
      
      if (updateData.projectName) {
        updateData.name = updateData.projectName;
        delete updateData.projectName;
      }
      
      if (updateData.projectType) {
        updateData.type = updateData.projectType;
        delete updateData.projectType;
      }
      
      const updatedProject = await ProjectService.updateProject(projectId, updateData);
      
      return ResponseHandler.success(res, updatedProject, 'Project updated successfully');
    } catch (error) {
      logger.error('Failed to update project', {
        projectId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Delete project
   */
  static deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const sessionUser = req.session.user;
    
    try {
      const project = await ProjectService.getProjectById(projectId);
      
      if (!project) {
        throw new NotFoundError('Project');
      }
      
      // Check if user can delete this project
      if (sessionUser.role !== 'Admin' && project.engID.toString() !== sessionUser.id) {
        throw new AuthenticationError('Access denied');
      }
      
      await ProjectService.deleteProject(projectId);
      
      return ResponseHandler.success(res, null, 'Project deleted successfully');
    } catch (error) {
      logger.error('Failed to delete project', {
        projectId,
        userId: sessionUser?.id,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get engineer's projects
   */
  static getEngineerProjects = asyncHandler(async (req, res) => {
    const { engineerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    try {
      // Verify engineer exists
      const engineer = await User.findById(engineerId);
      if (!engineer || engineer.role !== 'Engineer') {
        throw new NotFoundError('Engineer');
      }
      
      const projects = await ProjectService.getProjects(
        { engID: engineerId },
        {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      );
      
      return ResponseHandler.paginated(
        res,
        projects.data,
        parseInt(page),
        parseInt(limit),
        projects.total,
        'Engineer projects retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get engineer projects', {
        engineerId,
        error: error.message
      });
      throw error;
    }
  });

  /**
   * Get project statistics
   */
  static getProjectStats = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    
    try {
      // Only admin can view stats
      if (sessionUser.role !== 'Admin') {
        throw new AuthenticationError('Access denied. Admin only.');
      }
      
      const stats = await ProjectService.getProjectStatistics();
      
      return ResponseHandler.success(res, stats, 'Project statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get project statistics', {
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = ProjectController;
