/**
 * Validation Middleware
 * Handles request validation and sanitization
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');

/**
 * Handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      body: req.body
    });

    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'),
    
  confirmPassword: body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
    
  name: (field) => body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage(`${field} should contain only letters and be 2-50 characters long`),
    
  phone: body('phone')
    .isMobilePhone(['ar-EG', 'en-US', 'ar-SA', 'ar-AE'], { strictMode: false })
    .withMessage('Please enter a valid phone number'),
    
  mongoId: (field) => param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
    
  price: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`),
    
  area: body('area')
    .isFloat({ min: 1 })
    .withMessage('Area must be a positive number'),
    
  eventType: body('eventType')
    .isIn(['Wedding', 'Engagement', 'Birthday', 'Babyshower'])
    .withMessage('Invalid event type'),
    
  role: body('role')
    .isIn(['Engineer', 'Admin', 'User'])
    .withMessage('Invalid role'),
    
  pagination: {
    page: query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
      
    limit: query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  }
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  commonValidations.name('firstName'),
  commonValidations.name('lastName'),
  commonValidations.email,
  commonValidations.password,
  commonValidations.confirmPassword,
  commonValidations.phone,
  commonValidations.role,
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
  commonValidations.email,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Password reset request validation
 */
const validatePasswordResetRequest = [
  commonValidations.email,
  handleValidationErrors
];

/**
 * Password reset validation
 */
const validatePasswordReset = [
  commonValidations.email,
  body('resetCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Reset code must be 6 digits'),
  commonValidations.password,
  commonValidations.confirmPassword,
  handleValidationErrors
];

/**
 * Email verification validation
 */
const validateEmailVerification = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits'),
  commonValidations.mongoId('engineerId'),
  handleValidationErrors
];

/**
 * Project creation validation
 */
const validateProjectCreation = [
  body('projectName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be 2-100 characters long'),
  body('projectType')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Project type must be 2-50 characters long'),
  commonValidations.price('projectPrice'),
  commonValidations.area,
  handleValidationErrors
];

/**
 * Project update validation
 */
const validateProjectUpdate = [
  commonValidations.mongoId('projectId'),
  body('projectName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be 2-100 characters long'),
  body('projectType')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Project type must be 2-50 characters long'),
  body('projectPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Project price must be a positive number'),
  body('projectArea')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Project area must be a positive number'),
  handleValidationErrors
];

/**
 * Package creation validation
 */
const validatePackageCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Package name must be 2-100 characters long'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters long'),
  commonValidations.price('price'),
  commonValidations.eventType,
  body('essentialItems')
    .optional()
    .isArray()
    .withMessage('Essential items must be an array'),
  handleValidationErrors
];

/**
 * Package update validation
 */
const validatePackageUpdate = [
  commonValidations.mongoId('packageId'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Package name must be 2-100 characters long'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters long'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('eventType')
    .optional()
    .isIn(['Wedding', 'Engagement', 'Birthday', 'Babyshower'])
    .withMessage('Invalid event type'),
  handleValidationErrors
];

/**
 * Message sending validation
 */
const validateMessageSending = [
  commonValidations.mongoId('engineerId'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be 1-1000 characters long'),
  handleValidationErrors
];

/**
 * Booking creation validation
 */
const validateBookingCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters long'),
  commonValidations.email,
  commonValidations.phone,
  body('eventDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  body('eventLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Event location must be 5-200 characters long'),
  body('guestCount')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Guest count must be between 1 and 10000'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  handleValidationErrors
];

/**
 * Search validation
 */
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters long'),
  commonValidations.pagination.page,
  commonValidations.pagination.limit,
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  commonValidations.pagination.page,
  commonValidations.pagination.limit,
  handleValidationErrors
];

/**
 * File upload validation
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    throw new ValidationError('No file uploaded');
  }
  
  const file = req.file || (req.files && req.files[0]);
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type. Only JPEG, PNG, and GIF are allowed.');
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new ValidationError('File size too large. Maximum size is 5MB.');
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateEmailVerification,
  validateProjectCreation,
  validateProjectUpdate,
  validatePackageCreation,
  validatePackageUpdate,
  validateMessageSending,
  validateBookingCreation,
  validateSearch,
  validatePagination,
  validateFileUpload
};
