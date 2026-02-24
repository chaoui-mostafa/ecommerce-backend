const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout,
  getAllUsers,
  deleteUser
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  updatePasswordValidation
} = require('../validations/authValidation');

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

// Protected routes
router.use(protect); // All routes below this line require authentication

router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePasswordValidation, validate, updatePassword);
router.post('/logout', logout);

// Admin only routes
router.get('/users', restrictTo('admin'), getAllUsers);
router.delete('/users/:id', restrictTo('admin'), deleteUser);

module.exports = router;