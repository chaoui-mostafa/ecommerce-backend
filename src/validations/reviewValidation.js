const { body, param, query } = require('express-validator');

const createReviewValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID format'),
  
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  body('title')
    .notEmpty().withMessage('Review title is required')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  
  body('comment')
    .notEmpty().withMessage('Review comment is required')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
  
  body('pros')
    .optional()
    .isArray().withMessage('Pros must be an array'),
  
  body('pros.*')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Each pro cannot exceed 100 characters'),
  
  body('cons')
    .optional()
    .isArray().withMessage('Cons must be an array'),
  
  body('cons.*')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Each con cannot exceed 100 characters'),
  
  body('orderId')
    .optional()
    .isMongoId().withMessage('Invalid order ID format')
];

const updateReviewValidation = [
  param('id')
    .isMongoId().withMessage('Invalid review ID'),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
  
  body('pros')
    .optional()
    .isArray().withMessage('Pros must be an array'),
  
  body('cons')
    .optional()
    .isArray().withMessage('Cons must be an array')
];

const reviewIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid review ID')
];

const productReviewsValidation = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt(),
  
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'highest', 'lowest', 'helpful'])
    .withMessage('Invalid sort option'),
  
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
    .toInt(),
  
  query('hasImages')
    .optional()
    .isBoolean().withMessage('hasImages must be a boolean')
    .toBoolean(),
  
  query('verifiedOnly')
    .optional()
    .isBoolean().withMessage('verifiedOnly must be a boolean')
    .toBoolean()
];

const helpfulValidation = [
  param('id')
    .isMongoId().withMessage('Invalid review ID'),
  
  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['helpful', 'not-helpful']).withMessage('Action must be either helpful or not-helpful')
];

const reportReviewValidation = [
  param('id')
    .isMongoId().withMessage('Invalid review ID'),
  
  body('reason')
    .notEmpty().withMessage('Please provide a reason for reporting')
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Reason must be between 5 and 200 characters')
];

const moderateReviewValidation = [
  param('id')
    .isMongoId().withMessage('Invalid review ID'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['approved', 'rejected', 'flagged']).withMessage('Invalid status'),
  
  body('moderationNote')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Moderation note cannot exceed 200 characters')
];

const sellerReplyValidation = [
  param('id')
    .isMongoId().withMessage('Invalid review ID'),
  
  body('comment')
    .notEmpty().withMessage('Reply comment is required')
    .trim()
    .isLength({ min: 5, max: 500 }).withMessage('Reply must be between 5 and 500 characters')
];

module.exports = {
  createReviewValidation,
  updateReviewValidation,
  reviewIdValidation,
  productReviewsValidation,
  helpfulValidation,
  reportReviewValidation,
  moderateReviewValidation,
  sellerReplyValidation
};