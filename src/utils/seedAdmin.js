const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: './.env' });

const seedAdmin = async () => {
  try {
    await connectDB(); // reuse your db config

    const adminExists = await User.findOne({
      email: process.env.ADMIN_EMAIL
    });

    if (adminExists) {
      console.log('⚠️ Admin already exists');
      process.exit();
    }

    const admin = await User.create({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin'
    });

    console.log('✅ Admin Created Successfully');
    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedAdmin();