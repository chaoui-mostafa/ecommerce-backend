const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Protect routes - verify user is authenticated
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookie (if using cookies)
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ApiError(401, 'You are not logged in. Please log in to access this resource.'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new ApiError(401, 'The user belonging to this token no longer exists.'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ApiError(401, 'Your account has been deactivated. Please contact support.'));
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new ApiError(401, 'User recently changed password. Please log in again.'));
    }

    // Grant access
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token. Please log in again.'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Your token has expired. Please log in again.'));
    }
    return next(new ApiError(401, 'Authentication failed. Please log in again.'));
  }
});

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'You are not logged in.'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    
    next();
  };
};

// Optional auth - doesn't require authentication but attaches user if token exists
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }
  
  next();
});

module.exports = {
  protect,
  restrictTo,
  optionalAuth
};