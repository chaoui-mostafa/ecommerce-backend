require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const AuditLog = require('./models/AuditLog');

const app = express();

/* ======================== TRUST PROXY ======================== */
app.set('trust proxy', 1);

/* ======================== SECURITY HEADERS ======================== */
app.use(helmet());

/* ======================== CORS ======================== */
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000'],
  credentials: true
}));

/* ======================== BODY PARSER ======================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ======================== COOKIE PARSER ======================== */
app.use(cookieParser(process.env.SESSION_SECRET));

/* ======================== SESSION ======================== */
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

/* ======================== RATE LIMIT ======================== */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);

/* ======================== SANITIZATION ======================== */
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

/* ======================== LOGGER ======================== */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* ======================== STATIC ======================== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ======================== HEALTH CHECK ======================== */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server running',
    timestamp: new Date().toISOString()
  });
});

/* ======================== ROUTES ======================== */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);

/* ======================== 404 ======================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/* ======================== ERROR HANDLER ======================== */
app.use(async (err, req, res, next) => {
  console.error(err);

  try {
    await AuditLog.create({
      action: 'ERROR',
      resource: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode || 500,
      ip: req.ip,
      metadata: { message: err.message }
    });
  } catch (e) {
    console.error('Audit log failed');
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;