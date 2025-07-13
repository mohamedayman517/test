/**
 * Booking Controller
 * Handles booking creation, payment processing, and booking management
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/userSchema');
const Client = require('../models/clientSchema');
const Package = require('../models/packageSchema');
const { 
  ValidationError, 
  NotFoundError, 
  PaymentError,
  ConflictError 
} = require('../utils/ErrorHandler');
const ResponseHandler = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');
const { asyncHandler } = require('../utils/ErrorHandler');

class BookingController {

  /**
   * Get booking page
   */
  static getBookingPage = asyncHandler(async (req, res) => {
    const clientUser = req.session.user;
    if (!clientUser) {
      return res.redirect('/');
    }

    // Get full client data from database
    let clientData = null;
    try {
      clientData = await Client.findById(clientUser.id).lean();
      if (!clientData) {
        logger.warn('Client not found in database, using session data', {
          userId: clientUser.id
        });
        clientData = clientUser;
      }
    } catch (error) {
      logger.error('Error fetching client data', {
        userId: clientUser.id,
        error: error.message
      });
      clientData = clientUser;
    }

    let eventType = req.query.eventType || '';
    if (eventType) {
      eventType = eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase();
      if (eventType.replace(/\s/g, '').toLowerCase() === 'babyshower') {
        eventType = 'BabyShower';
      }
    }

    let pkg = null;
    if (req.query.packageId) {
      try {
        pkg = await Package.findById(req.query.packageId).lean();
        if (!pkg) {
          logger.warn('Package not found', { packageId: req.query.packageId });
        }
      } catch (error) {
        logger.error('Error fetching package', {
          packageId: req.query.packageId,
          error: error.message
        });
      }
    }

    res.render('Booking', {
      stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
      client: clientData,
      package: pkg,
      user: clientUser,
      isAuthenticated: !!clientUser,
      selectedEventType: eventType,
    });
  });

  /**
   * Create booking
   */
  static createBooking = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { packageId, eventDate, eventType } = req.body;
      
      if (!packageId || !eventDate || !eventType) {
        throw new ValidationError('Missing required booking information');
      }

      const pkg = await Package.findById(packageId).lean();
      if (!pkg) {
        throw new NotFoundError('Package');
      }

      // Calculate pricing
      const originalPrice = pkg.price;
      const commission = Math.round(originalPrice * 0.1);
      const totalPrice = originalPrice;
      const deposit = Math.round(totalPrice * 0.5);
      const vendorShare = totalPrice - commission;

      // Generate booking ID
      const bookingId = `DC-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 9000 + 1000
      )}`;

      const duration = Date.now() - startTime;
      logger.info('Booking created successfully', {
        bookingId,
        packageId,
        eventDate,
        eventType,
        totalPrice,
        duration: `${duration}ms`
      });

      res.render('confirmation', {
        user: req.session.user,
        isAuthenticated: !!req.session.user,
        package: pkg,
        packageName: pkg.name,
        bookingId: bookingId,
        price: totalPrice,
        deposit: deposit,
        eventDate: eventDate,
        originalPrice: originalPrice,
        stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
        eventType: eventType,
        vendorShare: deposit - commission,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Booking creation failed', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  });

  /**
   * Proceed to payment
   */
  static proceedToPayment = asyncHandler(async (req, res) => {
    const {
      bookingId,
      packageId,
      packageName,
      eventDate,
      price,
      deposit,
      eventType,
    } = req.body;

    if (!bookingId || !packageId || !packageName || !eventDate || !price || !deposit) {
      throw new ValidationError('Missing required payment information');
    }

    logger.info('Proceeding to payment', {
      bookingId,
      packageId,
      packageName,
      price,
      deposit
    });

    res.render('payment', {
      stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
      user: req.session.user,
      isAuthenticated: !!req.session.user,
      bookingId: bookingId,
      packageId: packageId,
      packageName: packageName,
      price: parseInt(price),
      deposit: parseInt(deposit),
      eventDate: eventDate,
      eventType,
    });
  });

  /**
   * Process payment
   */
  static processPayment = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const {
        payment_method_id,
        amount,
        package_name,
        package_id,
        event_date,
        user_id,
        event_type,
        booking_id,
      } = req.body;

      if (!payment_method_id || !amount || !package_id || !user_id) {
        throw new ValidationError('Missing required payment details');
      }

      const finalBookingId = booking_id || 
        `DC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'egp',
        payment_method_types: ['card'],
        payment_method: payment_method_id,
        confirm: true,
        return_url: `${process.env.DOMAIN}/payment-success`,
        metadata: {
          booking_id: finalBookingId,
          user_id: user_id,
          package_name: package_name,
          event_date: event_date,
          event_type: event_type
        }
      });

      if (paymentIntent.status === 'succeeded') {
        // Process booking data
        await this.saveBookingData(paymentIntent, finalBookingId, user_id, package_id);
        
        const duration = Date.now() - startTime;
        logger.info('Payment processed successfully', {
          paymentIntentId: paymentIntent.id,
          bookingId: finalBookingId,
          amount,
          duration: `${duration}ms`
        });

        return ResponseHandler.paymentSuccess(res, {
          status: 'succeeded',
          paymentIntentId: paymentIntent.id,
          bookingId: finalBookingId
        });

      } else if (paymentIntent.status === 'requires_action') {
        return ResponseHandler.success(res, {
          status: 'requires_action',
          next_action: paymentIntent.next_action,
          client_secret: paymentIntent.client_secret,
        });
      } else {
        throw new PaymentError('Payment failed');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Payment processing failed', {
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  });

  /**
   * Save booking data after successful payment
   */
  static async saveBookingData(paymentIntent, bookingId, userId, packageId) {
    const startTime = Date.now();
    
    try {
      // Get package and engineer details
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        throw new NotFoundError('Package');
      }

      const engineer = await User.findById(pkg.engID);
      if (!engineer) {
        throw new NotFoundError('Engineer');
      }

      // Check engineer availability
      const isAvailable = await this.checkEngineerAvailability(engineer._id, paymentIntent.metadata.event_date);
      if (!isAvailable) {
        throw new ConflictError('Engineer is not available on this date');
      }

      // Calculate pricing
      const originalPrice = pkg.price;
      const commission = Math.round(originalPrice * 0.1);
      const totalPrice = originalPrice;
      const deposit = Math.round(totalPrice * 0.5);
      const remaining = totalPrice - deposit;

      // Get client details
      const client = await Client.findById(userId);
      if (!client) {
        throw new NotFoundError('Client');
      }

      // Prepare booking data for engineer
      const engineerBookingDetails = {
        bookingId: bookingId,
        clientName: client.name,
        clientId: client._id.toString(),
        phone: client.phone,
        projectType: paymentIntent.metadata.event_type,
        packageName: pkg.name,
        price: totalPrice,
        deposit: deposit,
        commission: commission,
        priceAfterCommission: totalPrice - commission,
        totalPrice: totalPrice,
        remaining: remaining,
        paymentStatus: 'Paid',
        eventDate: paymentIntent.metadata.event_date,
        paymentId: paymentIntent.id,
        paymentMethod: 'Card'
      };

      // Prepare booking data for client
      const clientBookingDetails = {
        bookingId: bookingId,
        engineerId: engineer._id,
        engineerName: `${engineer.firstName} ${engineer.lastName}`,
        profileImage: engineer.profilePhoto,
        projectType: paymentIntent.metadata.event_type,
        packageName: pkg.name,
        price: totalPrice,
        deposit: deposit,
        date: new Date(paymentIntent.metadata.event_date),
        paymentStatus: 'Paid',
        paymentId: paymentIntent.id
      };

      // Save to engineer's bookings
      engineer.bookings.push(engineerBookingDetails);
      await engineer.save();

      // Save to client's bookings
      client.bookings.push(clientBookingDetails);
      await client.save();

      const duration = Date.now() - startTime;
      logger.info('Booking data saved successfully', {
        bookingId,
        engineerId: engineer._id,
        clientId: client._id,
        duration: `${duration}ms`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to save booking data', {
        bookingId,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Check engineer availability
   */
  static async checkEngineerAvailability(engineerId, eventDate) {
    try {
      const engineer = await User.findById(engineerId);
      if (!engineer) {
        return false;
      }

      // Check if engineer has any conflicting bookings on the same date
      const conflictingBooking = engineer.bookings.find(booking => 
        booking.eventDate === eventDate && 
        booking.status !== 'Cancelled'
      );

      return !conflictingBooking;
    } catch (error) {
      logger.error('Error checking engineer availability', {
        engineerId,
        eventDate,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get user bookings
   */
  static getUserBookings = asyncHandler(async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    // Check both models for user
    const user = await User.findById(userId);
    const client = await Client.findById(userId);

    const targetUser = user || client;
    if (!targetUser) {
      throw new NotFoundError('User');
    }

    const bookings = targetUser.bookings || [];
    
    logger.info('User bookings retrieved', {
      userId,
      bookingCount: bookings.length
    });

    return ResponseHandler.success(res, bookings, 'Bookings retrieved successfully');
  });

  /**
   * Cancel booking
   */
  static cancelBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.session.user?.id;

    if (!userId || !bookingId) {
      throw new ValidationError('Missing required information');
    }

    // Check both models for user
    const user = await User.findById(userId);
    const client = await Client.findById(userId);

    const targetUser = user || client;
    if (!targetUser) {
      throw new NotFoundError('User');
    }

    // Find and update booking
    const booking = targetUser.bookings.find(b => b.bookingId === bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    booking.status = 'Cancelled';
    await targetUser.save();

    // If it's a client, also update engineer's booking
    if (client && booking.engineerId) {
      const engineer = await User.findById(booking.engineerId);
      if (engineer) {
        const engineerBooking = engineer.bookings.find(b => b.bookingId === bookingId);
        if (engineerBooking) {
          engineerBooking.status = 'Cancelled';
          await engineer.save();
        }
      }
    }

    logger.info('Booking cancelled successfully', {
      bookingId,
      userId
    });

    return ResponseHandler.success(res, null, 'Booking cancelled successfully');
  });
}

module.exports = BookingController; 