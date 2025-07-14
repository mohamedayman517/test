/**
 * Authentication Middleware
 * Handles user authentication and authorization
 */

const {
  AuthenticationError,
  ForbiddenError,
} = require("../utils/ErrorHandler");
const logger = require("../utils/Logger");
const UserService = require("../services/userService");

/**
 * Check if user is authenticated
 */
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      logger.warn("Unauthorized access attempt", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
      });

      // For API requests, return JSON error
      if (req.path.startsWith("/api/")) {
        throw new AuthenticationError("Authentication required");
      }

      // For web requests, redirect to login
      return res.redirect("/login");
    }

    // Verify user still exists and is active
    try {
      const currentUser = await UserService.findUserById(req.session.user.id);

      // Update session with latest user data
      req.session.user = {
        id: currentUser._id,
        email: currentUser.email,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        name: currentUser.name,
        isApproved: currentUser.isApproved,
        isVerified: currentUser.isVerified,
      };

      req.user = req.session.user;
    } catch (userError) {
      // User no longer exists, clear session
      req.session.destroy();

      if (req.path.startsWith("/api/")) {
        throw new AuthenticationError("User account no longer exists");
      }

      return res.redirect("/login");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has specific role
 */
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.user) {
        throw new AuthenticationError("Authentication required");
      }

      const userRole = req.session.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        logger.warn("Insufficient permissions", {
          userId: req.session.user.id,
          userRole,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method,
        });

        throw new ForbiddenError("Insufficient permissions");
      }

      // Additional checks for engineers
      if (userRole === "Engineer") {
        if (!req.session.user.isApproved) {
          throw new ForbiddenError("Engineer account not approved");
        }

        if (!req.session.user.isVerified) {
          throw new ForbiddenError("Engineer account not verified");
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole("Admin");

/**
 * Check if user is engineer
 */
const requireEngineer = requireRole("Engineer");

/**
 * Check if user is engineer or admin
 */
const requireEngineerOrAdmin = requireRole(["Engineer", "Admin"]);

/**
 * Check if user is client (regular user)
 */
const requireClient = (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      throw new AuthenticationError("Authentication required");
    }

    // Client can be either a user role or someone without specific role
    const userRole = req.session.user.role;
    if (userRole && userRole !== "User" && userRole !== "user") {
      throw new ForbiddenError("Client access only");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if not authenticated
 */
const optionalAuth = async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      // Verify user still exists
      const currentUser = await UserService.findUserById(req.session.user.id);
      req.user = {
        id: currentUser._id,
        email: currentUser.email,
        role: currentUser.role,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        name: currentUser.name,
        isApproved: currentUser.isApproved,
        isVerified: currentUser.isVerified,
      };
    } catch (error) {
      // User no longer exists, clear session but don't fail
      req.session.destroy();
      req.user = null;
    }
  }
  next();
};

/**
 * Require ownership or admin access
 * @param {string} paramName - The parameter name to check ownership against
 */
const requireOwnershipOrAdmin = (paramName) => {
  return async (req, res, next) => {
    try {
      const user = req.session?.user;
      if (!user) {
        throw new AuthenticationError("Authentication required");
      }

      // Admin can access anything
      if (user.role === "admin") {
        return next();
      }

      // Check if user owns the resource
      const resourceId = req.params[paramName];
      if (user.id === resourceId || user.id.toString() === resourceId) {
        return next();
      }

      logger.warn("Ownership access denied", {
        userId: user.id,
        resourceId,
        paramName,
        userRole: user.role,
        path: req.path,
      });

      throw new ForbiddenError("Access denied - insufficient permissions");
    } catch (error) {
      logger.error("Ownership check error", {
        error: error.message,
        userId: req.session?.user?.id,
        path: req.path,
      });

      if (req.path.startsWith("/api/")) {
        return res.status(error.statusCode || 403).json({
          error: error.message || "Access denied",
        });
      }

      return res.redirect("/login");
    }
  };
};

/**
 * Legacy function for backward compatibility
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Please login first" });
};

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireEngineer,
  requireEngineerOrAdmin,
  requireClient,
  requireOwnershipOrAdmin,
  optionalAuth,
  isAuthenticated, // Legacy support
};
