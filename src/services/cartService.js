const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

class CartService {

  // ===============================
  // Get or Create Cart
  // ===============================
  static async getOrCreateCart(userId) {

    let cart = await Cart.findOne({
      user: userId,
      isActive: true
    }).populate({
      path: 'items.product',
      select: 'name price images stock isActive'
    });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: []
      });
    }

    await this.validateCartItems(cart);

    // رجع populated version
    return Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price images stock isActive'
    });
  }


  // ===============================
  // Validate Cart Items
  // ===============================
  static async validateCartItems(cart) {

    if (!cart.items.length) return cart;

    const productIds = cart.items.map(item =>
      item.product._id ? item.product._id : item.product
    );

    const products = await Product.find({
      _id: { $in: productIds }
    });

    const productMap = new Map();
    products.forEach(p => productMap.set(p._id.toString(), p));

    const validItems = [];

    for (const item of cart.items) {

      const productId = item.product._id
        ? item.product._id.toString()
        : item.product.toString();

      const product = productMap.get(productId);

      if (!product || !product.isActive || product.stock === 0) {
        continue;
      }

      if (product.stock < item.quantity) {
        item.quantity = product.stock;
      }

      item.price = product.price;
      item.totalPrice = item.quantity * product.price;

      validItems.push(item);
    }

    cart.items = validItems;
    await cart.save();

    return cart;
  }


  // ===============================
  // Shipping
  // ===============================
  static calculateShipping(subtotal) {
    return subtotal >= 100 ? 0 : 10;
  }


  // ===============================
  // Tax
  // ===============================
  static calculateTax(subtotal) {
    const taxRate = 0.10;
    return subtotal * taxRate;
  }


  // ===============================
  // Coupon
  // ===============================
  static async applyCoupon(couponCode, subtotal) {

    const coupons = {
      SAVE10: { type: 'percentage', value: 10 },
      SAVE20: { type: 'percentage', value: 20 },
      FLAT50: { type: 'fixed', value: 50 },
      FREESHIP: { type: 'shipping', value: 0 }
    };

    const code = couponCode.toUpperCase();
    const coupon = coupons[code];

    if (!coupon) {
      throw new ApiError(400, 'Invalid coupon code');
    }

    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
    }

    if (coupon.type === 'fixed') {
      discount = coupon.value;
    }

    if (discount > subtotal * 0.5) {
      discount = subtotal * 0.5;
    }

    return {
      code,
      discount,
      type: coupon.type,
      value: coupon.value
    };
  }


  // ===============================
  // Merge Guest Cart
  // ===============================
  static async mergeCarts(userId, guestCartItems) {

    const userCart = await this.getOrCreateCart(userId);

    for (const guestItem of guestCartItems) {

      if (!mongoose.Types.ObjectId.isValid(guestItem.productId)) continue;

      const product = await Product.findById(guestItem.productId);

      if (!product || !product.isActive || product.stock === 0) continue;

      const quantity = Math.min(
        guestItem.quantity,
        product.stock,
        10
      );

      const existingItem = userCart.items.find(
        item => item.product.toString() === guestItem.productId.toString()
      );

      if (existingItem) {

        existingItem.quantity = Math.min(
          existingItem.quantity + quantity,
          10,
          product.stock
        );

        existingItem.price = product.price;
        existingItem.totalPrice = existingItem.quantity * product.price;

      } else {

        userCart.items.push({
          product: guestItem.productId,
          quantity,
          price: product.price,
          totalPrice: quantity * product.price
        });
      }
    }

    await userCart.save();
    return userCart;
  }
}

module.exports = CartService;