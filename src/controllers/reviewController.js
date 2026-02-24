const Review = require('../models/Review');
const Product = require('../models/Product');
const ReviewService = require('../services/reviewService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment, pros, cons, orderId } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    user: req.user._id,
    product: productId
  });

  if (existingReview) {
    throw new ApiError(400, 'You have already reviewed this product');
  }

  // Check if user has purchased the product (optional verification)
  const hasPurchased = await ReviewService.hasUserPurchasedProduct(
    req.user._id,
    productId
  );

  // Create review
  const review = await Review.create({
    user: req.user._id,
    product: productId,
    order: orderId,
    rating,
    title,
    comment,
    pros: pros || [],
    cons: cons || [],
    verifiedPurchase: hasPurchased,
    status: 'pending' // Requires moderation
  });

  // Populate user info
  await review.populate('user', 'name');

  res.status(201).json(
    new ApiResponse(201, review, 'Review created successfully. It will be visible after moderation.')
  );
});

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const {
    page = 1,
    limit = 10,
    sort = 'helpful',
    rating,
    hasImages,
    verifiedOnly
  } = req.query;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Build query
  const query = { 
    product: productId, 
    status: 'approved' 
  };

  if (rating) {
    query.rating = rating;
  }

  if (hasImages) {
    query.images = { $ne: [] };
  }

  if (verifiedOnly) {
    query.verifiedPurchase = true;
  }

  // Determine sort order
  let sortOption = {};
  switch (sort) {
    case 'newest':
      sortOption = { createdAt: -1 };
      break;
    case 'oldest':
      sortOption = { createdAt: 1 };
      break;
    case 'highest':
      sortOption = { rating: -1, helpful: -1 };
      break;
    case 'lowest':
      sortOption = { rating: 1, helpful: -1 };
      break;
    case 'helpful':
    default:
      sortOption = { helpful: -1, createdAt: -1 };
      break;
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const reviews = await Review.find(query)
    .populate('user', 'name')
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum);

  const total = await Review.countDocuments(query);

  // Get review statistics
  const stats = await ReviewService.getProductReviewStats(productId);

  res.status(200).json(
    new ApiResponse(200, {
      reviews,
      statistics: stats,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Product reviews retrieved successfully')
  );
});

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
const getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('user', 'name')
    .populate('product', 'name images');

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Only show approved reviews to public
  if (review.status !== 'approved' && 
      (!req.user || (req.user.role !== 'admin' && review.user.toString() !== req.user._id.toString()))) {
    throw new ApiError(404, 'Review not found');
  }

  res.status(200).json(
    new ApiResponse(200, review, 'Review retrieved successfully')
  );
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if user owns the review
  if (review.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized to update this review');
  }

  // Save edit history
  review.editHistory.push({
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    editedAt: new Date()
  });

  // Update fields
  const allowedUpdates = ['rating', 'title', 'comment', 'pros', 'cons'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      review[field] = req.body[field];
    }
  });

  review.isEdited = true;
  review.status = 'pending'; // Require re-moderation after edit

  await review.save();
  await review.populate('user', 'name');

  res.status(200).json(
    new ApiResponse(200, review, 'Review updated successfully. It will be visible after moderation.')
  );
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if user owns the review or is admin
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this review');
  }

  await review.deleteOne();

  res.status(200).json(
    new ApiResponse(200, null, 'Review deleted successfully')
  );
});

// @desc    Mark review as helpful/not helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = asyncHandler(async (req, res) => {
  const { action } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if user already marked this review
  if (review.helpfulUsers.includes(req.user._id)) {
    throw new ApiError(400, 'You have already voted on this review');
  }

  if (action === 'helpful') {
    await review.markHelpful(req.user._id);
  } else {
    await review.markNotHelpful(req.user._id);
  }

  res.status(200).json(
    new ApiResponse(200, {
      helpful: review.helpful,
      notHelpful: review.notHelpful,
      helpfulPercentage: review.helpfulPercentage
    }, 'Thank you for your feedback')
  );
});

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Check if user already reported this review
  if (review.reportedBy.some(r => r.user.toString() === req.user._id.toString())) {
    throw new ApiError(400, 'You have already reported this review');
  }

  await review.report(req.user._id, reason);

  res.status(200).json(
    new ApiResponse(200, null, 'Review reported successfully')
  );
});

// @desc    Get user's reviews
// @route   GET /api/reviews/user/me
// @access  Private
const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await ReviewService.getUserReviews(
    req.user._id,
    parseInt(page),
    parseInt(limit)
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Your reviews retrieved successfully')
  );
});

// ========== SELLER/ADMIN ROUTES ==========

// @desc    Add seller reply to review
// @route   POST /api/reviews/:id/reply
// @access  Private/Admin
const addSellerReply = asyncHandler(async (req, res) => {
  const { comment } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (review.replyFromSeller) {
    throw new ApiError(400, 'A reply already exists for this review');
  }

  await review.addSellerReply(comment, req.user._id);

  res.status(200).json(
    new ApiResponse(200, review, 'Reply added successfully')
  );
});

// @desc    Edit seller reply
// @route   PUT /api/reviews/:id/reply
// @access  Private/Admin
const editSellerReply = asyncHandler(async (req, res) => {
  const { comment } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (!review.replyFromSeller) {
    throw new ApiError(400, 'No reply exists for this review');
  }

  await review.editSellerReply(comment);

  res.status(200).json(
    new ApiResponse(200, review, 'Reply updated successfully')
  );
});

// @desc    Moderate review (Admin)
// @route   PUT /api/reviews/:id/moderate
// @access  Private/Admin
const moderateReview = asyncHandler(async (req, res) => {
  const { status, moderationNote } = req.body;

  const review = await ReviewService.moderateReview(
    req.params.id,
    status,
    moderationNote,
    req.user._id
  );

  res.status(200).json(
    new ApiResponse(200, review, `Review ${status} successfully`)
  );
});

// @desc    Get flagged reviews (Admin)
// @route   GET /api/reviews/flagged
// @access  Private/Admin
const getFlaggedReviews = asyncHandler(async (req, res) => {
  const reviews = await ReviewService.getFlaggedReviews();

  res.status(200).json(
    new ApiResponse(200, reviews, 'Flagged reviews retrieved successfully')
  );
});

// @desc    Get pending reviews (Admin)
// @route   GET /api/reviews/pending
// @access  Private/Admin
const getPendingReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ status: 'pending' })
    .populate('user', 'name email')
    .populate('product', 'name')
    .sort('-createdAt');

  res.status(200).json(
    new ApiResponse(200, reviews, 'Pending reviews retrieved successfully')
  );
});

// @desc    Bulk approve reviews (Admin)
// @route   POST /api/reviews/bulk-approve
// @access  Private/Admin
const bulkApproveReviews = asyncHandler(async (req, res) => {
  const { reviewIds } = req.body;

  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw new ApiError(400, 'Please provide an array of review IDs');
  }

  await ReviewService.bulkApproveReviews(reviewIds);

  res.status(200).json(
    new ApiResponse(200, null, `${reviewIds.length} reviews approved successfully`)
  );
});

// @desc    Get review analytics (Admin)
// @route   GET /api/reviews/analytics
// @access  Private/Admin
const getReviewAnalytics = asyncHandler(async (req, res) => {
  const { productId, days = 30 } = req.query;

  let analytics = {};

  if (productId) {
    // Analytics for specific product
    analytics = {
      stats: await ReviewService.getProductReviewStats(productId),
      trends: await ReviewService.getReviewTrends(productId, days)
    };
  } else {
    // Overall analytics
    const totalReviews = await Review.countDocuments();
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const approvedReviews = await Review.countDocuments({ status: 'approved' });
    const flaggedReviews = await Review.countDocuments({ status: 'flagged' });
    
    const averageRating = await Review.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    analytics = {
      total: totalReviews,
      pending: pendingReviews,
      approved: approvedReviews,
      flagged: flaggedReviews,
      averageRating: averageRating.length > 0 ? averageRating[0].avg : 0
    };
  }

  res.status(200).json(
    new ApiResponse(200, analytics, 'Review analytics retrieved successfully')
  );
});

module.exports = {
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
};