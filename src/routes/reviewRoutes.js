const express = require('express');
const router = express.Router();
const {
  // User endpoints
  createReview,
  getProductReviews,
  getReviewById,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  getMyReviews,
  
  // Admin endpoints
  addSellerReply,
  editSellerReply,
  moderateReview,
  getFlaggedReviews,
  getPendingReviews,
  bulkApproveReviews,
  getReviewAnalytics
} = require('../controllers/reviewController');
const { protect, restrictTo, optionalAuth } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
  createReviewValidation,
  updateReviewValidation,
  reviewIdValidation,
  productReviewsValidation,
  helpfulValidation,
  reportReviewValidation,
  moderateReviewValidation,
  sellerReplyValidation
} = require('../validations/reviewValidation');

// Public routes (with optional auth for helpful marking)
router.get('/product/:productId', productReviewsValidation, validate, getProductReviews);
router.get('/:id', reviewIdValidation, validate, optionalAuth, getReviewById);

// Protected user routes
router.use(protect);

router.post('/', createReviewValidation, validate, createReview);
router.get('/user/me', getMyReviews);
router.put('/:id', updateReviewValidation, validate, updateReview);
router.delete('/:id', reviewIdValidation, validate, deleteReview);
router.post('/:id/helpful', helpfulValidation, validate, markHelpful);
router.post('/:id/report', reportReviewValidation, validate, reportReview);

// Admin only routes
router.post('/:id/reply', restrictTo('admin'), sellerReplyValidation, validate, addSellerReply);
router.put('/:id/reply', restrictTo('admin'), sellerReplyValidation, validate, editSellerReply);
router.put('/:id/moderate', restrictTo('admin'), moderateReviewValidation, validate, moderateReview);
router.get('/flagged/all', restrictTo('admin'), getFlaggedReviews);
router.get('/pending/all', restrictTo('admin'), getPendingReviews);
router.post('/bulk-approve', restrictTo('admin'), bulkApproveReviews);
router.get('/analytics/overview', restrictTo('admin'), getReviewAnalytics);

module.exports = router;