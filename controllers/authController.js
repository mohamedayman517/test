/**
 * Authentication Controller
 * Handles user registration, login, verification, and password reset
 */

const bcrypt = require('bcrypt');
const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const { 
  ValidationError, 
  AuthenticationError, 
  ConflictError,
  NotFoundError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');
const emailTransporter = require('../utils/emailTransporter');

class AuthController {
  
  /**
   * Register new user (Engineer/Admin)
   */
  static register = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { firstName, lastName, email, password, phone, role, bio } = req.body;
      
      // Check if email exists in both models
      const existingUser = await User.findOne({ email });
      const existingClient = await Client.findOne({ email });

      if (existingUser || existingClient) {
        throw new ConflictError('هذا البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.');
      }

      // Generate custom ID
      const customId = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Handle profile photo (base64)
      let profilePhotoBase64 = null;
      if (req.files && req.files.profilePhoto) {
        const file = req.files.profilePhoto[0];
        const imageBuffer = file.buffer;
        profilePhotoBase64 = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
      }

      // Handle ID card photo for engineers
      let idCardPhotoBase64 = null;
      if (req.files && req.files.idCardPhoto) {
        const file = req.files.idCardPhoto[0];
        const imageBuffer = file.buffer;
        idCardPhotoBase64 = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
      }

      // Create user
      const userData = {
        customId,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role,
        bio: bio || '',
        profilePhoto: profilePhotoBase64 || '/uploads/default.png',
        ...(role === 'Engineer' && { idCardPhoto: idCardPhotoBase64 })
      };

      const newUser = new User(userData);
      await newUser.save();

      // Send verification email for engineers
      if (role === 'Engineer') {
        await this.sendVerificationEmail(newUser);
      }

      const duration = Date.now() - startTime;
      logger.info('User registered successfully', {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
        duration: `${duration}ms`
      });

      return ResponseHandler.userRegistered(res, {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isApproved: newUser.isApproved
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('User registration failed', {
        error: error.message,
        duration: `${duration}ms`
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

      // Find user in both models
      const user = await User.findOne({ email });
      const client = await Client.findOne({ email });

      let activeUser = null;
      let userType = '';

      // Check User model (Engineer/Admin)
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          activeUser = user;
          userType = 'engineer';

          // Check approval for Engineers
          if (user.role === 'Engineer' && !user.isApproved) {
            throw new AuthenticationError('Your account is pending approval');
          }

          // Check verification for Engineers
          if (user.role === 'Engineer' && !user.isVerified) {
            throw new AuthenticationError('Please verify your email address using the code sent to your email before logging in.');
          }

          // Check subscription expiration
          const now = new Date();
          if (user.role === 'Engineer' && user.hasPaidSubscription && 
              user.subscriptionEndDate && new Date(user.subscriptionEndDate) < now) {
            return ResponseHandler.error(res, 'Your subscription has expired. Please renew to continue.', 403, {
              subscriptionExpired: true,
              engineerId: user._id,
              redirectTo: `/subscription-expired?engineerId=${user._id}`
            });
          }
        }
      }

      // Check Client model if not found in User model
      if (!activeUser && client) {
        const isMatch = await bcrypt.compare(password, client.password);
        if (isMatch) {
          activeUser = client;
          userType = 'client';
        }
      }

      if (!activeUser) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Set session
      req.session.user = {
        id: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        name: userType === 'engineer' ? 
          `${activeUser.firstName} ${activeUser.lastName}` : 
          activeUser.name
      };

      const duration = Date.now() - startTime;
      logger.info('User logged in successfully', {
        userId: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        duration: `${duration}ms`
      });

      return ResponseHandler.loginSuccess(res, {
        id: activeUser._id,
        email: activeUser.email,
        role: activeUser.role,
        name: req.session.user.name
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('User login failed', {
        email: req.body.email,
        error: error.message,
        duration: `${duration}ms`
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
      throw new ValidationError('Please provide verification code');
    }

    const engineer = await User.findById(engineerId);
    if (!engineer) {
      throw new NotFoundError('Engineer');
    }

    if (engineer.verificationCode !== code) {
      throw new ValidationError('Invalid verification code');
    }

    if (engineer.verificationCodeExpires && new Date() > engineer.verificationCodeExpires) {
      throw new ValidationError('Verification code has expired');
    }

    // Update verification status
    engineer.isVerified = true;
    engineer.verificationCode = null;
    engineer.verificationCodeExpires = null;
    await engineer.save();

    logger.info('Account verified successfully', {
      userId: engineer._id,
      email: engineer.email
    });

    return ResponseHandler.success(res, null, 'Account verified successfully');
  });

  /**
   * Send verification email
   */
  static async sendVerificationEmail(user) {
    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = expiresAt;
      await user.save();

      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Verify Your Account - Decor And More',
        html: `
          <h2>Welcome to Decor And More!</h2>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        `
      };

      await emailTransporter.sendMail(mailOptions);
      
      logger.info('Verification email sent', {
        userId: user._id,
        email: user.email
      });

    } catch (error) {
      logger.error('Failed to send verification email', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Logout error', { error: err.message });
        throw new Error('Failed to logout');
      }
      
      logger.info('User logged out successfully');
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
      throw new NotFoundError('User with this email');
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
      subject: 'Password Reset - Decor And More',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your reset code is: <strong>${resetCode}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    await emailTransporter.sendMail(mailOptions);

    logger.info('Password reset email sent', { email });

    return ResponseHandler.success(res, null, 'Password reset code sent to your email');
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
      throw new NotFoundError('User with this email');
    }

    if (targetUser.resetCode !== resetCode) {
      throw new ValidationError('Invalid reset code');
    }

    if (targetUser.resetCodeExpires && new Date() > targetUser.resetCodeExpires) {
      throw new ValidationError('Reset code has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    targetUser.password = hashedPassword;
    targetUser.resetCode = null;
    targetUser.resetCodeExpires = null;
    await targetUser.save();

    logger.info('Password reset successfully', { email });

    return ResponseHandler.success(res, null, 'Password reset successfully');
  });
}

module.exports = AuthController; 