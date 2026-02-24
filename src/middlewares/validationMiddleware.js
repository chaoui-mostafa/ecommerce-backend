const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Validation middleware to check for validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({
    field: err.param,
    message: err.msg
  }));

  throw new ApiError(400, 'Validation failed', extractedErrors);
};

module.exports = { validate };