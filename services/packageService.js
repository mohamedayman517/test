/**
 * Package Service
 * Handles business logic for package operations
 */

const Package = require("../models/packageSchema");
const User = require("../models/userSchema");
const { NotFoundError, ValidationError } = require("../utils/ErrorHandler");
const logger = require("../utils/Logger");

class PackageService {
  /**
   * Create new package
   */
  static async createPackage(packageData) {
    const startTime = Date.now();

    try {
      // Validate engineer exists
      const engineer = await User.findById(packageData.engID);
      if (!engineer || engineer.role !== "Engineer") {
        throw new NotFoundError("Engineer");
      }

      const newPackage = new Package(packageData);
      await newPackage.save();

      const duration = Date.now() - startTime;
      logger.info("Package created successfully", {
        packageId: newPackage._id,
        engineerId: packageData.engID,
        eventType: packageData.eventType,
        duration: `${duration}ms`,
      });

      return newPackage;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to create package", {
        engineerId: packageData.engID,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Get packages with pagination and filters
   */
  static async getPackages(filters = {}, options = {}) {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Package.find(filters)
          .populate("engID", "firstName lastName profilePhoto averageRating")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Package.countDocuments(filters),
      ]);

      const duration = Date.now() - startTime;
      logger.debug("Packages retrieved", {
        filters,
        page,
        limit,
        total,
        duration: `${duration}ms`,
      });

      return { data, total, page, limit };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to get packages", {
        filters,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Get package by ID
   */
  static async getPackageById(packageId) {
    const startTime = Date.now();

    try {
      const packageData = await Package.findById(packageId)
        .populate("engID", "firstName lastName profilePhoto averageRating bio")
        .lean();

      const duration = Date.now() - startTime;
      logger.debug("Package retrieved by ID", {
        packageId,
        found: !!packageData,
        duration: `${duration}ms`,
      });

      return packageData;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to get package by ID", {
        packageId,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Update package
   */
  static async updatePackage(packageId, updateData) {
    const startTime = Date.now();

    try {
      const updatedPackage = await Package.findByIdAndUpdate(
        packageId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("engID", "firstName lastName profilePhoto")
        .lean();

      if (!updatedPackage) {
        throw new NotFoundError("Package");
      }

      const duration = Date.now() - startTime;
      logger.info("Package updated successfully", {
        packageId,
        duration: `${duration}ms`,
      });

      return updatedPackage;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to update package", {
        packageId,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Delete package
   */
  static async deletePackage(packageId) {
    const startTime = Date.now();

    try {
      const deletedPackage = await Package.findByIdAndDelete(packageId);

      if (!deletedPackage) {
        throw new NotFoundError("Package");
      }

      const duration = Date.now() - startTime;
      logger.info("Package deleted successfully", {
        packageId,
        duration: `${duration}ms`,
      });

      return deletedPackage;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to delete package", {
        packageId,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Get packages by engineer
   */
  static async getPackagesByEngineer(engineerId, options = {}) {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 10, eventType } = options;

      const filters = { engID: engineerId };
      if (eventType) {
        filters.eventType = eventType;
      }

      const packages = await this.getPackages(filters, { page, limit });

      const duration = Date.now() - startTime;
      logger.debug("Engineer packages retrieved", {
        engineerId,
        eventType,
        count: packages.data.length,
        duration: `${duration}ms`,
      });

      return packages;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to get engineer packages", {
        engineerId,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Get packages by event type with engineers
   */
  static async getPackagesByEventTypeWithEngineers(eventType) {
    const startTime = Date.now();

    try {
      const packages = await Package.find({ eventType })
        .populate({
          path: "engID",
          select:
            "firstName lastName profilePhoto averageRating bio isApproved isVerified",
          match: { isApproved: true, isVerified: true },
        })
        .lean();

      // Filter out packages where engineer is null (not approved/verified)
      const validPackages = packages.filter((pkg) => pkg.engID);

      // Group by engineer
      const engineerPackages = validPackages.reduce((acc, pkg) => {
        const engineerId = pkg.engID._id.toString();
        if (!acc[engineerId]) {
          acc[engineerId] = {
            engineer: pkg.engID,
            packages: [],
          };
        }
        acc[engineerId].packages.push({
          _id: pkg._id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          essentialItems: pkg.essentialItems,
        });
        return acc;
      }, {});

      const result = Object.values(engineerPackages);

      const duration = Date.now() - startTime;
      logger.debug("Packages by event type with engineers retrieved", {
        eventType,
        engineersCount: result.length,
        packagesCount: validPackages.length,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to get packages by event type with engineers", {
        eventType,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Search packages
   */
  static async searchPackages(searchQuery, filters = {}, options = {}) {
    const startTime = Date.now();

    try {
      const searchFilters = {
        ...filters,
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { eventType: { $regex: searchQuery, $options: "i" } },
        ],
      };

      const packages = await this.getPackages(searchFilters, options);

      const duration = Date.now() - startTime;
      logger.debug("Packages search completed", {
        searchQuery,
        count: packages.data.length,
        duration: `${duration}ms`,
      });

      return packages;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to search packages", {
        searchQuery,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Get package statistics
   */
  static async getPackageStatistics() {
    const startTime = Date.now();

    try {
      const [totalPackages, packagesByEventType, averagePrice, priceRange] =
        await Promise.all([
          Package.countDocuments(),
          Package.aggregate([
            { $group: { _id: "$eventType", count: { $sum: 1 } } },
          ]),
          Package.aggregate([
            { $group: { _id: null, avgPrice: { $avg: "$price" } } },
          ]),
          Package.aggregate([
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
              },
            },
          ]),
        ]);

      const stats = {
        totalPackages,
        packagesByEventType: packagesByEventType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        averagePrice: averagePrice[0]?.avgPrice || 0,
        priceRange: {
          min: priceRange[0]?.minPrice || 0,
          max: priceRange[0]?.maxPrice || 0,
        },
      };

      const duration = Date.now() - startTime;
      logger.debug("Package statistics retrieved", {
        totalPackages,
        duration: `${duration}ms`,
      });

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to get package statistics", {
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }
}

module.exports = PackageService;
