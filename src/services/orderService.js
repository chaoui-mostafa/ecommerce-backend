const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

class OrderService {
  
  // Create order from cart
  static async createOrderFromCart(userId, orderData) {
    // Get user cart
    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    // Validate stock for all items
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      
      if (!product || !product.isActive) {
        throw new ApiError(400, `Product ${item.product.name} is no longer available`);
      }
      
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${item.product.name}. Available: ${product.stock}`);
      }
    }

    // Prepare order items
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      image: item.product.images && item.product.images.length > 0 
        ? item.product.images[0].url 
        : null
    }));

    // Use shipping address as billing address if not provided
    const billingAddress = orderData.billingAddress || orderData.shippingAddress;

    // Create order
    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress: orderData.shippingAddress,
      billingAddress,
      paymentMethod: orderData.paymentMethod,
      subtotal: cart.subtotal,
      tax: cart.tax,
      shippingCost: cart.shippingCost,
      discount: cart.discount,
      couponCode: cart.couponCode,
      total: cart.total,
      notes: orderData.notes,
      metadata: orderData.metadata
    });

    // Reduce stock for ordered products
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear the cart
    cart.items = [];
    cart.couponCode = null;
    cart.discount = 0;
    await cart.save();

    return order;
  }

  // Generate order statistics
  static async getOrderStatistics(startDate, endDate) {
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$total' },
                averageOrderValue: { $avg: '$total' },
                totalItems: { $sum: { $sum: '$items.quantity' } },
                totalDiscount: { $sum: '$discount' },
                totalTax: { $sum: '$tax' },
                totalShipping: { $sum: '$shippingCost' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$orderStatus',
                count: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            }
          ],
          byPaymentStatus: [
            {
              $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            }
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            }
          ],
          daily: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
            { $limit: 30 }
          ]
        }
      }
    ]);

    return stats[0];
  }

  // Process payment (mock implementation)
  static async processPayment(order, paymentDetails) {
    // This would integrate with actual payment gateway
    // For now, simulate payment processing
    
    const paymentResult = {
      id: `PAY-${Date.now()}`,
      status: 'completed',
      updateTime: new Date(),
      transactionId: `TXN-${Math.random().toString(36).substring(7).toUpperCase()}`,
      provider: paymentDetails.provider || order.paymentMethod
    };

    // Update order with payment result
    order.paymentResult = paymentResult;
    order.paymentStatus = 'completed';
    order.isPaid = true;
    order.paidAt = Date.now();
    
    if (order.orderStatus === 'pending') {
      order.orderStatus = 'processing';
    }

    await order.save();
    
    return paymentResult;
  }

  // Generate invoice number
  static generateInvoiceNumber(orderNumber) {
    return `INV-${orderNumber.replace('ORD-', '')}`;
  }

  // Check if order is eligible for cancellation
  static canCancelOrder(order) {
    const cancellableStatuses = ['pending', 'processing', 'confirmed'];
    return cancellableStatuses.includes(order.orderStatus);
  }

  // Calculate refund amount based on order status
  static calculateRefundAmount(order, refundType = 'full') {
    if (refundType === 'full') {
      return order.total;
    } else if (refundType === 'partial') {
      // Partial refund logic here
      return order.total * 0.5; // Example: 50% refund
    }
    return 0;
  }
}

module.exports = OrderService;