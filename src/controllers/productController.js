const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/fileUpload');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category, featured, tags, specifications } = req.body;

  // Upload images to Cloudinary
  const uploadedImages = [];
  for (const file of req.files) {
    const result = await uploadToCloudinary(file, 'products');
    uploadedImages.push(result);
  }

  // Create product
  const product = await Product.create({
    name,
    description,
    price,
    stock: stock || 0,
    category,
    images: uploadedImages,
    createdBy: req.user._id,
    featured: featured || false,
    tags: tags || [],
    specifications: specifications || {}
  });

  res.status(201).json(
    new ApiResponse(201, product, 'Product created successfully')
  );
});

// @desc    Get all products with filtering, pagination, and search
// @route   GET /api/products
// @access  Public
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    category,
    minPrice,
    maxPrice,
    search,
    featured,
    inStock
  } = req.query;

  // Build query
  const query = { isActive: true };

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  // Featured filter
  if (featured !== undefined) {
    query.featured = featured;
  }

  // In stock filter
  if (inStock === 'true') {
    query.stock = { $gt: 0 };
  }

  // Search by name or description
  if (search) {
    query.$text = { $search: search };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  // Execute query
  const products = await Product.find(query)
    .populate('createdBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const total = await Product.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      products,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Products retrieved successfully')
  );
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'name'
      }
    });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Increment view count (optional)
  // product.views += 1;
  // await product.save();

  res.status(200).json(
    new ApiResponse(200, product, 'Product retrieved successfully')
  );
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if user is admin or product creator
  if (req.user.role !== 'admin' && product.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not have permission to update this product');
  }

  // Update fields
  const allowedUpdates = ['name', 'description', 'price', 'stock', 'category', 'featured', 'isActive', 'tags', 'specifications'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  // Handle new images if uploaded
  if (req.files && req.files.length > 0) {
    // Upload new images
    const newImages = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file, 'products');
      newImages.push(result);
    }

    // Delete old images from Cloudinary
    for (const image of product.images) {
      await deleteFromCloudinary(image.public_id);
    }

    product.images = newImages;
  }

  await product.save();

  res.status(200).json(
    new ApiResponse(200, product, 'Product updated successfully')
  );
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if user is admin
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can delete products');
  }

  // Delete images from Cloudinary
  for (const image of product.images) {
    await deleteFromCloudinary(image.public_id);
  }

  // Hard delete
  await product.deleteOne();

  res.status(200).json(
    new ApiResponse(200, null, 'Product deleted successfully')
  );
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const products = await Product.find({ 
    category: category,
    isActive: true 
  })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments({ 
    category: category,
    isActive: true 
  });

  res.status(200).json(
    new ApiResponse(200, {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, `Products in category '${category}' retrieved successfully`)
  );
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ 
    featured: true,
    isActive: true 
  })
    .limit(10)
    .sort('-createdAt');

  res.status(200).json(
    new ApiResponse(200, products, 'Featured products retrieved successfully')
  );
});

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private/Admin
const updateStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;

  if (stock === undefined || stock < 0) {
    throw new ApiError(400, 'Please provide a valid stock quantity');
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  product.stock = stock;
  await product.save();

  res.status(200).json(
    new ApiResponse(200, { stock: product.stock }, 'Stock updated successfully')
  );
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  updateStock
};