const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters'],
    minlength: [3, 'Product name must be at least 3 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    min: [0, 'Price cannot be negative'],
    max: [1000000, 'Price cannot exceed 1,000,000']
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  category: {
    type: String,
    required: [true, 'Please provide product category'],
    trim: true,
    index: true
  },
  images: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    originalname: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numOfReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  specifications: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false
});

// Index for search functionality
productSchema.index({ 
  name: 'text', 
  description: 'text',
  category: 'text' 
});

// Pre-save middleware to ensure at least one image
productSchema.pre('save', function(next) {
  if (this.images.length === 0) {
    next(new Error('Please upload at least one product image'));
  }
  next();
});

// Method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
  return this.stock >= quantity;
};

// Method to reduce stock
productSchema.methods.reduceStock = async function(quantity) {
  if (this.stock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.stock}, Requested: ${quantity}`);
  }
  this.stock -= quantity;
  await this.save();
  return this.stock;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;