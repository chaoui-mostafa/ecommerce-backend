const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Please provide a review title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Please provide a review comment'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  pros: [{
    type: String,
    trim: true,
    maxlength: [100, 'Pro cannot exceed 100 characters']
  }],
  cons: [{
    type: String,
    trim: true,
    maxlength: [100, 'Con cannot exceed 100 characters']
  }],
  images: [{
    public_id: String,
    url: String,
    caption: String
  }],
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  helpfulUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reported: {
    type: Boolean,
    default: false
  },
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderationNote: {
    type: String,
    trim: true
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    rating: Number,
    title: String,
    comment: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyFromSeller: {
    comment: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: Date,
    isEdited: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure one review per user per product (unless admin override)
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Index for efficient querying
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ helpful: -1 });

// Update product ratings when review is saved
reviewSchema.post('save', async function() {
  await updateProductRatings(this.product);
});

// Update product ratings when review is removed
reviewSchema.post('remove', async function() {
  await updateProductRatings(this.product);
});

// Helper function to update product ratings
async function updateProductRatings(productId) {
  const Review = mongoose.model('Review');
  const Product = mongoose.model('Product');
  
  const stats = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratings: Math.round(stats[0].avgRating * 10) / 10,
      numOfReviews: stats[0].numReviews
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratings: 0,
      numOfReviews: 0
    });
  }
}

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.helpful / total) * 100);
});

// Method to mark as helpful
reviewSchema.methods.markHelpful = async function(userId) {
  if (!this.helpfulUsers.includes(userId)) {
    this.helpfulUsers.push(userId);
    this.helpful += 1;
    await this.save();
  }
  return this;
};

// Method to mark as not helpful
reviewSchema.methods.markNotHelpful = async function(userId) {
  if (!this.helpfulUsers.includes(userId)) {
    this.helpfulUsers.push(userId);
    this.notHelpful += 1;
    await this.save();
  }
  return this;
};

// Method to report review
reviewSchema.methods.report = async function(userId, reason) {
  if (!this.reportedBy.some(r => r.user.toString() === userId.toString())) {
    this.reportedBy.push({
      user: userId,
      reason,
      reportedAt: new Date()
    });
    
    if (this.reportedBy.length >= 3) {
      this.status = 'flagged';
    }
    
    this.reported = true;
    await this.save();
  }
  return this;
};

// Method to add seller reply
reviewSchema.methods.addSellerReply = async function(comment, adminId) {
  this.replyFromSeller = {
    comment,
    repliedBy: adminId,
    repliedAt: new Date(),
    isEdited: false
  };
  await this.save();
  return this;
};

// Method to edit seller reply
reviewSchema.methods.editSellerReply = async function(comment) {
  if (this.replyFromSeller) {
    this.replyFromSeller.comment = comment;
    this.replyFromSeller.isEdited = true;
    await this.save();
  }
  return this;
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;