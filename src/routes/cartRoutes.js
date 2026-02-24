const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  validateCart,
  mergeCart
} = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
  addToCartValidation,
  updateCartItemValidation,
  removeFromCartValidation,
  applyCouponValidation
} = require('../validations/cartValidation');

// All cart routes require authentication
router.use(protect);

// Cart routes
router.get('/', getCart);
router.get('/summary', getCartSummary);
router.get('/validate', validateCart);
router.delete('/', clearCart);

// Cart item routes
router.post('/items', addToCartValidation, validate, addToCart);
router.put('/items/:productId', updateCartItemValidation, validate, updateCartItem);
router.delete('/items/:productId', removeFromCartValidation, validate, removeFromCart);

// Coupon routes
router.post('/coupon', applyCouponValidation, validate, applyCoupon);
router.delete('/coupon', removeCoupon);

// Merge guest cart
router.post('/merge', mergeCart);

module.exports = router;