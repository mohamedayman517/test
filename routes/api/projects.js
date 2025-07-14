/**
 * Projects API Routes
 * Handles project management endpoints
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Controllers
const ProjectController = require('../../controllers/projectController');

// Middleware
const { 
  requireAuth, 
  requireAdmin, 
  requireEngineerOrAdmin 
} = require('../../middleware/auth');
const { uploadConfigs } = require('../../middleware/upload');
const { 
  validateProjectCreation,
  validateProjectUpdate,
  validatePagination 
} = require('../../middleware/validation');

// Rate limiting
const projectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(projectLimiter);

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private (Engineer only)
 */
router.post('/',
  requireAuth,
  requireEngineerOrAdmin,
  uploadConfigs.projectImage,
  validateProjectCreation,
  ProjectController.createProject
);

/**
 * @route   GET /api/projects
 * @desc    Get all projects with filters
 * @access  Public
 */
router.get('/',
  validatePagination,
  ProjectController.getProjects
);

/**
 * @route   GET /api/projects/:projectId
 * @desc    Get project by ID
 * @access  Public
 */
router.get('/:projectId',
  ProjectController.getProjectById
);

/**
 * @route   PUT /api/projects/:projectId
 * @desc    Update project
 * @access  Private (Project owner or Admin)
 */
router.put('/:projectId',
  requireAuth,
  uploadConfigs.projectImage,
  validateProjectUpdate,
  ProjectController.updateProject
);

/**
 * @route   DELETE /api/projects/:projectId
 * @desc    Delete project
 * @access  Private (Project owner or Admin)
 */
router.delete('/:projectId',
  requireAuth,
  ProjectController.deleteProject
);

/**
 * @route   GET /api/projects/engineer/:engineerId
 * @desc    Get projects by engineer
 * @access  Public
 */
router.get('/engineer/:engineerId',
  validatePagination,
  ProjectController.getEngineerProjects
);

/**
 * @route   GET /api/projects/stats/overview
 * @desc    Get project statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview',
  requireAuth,
  requireAdmin,
  ProjectController.getProjectStats
);

/**
 * @route   GET /api/projects/featured/list
 * @desc    Get featured projects
 * @access  Public
 */
router.get('/featured/list',
  ProjectController.getFeaturedProjects
);

/**
 * @route   POST /api/projects/search
 * @desc    Search projects
 * @access  Public
 */
router.post('/search',
  validatePagination,
  ProjectController.searchProjects
);

module.exports = router;
