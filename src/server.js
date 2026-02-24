const dotenv = require('dotenv');
const colors = require('colors');
const app = require('./app');
const connectDB = require('./config/db');

// 🔥 FIX ENV PATH
dotenv.config({ path: './.env' });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...'.red.bold);
  console.error(err.name, err.message);
  process.exit(1);
});

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      .yellow.bold
  );
});

// Handle rejection
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...'.red.bold);
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});