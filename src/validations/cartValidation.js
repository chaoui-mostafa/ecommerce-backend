const { body, param, query } = require('express-validator');

const addToCartValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID format'),
  
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
    .toInt()
];

const updateCartItemValidation = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 0, max: 10 }).withMessage('Quantity must be between 0 and 10')
    .toInt()
];

const removeFromCartValidation = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format')
];

const applyCouponValidation = [
  body('couponCode')
    .notEmpty().withMessage('Coupon code is required')
    .isString().withMessage('Coupon code must be a string')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Coupon code must be between 3 and 20 characters')
    .toUpperCase()
];

const cartIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid cart ID format')
];

module.exports = {
  addToCartValidation,
  updateCartItemValidation,
  removeFromCartValidation,
  applyCouponValidation,
  cartIdValidation
};