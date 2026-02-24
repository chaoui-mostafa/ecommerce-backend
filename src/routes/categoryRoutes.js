const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  getFeaturedCategories,
  bulkUpdateOrder
} = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
  getAllCategoriesValidation
} = require('../validations/categoryValidation');

// Public routes
router.get('/', getAllCategoriesValidation, validate, getAllCategories);
router.get('/tree', getCategoryTree);
router.get('/featured', getFeaturedCategories);
router.get('/:id', categoryIdValidation, validate, getCategoryById);

// Protected routes (require authentication)
router.use(protect);

// Admin only routes
router.post('/',
  restrictTo('admin'),
  createCategoryValidation,
  validate,
  createCategory
);

router.put('/:id',
  restrictTo('admin'),
  updateCategoryValidation,
  validate,
  updateCategory
);

router.delete('/:id',
  restrictTo('admin'),
  categoryIdValidation,
  validate,
  deleteCategory
);

router.patch('/bulk/order',
  restrictTo('admin'),
  bulkUpdateOrder
);

module.exports = router;