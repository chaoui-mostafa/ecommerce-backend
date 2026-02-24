const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'User already exists with this email');
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password
  });

  // Generate token
  const token = generateToken(user._id, user.role);

  // Remove password from output
  const userResponse = user.toObject();
  delete userResponse.password;

  // Send response
  res.status(201).json(
    new ApiResponse(201, {
      user: userResponse,
      token
    }, 'User registered successfully')
  );
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { email, password } = req.body;

  // Check if user exists and get password field
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, 'Your account has been deactivated. Please contact support.');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = generateToken(user._id, user.role);

  // Remove password from output
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(200).json(
    new ApiResponse(200, {
      user: userResponse,
      token
    }, 'Logged in successfully')
  );
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.status(200).json(
    new ApiResponse(200, user, 'User profile retrieved successfully')
  );
});

// @desc    Update user profile
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  
  // Build update object
  const updateData = {};
  if (name) updateData.name = name;
  if (email) {
    // Check if email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      throw new ApiError(400, 'Email already in use');
    }
    updateData.email = email;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json(
    new ApiResponse(200, user, 'Profile updated successfully')
  );
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user._id, user.role);

  res.status(200).json(
    new ApiResponse(200, {
      token
    }, 'Password updated successfully')
  );
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, null, 'Logged out successfully')
  );
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  
  res.status(200).json(
    new ApiResponse(200, users, 'Users retrieved successfully')
  );
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Hard delete or soft delete? Using soft delete here
  user.isActive = false;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, 'User deactivated successfully')
  );
});

module.exports = {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout,
  getAllUsers,
  deleteUser
};