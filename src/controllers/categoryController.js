const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parentCategory, featured, order, metaTitle, metaDescription } = req.body;

  // Check if category already exists
  const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existingCategory) {
    throw new ApiError(400, 'Category with this name already exists');
  }

  // Create category
  const category = await Category.create({
    name,
    description,
    parentCategory: parentCategory || null,
    featured: featured || false,
    order: order || 0,
    metaTitle: metaTitle || name,
    metaDescription: metaDescription || description.substring(0, 160),
    createdBy: req.user._id
  });

  // Populate parent category if exists
  if (category.parentCategory) {
    await category.populate('parentCategory', 'name slug');
  }

  res.status(201).json(
    new ApiResponse(201, category, 'Category created successfully')
  );
});

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getAllCategories = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    featured,
    parent,
    includeProducts = false,
    sort = 'order name'
  } = req.query;

  // Build query
  const query = { isActive: true };
  
  if (featured !== undefined) {
    query.featured = featured;
  }
  
  if (parent === 'null') {
    query.parentCategory = null;
  } else if (parent) {
    query.parentCategory = parent;
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  // Build query with optional population
  let categoriesQuery = Category.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .populate('parentCategory', 'name slug');

  if (includeProducts) {
    categoriesQuery = categoriesQuery.populate({
      path: 'productCount',
      select: 'count'
    });
  }

  const categories = await categoriesQuery;

  // Get total count
  const total = await Category.countDocuments(query);

  // Get category tree structure (if no pagination and not filtering by parent)
  let categoryTree = null;
  if (!parent && parseInt(page) === 1 && !featured) {
    categoryTree = await buildCategoryTree();
  }

  res.status(200).json(
    new ApiResponse(200, {
      categories,
      categoryTree,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Categories retrieved successfully')
  );
});

// @desc    Get single category by ID or slug
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if id is slug or MongoDB ID
  const query = id.match(/^[0-9a-fA-F]{24}$/) 
    ? { _id: id, isActive: true }
    : { slug: id, isActive: true };

  const category = await Category.findOne(query)
    .populate('parentCategory', 'name slug')
    .populate({
      path: 'subcategories',
      match: { isActive: true },
      select: 'name slug description image featured'
    })
    .populate({
      path: 'productCount',
      select: 'count'
    });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Get products in this category
  const products = await Product.find({ 
    category: category.name,
    isActive: true 
  })
    .select('name price images ratings stock')
    .limit(12)
    .sort('-createdAt');

  res.status(200).json(
    new ApiResponse(200, {
      category,
      products,
      productCount: products.length
    }, 'Category retrieved successfully')
  );
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Check if name is being updated and if it already exists
  if (req.body.name && req.body.name.toLowerCase() !== category.name.toLowerCase()) {
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
      _id: { $ne: category._id }
    });
    
    if (existingCategory) {
      throw new ApiError(400, 'Category with this name already exists');
    }
  }

  // Update fields
  const allowedUpdates = ['name', 'description', 'parentCategory', 'isActive', 'featured', 'order', 'metaTitle', 'metaDescription'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      category[field] = req.body[field];
    }
  });

  await category.save();

  // Populate parent category
  if (category.parentCategory) {
    await category.populate('parentCategory', 'name slug');
  }

  res.status(200).json(
    new ApiResponse(200, category, 'Category updated successfully')
  );
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({ category: category.name });
  if (productsCount > 0) {
    throw new ApiError(400, `Cannot delete category with ${productsCount} products. Move or delete products first.`);
  }

  // Check if category has subcategories
  const subcategoriesCount = await Category.countDocuments({ parentCategory: category._id });
  if (subcategoriesCount > 0) {
    throw new ApiError(400, `Cannot delete category with ${subcategoriesCount} subcategories. Delete or reassign subcategories first.`);
  }

  // Soft delete by setting isActive to false
  category.isActive = false;
  await category.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Category deleted successfully')
  );
});

// @desc    Get category tree structure
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = asyncHandler(async (req, res) => {
  const tree = await buildCategoryTree();
  
  res.status(200).json(
    new ApiResponse(200, tree, 'Category tree retrieved successfully')
  );
});

// @desc    Get featured categories
// @route   GET /api/categories/featured
// @access  Public
const getFeaturedCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ 
    featured: true,
    isActive: true 
  })
    .select('name slug description image order')
    .sort('order')
    .limit(10);

  res.status(200).json(
    new ApiResponse(200, categories, 'Featured categories retrieved successfully')
  );
});

// @desc    Bulk update categories order
// @route   PATCH /api/categories/bulk/order
// @access  Private/Admin
const bulkUpdateOrder = asyncHandler(async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    throw new ApiError(400, 'Categories must be an array');
  }

  const bulkOps = categories.map(cat => ({
    updateOne: {
      filter: { _id: cat.id },
      update: { $set: { order: cat.order } }
    }
  }));

  await Category.bulkWrite(bulkOps);

  res.status(200).json(
    new ApiResponse(200, null, 'Categories order updated successfully')
  );
});

// Helper function to build category tree
async function buildCategoryTree() {
  const categories = await Category.find({ isActive: true })
    .select('name slug description image featured order parentCategory')
    .lean();

  const categoryMap = {};
  const tree = [];

  // Create map of categories
  categories.forEach(category => {
    categoryMap[category._id] = { ...category, children: [] };
  });

  // Build tree structure
  categories.forEach(category => {
    if (category.parentCategory && categoryMap[category.parentCategory]) {
      categoryMap[category.parentCategory].children.push(categoryMap[category._id]);
    } else {
      tree.push(categoryMap[category._id]);
    }
  });

  // Sort by order
  const sortByOrder = (a, b) => (a.order || 0) - (b.order || 0);
  tree.sort(sortByOrder);
  
  const sortChildren = (node) => {
    if (node.children) {
      node.children.sort(sortByOrder);
      node.children.forEach(sortChildren);
    }
  };
  
  tree.forEach(sortChildren);

  return tree;
}

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  getFeaturedCategories,
  bulkUpdateOrder
};