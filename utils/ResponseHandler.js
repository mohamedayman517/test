/**
 * Response Handler for consistent API responses
 */

class ResponseHandler {
  /**
   * Success Response
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error Response
   */
  static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created Response
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No Content Response
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Validation Error Response
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 400, errors);
  }

  /**
   * Not Found Response
   */
  static notFound(res, resource = 'Resource') {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Unauthorized Response
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden Response
   */
  static forbidden(res, message = 'Access denied') {
    return this.error(res, message, 403);
  }

  /**
   * Conflict Response
   */
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409);
  }

  /**
   * Paginated Response
   */
  static paginated(res, data, page, limit, total, message = 'Data retrieved successfully') {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * File Upload Response
   */
  static fileUploaded(res, fileUrl, message = 'File uploaded successfully') {
    return this.success(res, { fileUrl }, message);
  }

  /**
   * Payment Response
   */
  static paymentSuccess(res, paymentData, message = 'Payment processed successfully') {
    return this.success(res, paymentData, message);
  }

  /**
   * Booking Response
   */
  static bookingCreated(res, bookingData, message = 'Booking created successfully') {
    return this.created(res, bookingData, message);
  }

  /**
   * User Registration Response
   */
  static userRegistered(res, userData, message = 'User registered successfully') {
    return this.created(res, userData, message);
  }

  /**
   * Login Response
   */
  static loginSuccess(res, userData, message = 'Login successful') {
    return this.success(res, userData, message);
  }

  /**
   * Logout Response
   */
  static logoutSuccess(res, message = 'Logout successful') {
    return this.success(res, null, message);
  }
}

module.exports = ResponseHandler; 