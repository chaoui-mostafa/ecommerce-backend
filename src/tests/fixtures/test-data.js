const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const jwt = require('jsonwebtoken');

const userOneId = new mongoose.Types.ObjectId();
const userOne = {
  _id: userOneId,
  name: 'Existing User',
  email: 'existing@example.com',
  password: 'Password123!' // plain password for login tests
};

let userToken;
let testProduct;

const setupDatabase = async () => {
  await User.deleteMany();
  await Product.deleteMany();

  // Create test user
  const user = await User.create({
    _id: userOneId,
    name: userOne.name,
    email: userOne.email,
    password: userOne.password
  });

  userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // Create test product
  testProduct = await Product.create({
    name: 'Test Product',
    price: 50,
    stock: 100
  });
};

module.exports = { setupDatabase, userOne, userOneId, userToken, testProduct };