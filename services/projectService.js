/**
 * Project Service
 * Handles business logic for project operations
 */

const Project = require('../models/projectSchema');
const User = require('../models/userSchema');
const { NotFoundError, ValidationError, AuthenticationError } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');

class ProjectService {

  /**
   * Create new project
   */
  static async createProject(projectData) {
    const startTime = Date.now();
    
    try {
      // Validate engineer exists
      const engineer = await User.findById(projectData.engID);
      if (!engineer || engineer.role !== 'Engineer') {
        throw new NotFoundError('Engineer');
      }

      const newProject = new Project(projectData);
      await newProject.save();

      const duration = Date.now() - startTime;
      logger.info('Project created successfully', {
        projectId: newProject._id,
        engineerId: projectData.engID,
        duration: `${duration}ms`
      });

      return newProject;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to create project', {
        engineerId: projectData.engID,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get projects with pagination and filters
   */
  static async getProjects(filters = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Project.find(filters)
          .populate('engID', 'firstName lastName profilePhoto averageRating')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Project.countDocuments(filters)
      ]);

      const duration = Date.now() - startTime;
      logger.debug('Projects retrieved', {
        filters,
        page,
        limit,
        total,
        duration: `${duration}ms`
      });

      return { data, total, page, limit };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get projects', {
        filters,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId) {
    const startTime = Date.now();
    
    try {
      const project = await Project.findById(projectId)
        .populate('engID', 'firstName lastName profilePhoto averageRating bio')
        .lean();

      const duration = Date.now() - startTime;
      logger.debug('Project retrieved by ID', {
        projectId,
        found: !!project,
        duration: `${duration}ms`
      });

      return project;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get project by ID', {
        projectId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Update project
   */
  static async updateProject(projectId, updateData) {
    const startTime = Date.now();
    
    try {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        updateData,
        { new: true, runValidators: true }
      ).populate('engID', 'firstName lastName profilePhoto').lean();

      if (!updatedProject) {
        throw new NotFoundError('Project');
      }

      const duration = Date.now() - startTime;
      logger.info('Project updated successfully', {
        projectId,
        duration: `${duration}ms`
      });

      return updatedProject;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to update project', {
        projectId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId) {
    const startTime = Date.now();
    
    try {
      const deletedProject = await Project.findByIdAndDelete(projectId);
      
      if (!deletedProject) {
        throw new NotFoundError('Project');
      }

      const duration = Date.now() - startTime;
      logger.info('Project deleted successfully', {
        projectId,
        duration: `${duration}ms`
      });

      return deletedProject;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to delete project', {
        projectId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get projects by engineer
   */
  static async getProjectsByEngineer(engineerId, options = {}) {
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 10 } = options;
      
      const projects = await this.getProjects(
        { engID: engineerId },
        { page, limit }
      );

      const duration = Date.now() - startTime;
      logger.debug('Engineer projects retrieved', {
        engineerId,
        count: projects.data.length,
        duration: `${duration}ms`
      });

      return projects;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get engineer projects', {
        engineerId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Search projects
   */
  static async searchProjects(searchQuery, filters = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      const searchFilters = {
        ...filters,
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { type: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      const projects = await this.getProjects(searchFilters, options);

      const duration = Date.now() - startTime;
      logger.debug('Projects search completed', {
        searchQuery,
        count: projects.data.length,
        duration: `${duration}ms`
      });

      return projects;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to search projects', {
        searchQuery,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  static async getProjectStatistics() {
    const startTime = Date.now();
    
    try {
      const [
        totalProjects,
        projectsByType,
        averagePrice,
        priceRange
      ] = await Promise.all([
        Project.countDocuments(),
        Project.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Project.aggregate([
          { $group: { _id: null, avgPrice: { $avg: '$price' } } }
        ]),
        Project.aggregate([
          { 
            $group: { 
              _id: null, 
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            } 
          }
        ])
      ]);

      const stats = {
        totalProjects,
        projectsByType: projectsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        averagePrice: averagePrice[0]?.avgPrice || 0,
        priceRange: {
          min: priceRange[0]?.minPrice || 0,
          max: priceRange[0]?.maxPrice || 0
        }
      };

      const duration = Date.now() - startTime;
      logger.debug('Project statistics retrieved', {
        totalProjects,
        duration: `${duration}ms`
      });

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get project statistics', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get featured projects
   */
  static async getFeaturedProjects(limit = 6) {
    const startTime = Date.now();
    
    try {
      const featuredProjects = await Project.find()
        .populate('engID', 'firstName lastName profilePhoto averageRating')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.debug('Featured projects retrieved', {
        count: featuredProjects.length,
        duration: `${duration}ms`
      });

      return featuredProjects;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get featured projects', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}

module.exports = ProjectService;
