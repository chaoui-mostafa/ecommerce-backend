const Cart = require('../models/Cart');
const Product = require('../models/Product');
const CartService = require('../services/cartService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await CartService.getOrCreateCart(req.user._id);

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart retrieved successfully')
  );
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Check if product exists and is active
  const product = await Product.findOne({ _id: productId, isActive: true });
  
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check stock availability
  if (product.stock < quantity) {
    throw new ApiError(400, `Insufficient stock. Only ${product.stock} items available`);
  }

  // Get or create cart
  const cart = await CartService.getOrCreateCart(req.user._id);

  // Check if adding this quantity would exceed max per item
  const existingItem = cart.items.find(
    item => item.product.toString() === productId.toString()
  );
  
  const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
  
  if (newQuantity > 10) {
    throw new ApiError(400, 'Maximum quantity per item is 10');
  }

  // Add item to cart
  await cart.addItem(productId, quantity, product.price);

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name price images stock'
  });

  res.status(200).json(
    new ApiResponse(200, cart, 'Item added to cart successfully')
  );
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  // Get cart
  const cart = await CartService.getOrCreateCart(req.user._id);

  // Find item in cart
  const cartItem = cart.items.find(
    item => item.product.toString() === productId.toString()
  );

  if (!cartItem) {
    throw new ApiError(404, 'Item not found in cart');
  }

  if (quantity === 0) {
    // Remove item if quantity is 0
    await cart.removeItem(productId);
  } else {
    // Check product stock
    const product = await Product.findById(productId);
    
    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.stock < quantity) {
      throw new ApiError(400, `Insufficient stock. Only ${product.stock} items available`);
    }

    // Update quantity
    await cart.updateItemQuantity(productId, quantity);
  }

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name price images stock'
  });

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart updated successfully')
  );
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // Get cart
  const cart = await CartService.getOrCreateCart(req.user._id);

  // Remove item
  await cart.removeItem(productId);

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name price images stock'
  });

  res.status(200).json(
    new ApiResponse(200, cart, 'Item removed from cart successfully')
  );
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  // Get cart
  const cart = await CartService.getOrCreateCart(req.user._id);

  // Clear cart
  await cart.clearCart();

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart cleared successfully')
  );
});

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  // Get cart
  const cart = await CartService.getOrCreateCart(req.user._id);

  if (cart.isEmpty()) {
    throw new ApiError(400, 'Cannot apply coupon to empty cart');
  }

  // Apply coupon
  const couponResult = await CartService.applyCoupon(couponCode, cart.subtotal);

  // Update cart with coupon
  cart.couponCode = couponResult.code;
  cart.discount = couponResult.discount;

  // Recalculate shipping and tax
  cart.shippingCost = CartService.calculateShipping(cart.subtotal - cart.discount);
  cart.tax = CartService.calculateTax(cart.subtotal - cart.discount);

  await cart.save();

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name price images stock'
  });

  res.status(200).json(
    new ApiResponse(200, {
      cart,
      coupon: couponResult
    }, 'Coupon applied successfully')
  );
});

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/coupon
// @access  Private
const removeCoupon = asyncHandler(async (req, res) => {
  // Get cart
  const cart = await CartService.getOrCreateCart(req.user._id);

  // Remove coupon
  cart.couponCode = null;
  cart.discount = 0;

  // Recalculate shipping and tax
  cart.shippingCost = CartService.calculateShipping(cart.subtotal);
  cart.tax = CartService.calculateTax(cart.subtotal);

  await cart.save();

  // Populate product details
  await cart.populate({
    path: 'items.product',
    select: 'name price images stock'
  });

  res.status(200).json(
    new ApiResponse(200, cart, 'Coupon removed successfully')
  );
});

// @desc    Get cart summary (count, subtotal)
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = asyncHandler(async (req, res) => {
  const cart = await CartService.getOrCreateCart(req.user._id);

  const summary = {
    itemCount: cart.getItemCount(),
    uniqueItemsCount: cart.items.length,
    subtotal: cart.subtotal,
    tax: cart.tax,
    shippingCost: cart.shippingCost,
    discount: cart.discount,
    total: cart.total,
    hasCoupon: !!cart.couponCode
  };

  res.status(200).json(
    new ApiResponse(200, summary, 'Cart summary retrieved successfully')
  );
});

// @desc    Validate cart before checkout
// @route   GET /api/cart/validate
// @access  Private
const validateCart = asyncHandler(async (req, res) => {
  const cart = await CartService.getOrCreateCart(req.user._id);

  if (cart.isEmpty()) {
    throw new ApiError(400, 'Cart is empty');
  }

  // Validate all items
  const validationResults = {
    isValid: true,
    issues: [],
    updatedItems: []
  };

  for (const item of cart.items) {
    const product = await Product.findById(item.product._id || item.product);
    
    if (!product || !product.isActive) {
      validationResults.isValid = false;
      validationResults.issues.push({
        productId: item.product._id || item.product,
        issue: 'Product no longer available'
      });
    } else if (product.stock < item.quantity) {
      validationResults.isValid = false;
      validationResults.issues.push({
        productId: item.product._id || item.product,
        issue: `Insufficient stock. Available: ${product.stock}, Requested: ${item.quantity}`
      });
    }
  }

  res.status(200).json(
    new ApiResponse(200, validationResults, 'Cart validation complete')
  );
});

// @desc    Merge guest cart with user cart (after login)
// @route   POST /api/cart/merge
// @access  Private
const mergeCart = asyncHandler(async (req, res) => {
  const { guestCart } = req.body;

  if (!guestCart || !Array.isArray(guestCart)) {
    throw new ApiError(400, 'Invalid guest cart data');
  }

  const cart = await CartService.mergeCarts(req.user._id, guestCart);

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart merged successfully')
  );
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  validateCart,
  mergeCart
};