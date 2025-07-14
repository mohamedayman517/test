/**
 * File Upload Service
 * Handles file upload and processing operations
 */

const fs = require("fs").promises;
const path = require("path");
const { ValidationError } = require("../utils/ErrorHandler");
const logger = require("../utils/Logger");

// Optional sharp import for image processing
let sharp;
try {
  sharp = require("sharp");
} catch (error) {
  logger.warn("Sharp not available, image optimization disabled", {
    error: error.message,
  });
  sharp = null;
}

class FileUploadService {
  /**
   * Process image to base64
   */
  static async processImageToBase64(file) {
    const startTime = Date.now();

    try {
      if (!file) {
        throw new ValidationError("No file provided");
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new ValidationError(
          "Invalid file type. Only JPEG, PNG, and GIF are allowed."
        );
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new ValidationError("File size too large. Maximum size is 5MB.");
      }

      let imageBuffer;

      // If file has a path (uploaded to disk), read it
      if (file.path) {
        imageBuffer = await fs.readFile(file.path);
        // Clean up uploaded file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.warn("Failed to delete uploaded file", {
            filePath: file.path,
            error: unlinkError.message,
          });
        }
      } else if (file.buffer) {
        // If file is in memory
        imageBuffer = file.buffer;
      } else {
        throw new ValidationError("Invalid file format");
      }

      let processedBuffer;
      let base64String;

      // Process image with sharp if available (resize and optimize)
      if (sharp) {
        try {
          processedBuffer = await sharp(imageBuffer)
            .resize(800, 600, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          base64String = `data:image/jpeg;base64,${processedBuffer.toString(
            "base64"
          )}`;
        } catch (sharpError) {
          logger.warn("Sharp processing failed, using original image", {
            filename: file.originalname,
            error: sharpError.message,
          });
          // Fallback to original image
          base64String = `data:${file.mimetype};base64,${imageBuffer.toString(
            "base64"
          )}`;
          processedBuffer = imageBuffer;
        }
      } else {
        // No sharp available, use original image
        base64String = `data:${file.mimetype};base64,${imageBuffer.toString(
          "base64"
        )}`;
        processedBuffer = imageBuffer;
      }

      const duration = Date.now() - startTime;
      logger.debug("Image processed to base64", {
        originalSize: file.size,
        processedSize: processedBuffer.length,
        filename: file.originalname,
        duration: `${duration}ms`,
        sharpUsed: !!sharp,
      });

      return base64String;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to process image to base64", {
        filename: file?.originalname,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Process multiple images to base64
   */
  static async processMultipleImagesToBase64(files) {
    const startTime = Date.now();

    try {
      if (!files || files.length === 0) {
        return [];
      }

      const processedImages = await Promise.all(
        files.map((file) => this.processImageToBase64(file))
      );

      const duration = Date.now() - startTime;
      logger.debug("Multiple images processed to base64", {
        count: files.length,
        duration: `${duration}ms`,
      });

      return processedImages;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to process multiple images to base64", {
        count: files?.length,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Validate image file
   */
  static validateImageFile(file) {
    if (!file) {
      throw new ValidationError("No file provided");
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError(
        "Invalid file type. Only JPEG, PNG, and GIF are allowed."
      );
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new ValidationError("File size too large. Maximum size is 5MB.");
    }

    return true;
  }

  /**
   * Save file to disk (alternative to base64)
   */
  static async saveFileToDisk(file, uploadDir = "uploads") {
    const startTime = Date.now();

    try {
      this.validateImageFile(file);

      // Ensure upload directory exists
      const fullUploadDir = path.join(process.cwd(), uploadDir);
      await fs.mkdir(fullUploadDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}_${randomString}${extension}`;
      const filePath = path.join(fullUploadDir, filename);

      let imageBuffer;
      if (file.path) {
        imageBuffer = await fs.readFile(file.path);
        // Clean up original uploaded file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.warn("Failed to delete original uploaded file", {
            filePath: file.path,
            error: unlinkError.message,
          });
        }
      } else if (file.buffer) {
        imageBuffer = file.buffer;
      } else {
        throw new ValidationError("Invalid file format");
      }

      // Process and save image
      await sharp(imageBuffer)
        .resize(800, 600, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(filePath);

      const relativePath = `/${uploadDir}/${filename}`;

      const duration = Date.now() - startTime;
      logger.debug("File saved to disk", {
        originalName: file.originalname,
        savedPath: relativePath,
        duration: `${duration}ms`,
      });

      return relativePath;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to save file to disk", {
        filename: file?.originalname,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Delete file from disk
   */
  static async deleteFileFromDisk(filePath) {
    const startTime = Date.now();

    try {
      if (!filePath || filePath === "/uploads/default.png") {
        return; // Don't delete default images
      }

      const fullPath = path.join(process.cwd(), filePath);
      await fs.unlink(fullPath);

      const duration = Date.now() - startTime;
      logger.debug("File deleted from disk", {
        filePath,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.warn("Failed to delete file from disk", {
        filePath,
        error: error.message,
        duration: `${duration}ms`,
      });
      // Don't throw error for file deletion failures
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const stats = await fs.stat(fullPath);

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true,
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
      };
    }
  }

  /**
   * Create thumbnail
   */
  static async createThumbnail(file, width = 150, height = 150) {
    const startTime = Date.now();

    try {
      this.validateImageFile(file);

      let imageBuffer;
      if (file.path) {
        imageBuffer = await fs.readFile(file.path);
      } else if (file.buffer) {
        imageBuffer = file.buffer;
      } else {
        throw new ValidationError("Invalid file format");
      }

      // Create thumbnail
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Convert to base64
      const base64String = `data:image/jpeg;base64,${thumbnailBuffer.toString(
        "base64"
      )}`;

      const duration = Date.now() - startTime;
      logger.debug("Thumbnail created", {
        originalSize: file.size,
        thumbnailSize: thumbnailBuffer.length,
        dimensions: `${width}x${height}`,
        duration: `${duration}ms`,
      });

      return base64String;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to create thumbnail", {
        filename: file?.originalname,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Extract image metadata
   */
  static async extractImageMetadata(file) {
    try {
      let imageBuffer;
      if (file.path) {
        imageBuffer = await fs.readFile(file.path);
      } else if (file.buffer) {
        imageBuffer = file.buffer;
      } else {
        throw new ValidationError("Invalid file format");
      }

      const metadata = await sharp(imageBuffer).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      };
    } catch (error) {
      logger.error("Failed to extract image metadata", {
        filename: file?.originalname,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = FileUploadService;
