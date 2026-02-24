class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;
    
    // Only add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;