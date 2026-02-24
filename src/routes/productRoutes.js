const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  updateStock
} = require('../controllers/productController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { handleUpload, validateImages } = require('../middlewares/uploadMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
  createProductValidation,
  updateProductValidation,
  productIdValidation,
  getAllProductsValidation
} = require('../validations/productValidation');

// Public routes
router.get('/', getAllProductsValidation, validate, getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', productIdValidation, validate, getProductById);

// Protected routes (require authentication)
router.use(protect);

// Admin only routes
router.post('/',
  restrictTo('admin'),
  handleUpload,
  validateImages,
  createProductValidation,
  validate,
  createProduct
);

router.put('/:id',
  restrictTo('admin'),
  handleUpload,
  updateProductValidation,
  validate,
  updateProduct
);

router.delete('/:id',
  restrictTo('admin'),
  productIdValidation,
  validate,
  deleteProduct
);

router.patch('/:id/stock',
  restrictTo('admin'),
  productIdValidation,
  validate,
  updateStock
);

module.exports = router;