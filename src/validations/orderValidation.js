const { body, param, query } = require('express-validator');

const createOrderValidation = [
  body('shippingAddress')
    .notEmpty().withMessage('Shipping address is required')
    .isObject().withMessage('Shipping address must be an object'),
  
  body('shippingAddress.fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Full name must be between 3 and 50 characters'),
  
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Please provide a valid phone number'),
  
  body('shippingAddress.addressLine1')
    .trim()
    .notEmpty().withMessage('Address line 1 is required')
    .isLength({ min: 5, max: 100 }).withMessage('Address must be between 5 and 100 characters'),
  
  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters'),
  
  body('shippingAddress.state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters'),
  
  body('shippingAddress.postalCode')
    .trim()
    .notEmpty().withMessage('Postal code is required')
    .matches(/^[0-9]{5}(-[0-9]{4})?$/).withMessage('Please provide a valid postal code'),
  
  body('shippingAddress.country')
    .trim()
    .notEmpty().withMessage('Country is required')
    .isLength({ min: 2, max: 50 }).withMessage('Country must be between 2 and 50 characters'),
  
  body('billingAddress')
    .optional()
    .isObject().withMessage('Billing address must be an object'),
  
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'razorpay', 'cod'])
    .withMessage('Invalid payment method'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  
  body('couponCode')
    .optional()
    .trim()
    .isString().withMessage('Coupon code must be a string')
    .toUpperCase()
];

const updateOrderStatusValidation = [
  param('id')
    .isMongoId().withMessage('Invalid order ID'),
  
  body('orderStatus')
    .notEmpty().withMessage('Order status is required')
    .isIn(['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters'),
  
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Tracking number cannot exceed 50 characters'),
  
  body('carrier')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Carrier cannot exceed 50 characters'),
  
  body('estimatedDelivery')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .toDate()
];

const updatePaymentStatusValidation = [
  param('id')
    .isMongoId().withMessage('Invalid order ID'),
  
  body('paymentStatus')
    .notEmpty().withMessage('Payment status is required')
    .isIn(['pending', 'processing', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  
  body('transactionId')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Transaction ID cannot exceed 100 characters'),
  
  body('paymentProvider')
    .optional()
    .isIn(['stripe', 'paypal', 'razorpay', 'cod'])
    .withMessage('Invalid payment provider')
];

const orderIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid order ID')
];

const getAllOrdersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('orderStatus')
    .optional()
    .isIn(['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format')
    .toDate(),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .toDate(),
  
  query('search')
    .optional()
    .isString().withMessage('Search term must be a string')
    .trim()
];

const cancelOrderValidation = [
  param('id')
    .isMongoId().withMessage('Invalid order ID'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
];

module.exports = {
  createOrderValidation,
  updateOrderStatusValidation,
  updatePaymentStatusValidation,
  orderIdValidation,
  getAllOrdersValidation,
  cancelOrderValidation
};