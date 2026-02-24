const { upload } = require('../utils/fileUpload');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Handle multiple file uploads
const uploadProductImages = upload.array('images', 5);

// Middleware to handle upload errors
const handleUpload = (req, res, next) => {
  uploadProductImages(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, 'File too large. Max size is 5MB'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new ApiError(400, 'Too many files. Max 5 files allowed'));
      }
      return next(new ApiError(400, err.message));
    }
    next();
  });
};

// Validate that files were uploaded
const validateImages = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ApiError(400, 'Please upload at least one product image'));
  }
  next();
};

module.exports = {
  handleUpload,
  validateImages
};