const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');

class ReviewService {
  
  // Check if user has purchased the product
  static async hasUserPurchasedProduct(userId, productId) {
    const orders = await Order.find({
      user: userId,
      orderStatus: 'delivered',
      'items.product': productId
    });
    
    return orders.length > 0;
  }

  // Get review statistics for a product
  static async getProductReviewStats(productId) {
    const stats = await Review.aggregate([
      { $match: { product: productId, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingCounts: {
            $push: '$rating'
          },
          totalHelpful: { $sum: '$helpful' },
          withImages: {
            $sum: { $cond: [{ $gt: [{ $size: '$images' }, 0] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          averageRating: { $round: ['$averageRating', 1] },
          totalReviews: 1,
          totalHelpful: 1,
          withImages: 1,
          ratingBreakdown: {
            5: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 5] } } } },
            4: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 4] } } } },
            3: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 3] } } } },
            2: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 2] } } } },
            1: { $size: { $filter: { input: '$ratingCounts', cond: { $eq: ['$$this', 1] } } } }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        totalHelpful: 0,
        withImages: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    return stats[0];
  }

  // Get recent reviews for a product
  static async getRecentReviews(productId, limit = 5) {
    return Review.find({ 
      product: productId, 
      status: 'approved' 
    })
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(limit);
  }

  // Get top helpful reviews
  static async getTopHelpfulReviews(productId, limit = 3) {
    return Review.find({ 
      product: productId, 
      status: 'approved' 
    })
      .populate('user', 'name')
      .sort('-helpful')
      .limit(limit);
  }

  // Check if user has already reviewed this product
  static async hasUserReviewed(userId, productId) {
    const review = await Review.findOne({ user: userId, product: productId });
    return !!review;
  }

  // Get user's review for a specific product
  static async getUserReviewForProduct(userId, productId) {
    return Review.findOne({ user: userId, product: productId })
      .populate('product', 'name images');
  }

  // Get all reviews by user
  static async getUserReviews(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ user: userId })
      .populate('product', 'name images price')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    const total = await Review.countDocuments({ user: userId });
    
    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Moderate reviews (admin)
  static async moderateReview(reviewId, status, moderationNote, adminId) {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    review.status = status;
    review.moderationNote = moderationNote;
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();

    await review.save();
    return review;
  }

  // Get flagged reviews (admin)
  static async getFlaggedReviews() {
    return Review.find({ 
      $or: [
        { status: 'flagged' },
        { reported: true }
      ]
    })
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort('-createdAt');
  }

  // Bulk approve reviews (admin)
  static async bulkApproveReviews(reviewIds) {
    await Review.updateMany(
      { _id: { $in: reviewIds } },
      { 
        $set: { 
          status: 'approved',
          moderatedAt: new Date()
        }
      }
    );
  }

  // Calculate helpful percentage
  static calculateHelpfulPercentage(helpful, notHelpful) {
    const total = helpful + notHelpful;
    if (total === 0) return 0;
    return Math.round((helpful / total) * 100);
  }

  // Get review trends over time
  static async getReviewTrends(productId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await Review.aggregate([
      {
        $match: {
          product: productId,
          status: 'approved',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return trends;
  }
}

module.exports = ReviewService;