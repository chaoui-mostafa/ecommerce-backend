const Order = require('../models/Order');
const OrderService = require('../services/orderService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrderFromCart(req.user._id, req.body);

  res.status(201).json(
    new ApiResponse(201, order, 'Order created successfully')
  );
});

// @desc    Get all orders for logged in user
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    orderStatus,
    startDate,
    endDate
  } = req.query;

  // Build query
  const query = { user: req.user._id };
  
  if (orderStatus) {
    query.orderStatus = orderStatus;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const orders = await Order.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(limitNum)
    .select('-adminNotes');

  const total = await Order.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Orders retrieved successfully')
  );
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name price images');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if user is authorized to view this order
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Order retrieved successfully')
  );
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if user is authorized to cancel this order
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to cancel this order');
  }

  if (!order.canBeCancelled()) {
    throw new ApiError(400, 'Order cannot be cancelled at this stage');
  }

  await order.cancel(reason);

  // Restore product stock
  for (const item of order.items) {
    await require('../models/Product').findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Order cancelled successfully')
  );
});

// @desc    Get order by order number
// @route   GET /api/orders/number/:orderNumber
// @access  Private
const getOrderByNumber = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber })
    .populate('user', 'name email')
    .populate('items.product', 'name price images');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if user is authorized
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Order retrieved successfully')
  );
});

// ========== ADMIN ONLY CONTROLLERS ==========

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    orderStatus,
    paymentStatus,
    paymentMethod,
    startDate,
    endDate,
    search,
    sortBy = '-createdAt'
  } = req.query;

  // Build query
  const query = {};
  
  if (orderStatus) query.orderStatus = orderStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const orders = await Order.find(query)
    .populate('user', 'name email')
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const total = await Order.countDocuments(query);

  // Get statistics
  const statistics = await OrderService.getOrderStatistics(startDate, endDate);

  res.status(200).json(
    new ApiResponse(200, {
      orders,
      statistics: statistics,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Orders retrieved successfully')
  );
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, reason, trackingNumber, carrier, estimatedDelivery } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Update order status
  order.orderStatus = orderStatus;
  
  if (reason && orderStatus === 'cancelled') {
    order.cancellationReason = reason;
    order.cancelledAt = Date.now();
  }

  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  if (carrier) {
    order.carrier = carrier;
  }

  if (estimatedDelivery) {
    order.estimatedDelivery = estimatedDelivery;
  }

  // Add admin note
  if (reason) {
    order.adminNotes = reason;
  }

  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Order status updated successfully')
  );
});

// @desc    Update payment status (Admin)
// @route   PUT /api/orders/:id/payment
// @access  Private/Admin
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus, transactionId, paymentProvider } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Update payment status
  order.paymentStatus = paymentStatus;
  
  if (paymentStatus === 'completed') {
    order.isPaid = true;
    order.paidAt = Date.now();
    
    if (!order.paymentResult) {
      order.paymentResult = {};
    }
    
    if (transactionId) {
      order.paymentResult.transactionId = transactionId;
    }
    
    if (paymentProvider) {
      order.paymentResult.provider = paymentProvider;
    }
    
    order.paymentResult.status = 'completed';
    order.paymentResult.updateTime = Date.now();
  }

  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Payment status updated successfully')
  );
});

// @desc    Process refund (Admin)
// @route   POST /api/orders/:id/refund
// @access  Private/Admin
const processRefund = asyncHandler(async (req, res) => {
  const { reason, amount } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.orderStatus === 'refunded') {
    throw new ApiError(400, 'Order already refunded');
  }

  // Process refund logic here (integrate with payment gateway)
  
  order.orderStatus = 'refunded';
  order.paymentStatus = 'refunded';
  order.notes = reason;
  order.adminNotes = `Refund processed: $${amount || order.total}. Reason: ${reason}`;

  await order.save();

  // Restore product stock if needed
  if (req.body.restoreStock) {
    for (const item of order.items) {
      await require('../models/Product').findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Refund processed successfully')
  );
});

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/statistics
// @access  Private/Admin
const getOrderStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const statistics = await OrderService.getOrderStatistics(
    startDate ? new Date(startDate) : null,
    endDate ? new Date(endDate) : null
  );

  res.status(200).json(
    new ApiResponse(200, statistics, 'Order statistics retrieved successfully')
  );
});

// @desc    Delete order (Admin) - Use with caution
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Soft delete or hard delete? Using soft delete with status
  order.orderStatus = 'cancelled';
  order.adminNotes = 'Order deleted by admin';
  await order.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Order deleted successfully')
  );
});

module.exports = {
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
};