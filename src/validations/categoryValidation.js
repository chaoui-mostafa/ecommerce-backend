const { body, param, query } = require('express-validator');

const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Category name can only contain letters, numbers, spaces and hyphens'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Category description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID'),
  
  body('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean'),
  
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive integer'),
  
  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 60 }).withMessage('Meta title cannot exceed 60 characters'),
  
  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters')
];

const updateCategoryValidation = [
  param('id')
    .isMongoId().withMessage('Invalid category ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Category name can only contain letters, numbers, spaces and hyphens'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  
  body('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean'),
  
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive integer'),
  
  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 60 }).withMessage('Meta title cannot exceed 60 characters'),
  
  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters')
];

const categoryIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid category ID')
];

const getAllCategoriesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean')
    .toBoolean(),
  
  query('parent')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID'),
  
  query('includeProducts')
    .optional()
    .isBoolean().withMessage('includeProducts must be a boolean')
    .toBoolean()
];

module.exports = {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
  getAllCategoriesValidation
};