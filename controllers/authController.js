/**
 * Authentication Controller
 * Handles user registration, login, verification, and password reset
 */

const bcrypt = require("bcrypt");
const User = require("../models/userSchema");
const Client = require("../models/clientSchema");
const {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} = require("../utils/ErrorHandler");
const ResponseHandler = require("../utils/ResponseHandler");
const logger = require("../utils/Logger");
const { asyncHandler } = require("../utils/ErrorHandler");
const UserService = require("../services/userService");
const EmailService = require("../services/emailService");
const FileUploadService = require("../services/fileUploadService");

class AuthController {
  /**
   * Register new user (Engineer/Admin)
   */
  static register = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      const { firstName, lastName, email, password, phone, role, bio } =
        req.body;

      // Check if email exists using UserService
      const emailExists = await UserService.isEmailExists(email);
      if (emailExists) {
        throw new ConflictError(
          "This email is already registered. Please use a different email or login."
        );
      }

      // Handle file uploads
      let profilePhotoBase64 = null;
      let idCardPhotoBase64 = null;

      if (req.files) {
        if (req.files.profilePhoto) {
          profilePhotoBase64 = await FileUploadService.processImageToBase64(
            req.files.profilePhoto[0]
          );
        }

        if (req.files.idCardPhoto && role === "Engineer") {
          idCardPhotoBase64 = await FileUploadService.processImageToBase64(
            req.files.idCardPhoto[0]
          );
        }
      }

      // Prepare user data
      const userData = {
        firstName,
        lastName,
        email,
        password,
        phone,
        role,
        bio: bio || "",
        profilePhoto: profilePhotoBase64 || "/uploads/default.png",
        ...(role === "Engineer" && { idCardPhoto: idCardPhotoBase64 }),
      };

      // Create user using UserService
      const newUser = await UserService.createUser(userData);

      // Send verification email for engineers
      if (role === "Engineer") {
        try {
          const verificationCode = Math.floor(
            100000 + Math.random() * 900000
          ).toString();
          await EmailService.sendVerificationEmail(
            email,
            verificationCode,
            `${firstName} ${lastName}`
          );

          // Store verification code (you might want to store this in Redis or database)
          // For now, we'll assume it's handled in the email service
        } catch (emailError) {
          logger.warn("Failed to send verification email", {
            userId: newUser._id,
            email,
            error: emailError.message,
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info("User registered successfully", {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
        duration: `${duration}ms`,
      });

      return ResponseHandler.userRegistered(res, {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isApproved: newUser.isApproved,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("User registration failed", {
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      const { email, password } = req.body;

      // Find user using UserService
      const { user, client } = await UserService.findUserByEmail(email);

      let activeUser = null;
      let userType = "";

      // Check User model (Engineer/Admin)
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          activeUser = user;
          userType = "engineer";

          // Check approval for Engineers
          if (user.role === "Engineer" && !user.isApproved) {
            throw new AuthenticationError("Your account is pending approval");
          }

          // Check verification for Engineers
          if (user.role === "Engineer" && !user.isVerified) {
            throw new AuthenticationError(
              "Please verify your email address using the code sent to your email before logging in."
            );
          }

          // Check subscription expiration
          const now = new Date();
          if (
            user.role === "Engineer" &&
            user.hasPaidSubscription &&
            user.subscriptionEndDate &&
            new Date(user.subscriptionEndDate) < now
          ) {
            return ResponseHandler.error(
              res,
              "Your subscription has expired. Please renew to continue.",
              403,
              {
                subscriptionExpired: true,
                engineerId: user._id,
                redirectTo: `/subscription-expired?engineerId=${user._id}`,
              }
            );
          }
        }
      }

      // Check Client model if not found in User model
      if (!activeUser && client) {
        const isMatch = await bcrypt.compare(password, client.password);
        if (isMatch) {
          activeUser = client;
          userType = "client";
        }
      }

      if (!activeUser) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Set session
      req.session.user = {
        id: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        name:
          userType === "engineer"
            ? `${activeUser.firstName} ${activeUser.lastName}`
            : activeUser.name,
      };

      const duration = Date.now() - startTime;
      logger.info("User logged in successfully", {
        userId: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        duration: `${duration}ms`,
      });

      return ResponseHandler.loginSuccess(res, {
        id: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        name: req.session.user.name,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("User login failed", {
        email: req.body.email,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  });

  /**
   * Verify account
   */
  static verifyAccount = asyncHandler(async (req, res) => {
    const { code, engineerId } = req.body;

    if (!code || !engineerId) {
      throw new ValidationError("Please provide verification code");
    }

    const engineer = await User.findById(engineerId);
    if (!engineer) {
      throw new NotFoundError("Engineer");
    }

    if (engineer.verificationCode !== code) {
      throw new ValidationError("Invalid verification code");
    }

    if (
      engineer.verificationCodeExpires &&
      new Date() > engineer.verificationCodeExpires
    ) {
      throw new ValidationError("Verification code has expired");
    }

    // Update verification status
    engineer.isVerified = true;
    engineer.verificationCode = null;
    engineer.verificationCodeExpires = null;
    await engineer.save();

    logger.info("Account verified successfully", {
      userId: engineer._id,
      email: engineer.email,
    });

    return ResponseHandler.success(res, null, "Account verified successfully");
  });

  /**
   * Send verification email
   */
  static async sendVerificationEmail(user) {
    try {
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = expiresAt;
      await user.save();

      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: "Verify Your Account - Decor And More",
        html: `
          <h2>Welcome to Decor And More!</h2>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        `,
      };

      await emailTransporter.sendMail(mailOptions);

      logger.info("Verification email sent", {
        userId: user._id,
        email: user.email,
      });
    } catch (error) {
      logger.error("Failed to send verification email", {
        userId: user._id,
        email: user.email,
        error: error.message,
      });
      throw new Error("Failed to send verification email");
    }
  }

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error("Logout error", { error: err.message });
        throw new Error("Failed to logout");
      }

      logger.info("User logged out successfully");
      return ResponseHandler.logoutSuccess(res);
    });
  });

  /**
   * Forgot password
   */
  static forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Check both models
    const user = await User.findOne({ email });
    const client = await Client.findOne({ email });

    const targetUser = user || client;
    if (!targetUser) {
      throw new NotFoundError("User with this email");
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    targetUser.resetCode = resetCode;
    targetUser.resetCodeExpires = expiresAt;
    await targetUser.save();

    // Send reset email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset - Decor And More",
      html: `
        <h2>Password Reset Request</h2>
        <p>Your reset code is: <strong>${resetCode}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await emailTransporter.sendMail(mailOptions);

    logger.info("Password reset email sent", { email });

    return ResponseHandler.success(
      res,
      null,
      "Password reset code sent to your email"
    );
  });

  /**
   * Reset password
   */
  static resetPassword = asyncHandler(async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    // Check both models
    const user = await User.findOne({ email });
    const client = await Client.findOne({ email });

    const targetUser = user || client;
    if (!targetUser) {
      throw new NotFoundError("User with this email");
    }

    if (targetUser.resetCode !== resetCode) {
      throw new ValidationError("Invalid reset code");
    }

    if (
      targetUser.resetCodeExpires &&
      new Date() > targetUser.resetCodeExpires
    ) {
      throw new ValidationError("Reset code has expired");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    targetUser.password = hashedPassword;
    targetUser.resetCode = null;
    targetUser.resetCodeExpires = null;
    await targetUser.save();

    logger.info("Password reset successfully", { email });

    return ResponseHandler.success(res, null, "Password reset successfully");
  });

  /**
   * Verify email with code
   */
  static verifyEmail = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      const { code, engineerId } = req.body;

      if (!code || !engineerId) {
        throw new ValidationError(
          "Please provide verification code and engineer ID"
        );
      }

      // Find the engineer
      const engineer = await User.findById(engineerId);
      if (!engineer) {
        throw new NotFoundError("Engineer not found");
      }

      // Check verification code
      if (engineer.verificationCode !== code) {
        throw new ValidationError("Invalid verification code");
      }

      // Check if code is expired
      if (
        engineer.verificationCodeExpires &&
        new Date() > engineer.verificationCodeExpires
      ) {
        throw new ValidationError("Verification code has expired");
      }

      // Update engineer as verified
      engineer.isVerified = true;
      engineer.verificationCode = undefined;
      engineer.verificationCodeExpires = undefined;
      await engineer.save();

      const duration = Date.now() - startTime;
      logger.info("Email verified successfully", {
        engineerId,
        duration: `${duration}ms`,
      });

      return ResponseHandler.success(res, null, "Email verified successfully");
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Email verification failed", {
        engineerId: req.body.engineerId,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  });

  /**
   * Resend verification email
   */
  static resendVerification = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      const { engineerId } = req.body;

      if (!engineerId) {
        throw new ValidationError("Engineer ID is required");
      }

      const engineer = await User.findById(engineerId);
      if (!engineer) {
        throw new NotFoundError("Engineer not found");
      }

      if (engineer.isVerified) {
        throw new ValidationError("Email is already verified");
      }

      // Generate new verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      engineer.verificationCode = verificationCode;
      engineer.verificationCodeExpires = expirationTime;
      await engineer.save();

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          engineer.email,
          verificationCode,
          `${engineer.firstName} ${engineer.lastName}`
        );
      } catch (emailError) {
        logger.warn("Failed to send verification email", {
          engineerId,
          error: emailError.message,
        });
      }

      const duration = Date.now() - startTime;
      logger.info("Verification email resent", {
        engineerId,
        duration: `${duration}ms`,
      });

      return ResponseHandler.success(
        res,
        null,
        "Verification email sent successfully"
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Failed to resend verification email", {
        engineerId: req.body.engineerId,
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  });

  /**
   * Get current user info
   */
  static getCurrentUser = asyncHandler(async (req, res) => {
    try {
      const user = req.user;

      return ResponseHandler.success(
        res,
        {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          isApproved: user.isApproved,
          isVerified: user.isVerified,
          profilePhoto: user.profilePhoto,
        },
        "User info retrieved successfully"
      );
    } catch (error) {
      logger.error("Failed to get current user", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  });

  /**
   * Check if email exists
   */
  static checkEmailExists = asyncHandler(async (req, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        throw new ValidationError("Email is required");
      }

      const exists = await UserService.isEmailExists(email);

      return ResponseHandler.success(res, { exists }, "Email check completed");
    } catch (error) {
      logger.error("Failed to check email existence", {
        email: req.query.email,
        error: error.message,
      });
      throw error;
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        throw new ValidationError(
          "Current password and new password are required"
        );
      }

      const user = await UserService.findUserById(userId);

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new ValidationError("Current password is incorrect");
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      logger.info("Password changed successfully", { userId });

      return ResponseHandler.success(
        res,
        null,
        "Password changed successfully"
      );
    } catch (error) {
      logger.error("Failed to change password", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  });

  /**
   * Refresh session
   */
  static refreshSession = asyncHandler(async (req, res) => {
    try {
      const user = req.user;

      // Update session with latest user data
      const currentUser = await UserService.findUserById(user.id);

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

      return ResponseHandler.success(
        res,
        req.session.user,
        "Session refreshed successfully"
      );
    } catch (error) {
      logger.error("Failed to refresh session", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  });
}

module.exports = AuthController;
