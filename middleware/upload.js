/**
 * File Upload Middleware
 * Handles file upload configuration and validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ValidationError } = require('../utils/ErrorHandler');
const logger = require('../utils/Logger');

/**
 * Create upload directory if it doesn't exist
 */
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Memory storage configuration (for base64 conversion)
 */
const memoryStorage = multer.memoryStorage();

/**
 * Disk storage configuration
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Organize uploads by type
    if (file.fieldname === 'profilePhoto') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'idCardPhoto') {
      uploadPath += 'documents/';
    } else if (file.fieldname === 'projectImage') {
      uploadPath += 'projects/';
    } else {
      uploadPath += 'general/';
    }
    
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${randomString}${extension}`;
    cb(null, filename);
  }
});

/**
 * File filter function
 */
const fileFilter = (req, file, cb) => {
  try {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      logger.warn('Invalid file type uploaded', {
        filename: file.originalname,
        mimetype: file.mimetype,
        fieldname: file.fieldname
      });
      return cb(new ValidationError('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
    }
    
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      logger.warn('Invalid file extension', {
        filename: file.originalname,
        extension: fileExtension,
        fieldname: file.fieldname
      });
      return cb(new ValidationError('Invalid file extension.'), false);
    }
    
    cb(null, true);
  } catch (error) {
    logger.error('File filter error', {
      filename: file.originalname,
      error: error.message
    });
    cb(error, false);
  }
};

/**
 * Base multer configuration
 */
const baseConfig = {
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  }
};

/**
 * Memory upload configuration (for base64 conversion)
 */
const memoryUpload = multer({
  storage: memoryStorage,
  ...baseConfig
});

/**
 * Disk upload configuration
 */
const diskUpload = multer({
  storage: diskStorage,
  ...baseConfig
});

/**
 * Single file upload middleware (memory)
 */
const uploadSingleToMemory = (fieldName) => {
  return (req, res, next) => {
    const upload = memoryUpload.single(fieldName);
    
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('File size too large. Maximum size is 5MB.'));
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError('Unexpected file field.'));
          }
        }
        return next(err);
      }
      
      if (req.file) {
        logger.debug('File uploaded to memory', {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          fieldname: req.file.fieldname
        });
      }
      
      next();
    });
  };
};

/**
 * Multiple files upload middleware (memory)
 */
const uploadMultipleToMemory = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const upload = memoryUpload.array(fieldName, maxCount);
    
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('File size too large. Maximum size is 5MB.'));
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(`Too many files. Maximum is ${maxCount}.`));
          }
        }
        return next(err);
      }
      
      if (req.files && req.files.length > 0) {
        logger.debug('Multiple files uploaded to memory', {
          count: req.files.length,
          files: req.files.map(f => ({
            filename: f.originalname,
            size: f.size,
            mimetype: f.mimetype
          }))
        });
      }
      
      next();
    });
  };
};

/**
 * Fields upload middleware (memory) - for multiple different fields
 */
const uploadFieldsToMemory = (fields) => {
  return (req, res, next) => {
    const upload = memoryUpload.fields(fields);
    
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('File size too large. Maximum size is 5MB.'));
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError('Unexpected file field.'));
          }
        }
        return next(err);
      }
      
      if (req.files) {
        const fileCount = Object.keys(req.files).reduce((count, key) => {
          return count + req.files[key].length;
        }, 0);
        
        logger.debug('Multiple fields uploaded to memory', {
          fieldCount: Object.keys(req.files).length,
          totalFiles: fileCount,
          fields: Object.keys(req.files)
        });
      }
      
      next();
    });
  };
};

/**
 * Single file upload middleware (disk)
 */
const uploadSingleToDisk = (fieldName) => {
  return (req, res, next) => {
    const upload = diskUpload.single(fieldName);
    
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('File size too large. Maximum size is 5MB.'));
          }
        }
        return next(err);
      }
      
      if (req.file) {
        logger.debug('File uploaded to disk', {
          filename: req.file.originalname,
          savedAs: req.file.filename,
          path: req.file.path,
          size: req.file.size
        });
      }
      
      next();
    });
  };
};

/**
 * Common upload configurations
 */
const uploadConfigs = {
  // Profile photo upload
  profilePhoto: uploadSingleToMemory('profilePhoto'),
  
  // ID card photo upload
  idCardPhoto: uploadSingleToMemory('idCardPhoto'),
  
  // Project image upload
  projectImage: uploadSingleToMemory('projectImage'),
  
  // Multiple project images
  projectImages: uploadMultipleToMemory('projectImages', 10),
  
  // User registration files (profile + ID card)
  userRegistration: uploadFieldsToMemory([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'idCardPhoto', maxCount: 1 }
  ]),
  
  // Profile update files
  profileUpdate: uploadFieldsToMemory([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'idCardPhoto', maxCount: 1 }
  ]),
  
  // Any single image
  singleImage: uploadSingleToMemory('image'),
  
  // Multiple images
  multipleImages: uploadMultipleToMemory('images', 5)
};

/**
 * Error handling middleware for upload errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer upload error', {
      code: err.code,
      message: err.message,
      field: err.field
    });
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new ValidationError('File size too large. Maximum size is 5MB.'));
      case 'LIMIT_FILE_COUNT':
        return next(new ValidationError('Too many files uploaded.'));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new ValidationError('Unexpected file field.'));
      case 'LIMIT_PART_COUNT':
        return next(new ValidationError('Too many parts in the request.'));
      default:
        return next(new ValidationError('File upload error.'));
    }
  }
  
  next(err);
};

/**
 * Clean up uploaded files on error
 */
const cleanupOnError = (err, req, res, next) => {
  if (err && req.file && req.file.path) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) {
        logger.warn('Failed to cleanup uploaded file', {
          path: req.file.path,
          error: unlinkErr.message
        });
      }
    });
  }
  
  if (err && req.files) {
    const filesToCleanup = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    filesToCleanup.forEach(file => {
      if (file.path) {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) {
            logger.warn('Failed to cleanup uploaded file', {
              path: file.path,
              error: unlinkErr.message
            });
          }
        });
      }
    });
  }
  
  next(err);
};

module.exports = {
  memoryUpload,
  diskUpload,
  uploadSingleToMemory,
  uploadMultipleToMemory,
  uploadFieldsToMemory,
  uploadSingleToDisk,
  uploadConfigs,
  handleUploadError,
  cleanupOnError
};
