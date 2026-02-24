const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  },
  image: {
    type: String
  }
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide full name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    trim: true
  },
  addressLine1: {
    type: String,
    required: [true, 'Please provide address line 1'],
    trim: true
  },
  addressLine2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Please provide city'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'Please provide state'],
    trim: true
  },
  postalCode: {
    type: String,
    required: [true, 'Please provide postal code'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Please provide country'],
    trim: true,
    default: 'USA'
  }
});

const paymentResultSchema = new mongoose.Schema({
  id: String,
  status: String,
  updateTime: Date,
  emailAddress: String,
  transactionId: String,
  provider: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay', 'cod']
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema,
  paymentMethod: {
    type: String,
    required: [true, 'Please provide payment method'],
    enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'razorpay', 'cod'],
    default: 'cod'
  },
  paymentResult: paymentResultSchema,
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  shippingCost: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  orderStatus: {
    type: String,
    required: true,
    enum: [
      'pending',
      'processing',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'failed'
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'refunded'
    ],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  carrier: {
    type: String,
    trim: true
  },
  estimatedDelivery: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    trim: true
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: {
    type: Date
  },
  invoiceUrl: {
    type: String
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }
  next();
});

// Update timestamps based on status
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    switch (this.orderStatus) {
      case 'delivered':
        this.deliveredAt = Date.now();
        break;
      case 'cancelled':
        this.cancelledAt = Date.now();
        break;
    }
  }

  if (this.isModified('paymentStatus') && this.paymentStatus === 'completed') {
    this.isPaid = true;
    this.paidAt = Date.now();
  }

  next();
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Math.round((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for item count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'processing', 'confirmed'];
  return cancellableStatuses.includes(this.orderStatus) && !this.isPaid;
};

// Method to cancel order
orderSchema.methods.cancel = async function(reason) {
  if (!this.canBeCancelled()) {
    throw new Error('Order cannot be cancelled at this stage');
  }
  
  this.orderStatus = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = Date.now();
  
  return this.save();
};

// Method to process refund
orderSchema.methods.refund = async function(reason) {
  if (this.orderStatus === 'refunded') {
    throw new Error('Order already refunded');
  }
  
  this.orderStatus = 'refunded';
  this.paymentStatus = 'refunded';
  this.notes = reason;
  
  return this.save();
};

// Index for searching
orderSchema.index({ orderNumber: 'text', 'shippingAddress.fullName': 'text' });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;