const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1'],
    max: [10, 'Maximum quantity per item is 10']
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
  }
}, { timestamps: true });


const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: [cartItemSchema],

  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },

  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },

  lastModified: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });


// ✅ Pre-save middleware (نسخة نظيفة)
cartSchema.pre('save', function () {

  // تحديث totalPrice ديال كل item
  this.items.forEach(item => {
    item.totalPrice = item.quantity * item.price;
  });

  // حساب subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + item.totalPrice;
  }, 0);

  // تأمين القيم
  const tax = this.tax || 0;
  const shipping = this.shippingCost || 0;
  const discount = this.discount || 0;

  // حساب total
  this.total = this.subtotal + tax + shipping - discount;

  // total ما يكونش سالب
  if (this.total < 0) {
    this.total = 0;
  }

  this.lastModified = Date.now();
});


// ================== METHODS ==================

cartSchema.methods.addItem = async function (productId, quantity, price) {

  const existingItem = this.items.find(
    item => item.product.toString() === productId.toString()
  );

  if (existingItem) {

    existingItem.quantity += quantity;

    if (existingItem.quantity > 10) {
      throw new Error('Maximum quantity per item is 10');
    }

    existingItem.updatedAt = Date.now();

  } else {

    if (quantity > 10) {
      throw new Error('Maximum quantity per item is 10');
    }

    this.items.push({
      product: productId,
      quantity,
      price,
      totalPrice: quantity * price
    });
  }

  return this.save();
};


cartSchema.methods.removeItem = async function (productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId.toString()
  );

  return this.save();
};


cartSchema.methods.updateItemQuantity = async function (productId, newQuantity) {

  const item = this.items.find(
    item => item.product.toString() === productId.toString()
  );

  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (newQuantity <= 0) {
    return this.removeItem(productId);
  }

  if (newQuantity > 10) {
    throw new Error('Maximum quantity per item is 10');
  }

  item.quantity = newQuantity;
  item.updatedAt = Date.now();

  return this.save();
};


cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.couponCode = null;
  this.discount = 0;
  return this.save();
};


cartSchema.methods.isEmpty = function () {
  return this.items.length === 0;
};


cartSchema.methods.getItemCount = function () {
  return this.items.reduce((count, item) => count + item.quantity, 0);
};


// TTL index
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;