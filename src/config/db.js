const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.bold);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;