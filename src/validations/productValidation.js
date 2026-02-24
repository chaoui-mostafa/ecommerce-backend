const { body, param, query } = require('express-validator');

const createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Product name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between 0 and 1,000,000'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a positive integer')
    .toInt(),
  
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),
  
  body('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString().withMessage('Each tag must be a string')
    .trim()
    .notEmpty().withMessage('Tag cannot be empty'),
  
  body('specifications')
    .optional()
    .isObject().withMessage('Specifications must be an object')
];

const updateProductValidation = [
  param('id')
    .isMongoId().withMessage('Invalid product ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Product name must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between 0 and 1,000,000'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a positive integer')
    .toInt(),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  
  body('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean')
];

const productIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid product ID')
];

const getAllProductsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sort')
    .optional()
    .isString().withMessage('Sort must be a string'),
  
  query('category')
    .optional()
    .isString().withMessage('Category must be a string'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Min price must be a positive number')
    .toFloat(),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Max price must be a positive number')
    .toFloat(),
  
  query('search')
    .optional()
    .isString().withMessage('Search term must be a string')
    .trim(),
  
  query('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean')
    .toBoolean()
];

module.exports = {
  createProductValidation,
  updateProductValidation,
  productIdValidation,
  getAllProductsValidation
};