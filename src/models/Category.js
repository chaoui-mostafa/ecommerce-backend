const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide category name'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Please provide category description'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    public_id: String,
    url: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Virtual for products count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Create slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Ensure no circular parent reference
categorySchema.pre('save', async function(next) {
  try {
    if (!this.parentCategory) return next();

    const parent = await mongoose.model('Category').findById(this.parentCategory);
    if (!parent) return next(new Error('Parent category not found'));

    // Check for circular reference
    let currentParent = parent;
    while (currentParent) {
      if (currentParent._id.toString() === this._id.toString()) {
        return next(new Error('Circular category reference detected'));
      }
      currentParent = currentParent.parentCategory ?
        await mongoose.model('Category').findById(currentParent.parentCategory) : null;
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;