const express = require('express');
const router = express.Router();
const {
  // User endpoints
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getOrderByNumber,
  
  // Admin endpoints
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  processRefund,
  getOrderStatistics,
  deleteOrder
} = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
  createOrderValidation,
  updateOrderStatusValidation,
  updatePaymentStatusValidation,
  orderIdValidation,
  getAllOrdersValidation,
  cancelOrderValidation
} = require('../validations/orderValidation');

// All order routes require authentication
router.use(protect);

// User routes
router.post('/', createOrderValidation, validate, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/number/:orderNumber', getOrderByNumber);
router.get('/:id', orderIdValidation, validate, getOrderById);
router.put('/:id/cancel', cancelOrderValidation, validate, cancelOrder);

// Admin only routes
router.get('/', restrictTo('admin'), getAllOrdersValidation, validate, getAllOrders);
router.get('/statistics/all', restrictTo('admin'), getOrderStatistics);
router.put('/:id/status', restrictTo('admin'), updateOrderStatusValidation, validate, updateOrderStatus);
router.put('/:id/payment', restrictTo('admin'), updatePaymentStatusValidation, validate, updatePaymentStatus);
router.post('/:id/refund', restrictTo('admin'), processRefund);
router.delete('/:id', restrictTo('admin'), orderIdValidation, validate, deleteOrder);

module.exports = router;