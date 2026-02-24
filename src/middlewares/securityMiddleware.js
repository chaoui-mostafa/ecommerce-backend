const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const slowDown = require('express-slow-down');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const csrf = require('csurf');
const { v4: uuidv4 } = require('uuid');
const securityConfig = require('../config/securityConfig');
const ApiError = require('../utils/ApiError');
require('dotenv').config(); // make sure .env is loaded

// ======================================================
// GENERAL RATE LIMITER
// ======================================================
const generalLimiter = rateLimit({
  windowMs: securityConfig.rateLimiting?.windowMs || 15 * 60 * 1000,
  max: securityConfig.rateLimiting?.max || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: securityConfig.rateLimiting?.message || 'Too many requests'
  },
  skip: (req) => req.path === '/api/health',
  keyGenerator: (req) => ipKeyGenerator(req) // IPv6 safe
});

// ======================================================
// AUTH RATE LIMITER
// ======================================================
const authLimiter = rateLimit({
  windowMs: securityConfig.authRateLimiting?.windowMs || 15 * 60 * 1000,
  max: securityConfig.authRateLimiting?.max || 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: securityConfig.authRateLimiting?.message || 'Too many login attempts'
  },
  keyGenerator: (req) => {
    if (req.body?.email) return `email-${req.body.email}`;
    return ipKeyGenerator(req); // fallback IPv6 safe
  }
});

// ======================================================
// SPEED LIMITER
// ======================================================
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 200,
  maxDelayMs: 5000
});

// ======================================================
// REQUEST ID
// ======================================================
const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// ======================================================
// SESSION CONFIG
// ======================================================
if (!process.env.MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI is missing in .env. Sessions will use memory store (dev only)");
}

const sessionStore = process.env.MONGODB_URI
  ? MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60
    })
  : undefined;

const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'fallbackSecret',
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Number(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000
  }
});

// ======================================================
// CSRF PROTECTION
// ======================================================
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  return next(new ApiError(403, 'Invalid CSRF token'));
};

// ======================================================
// IP WHITELIST
// ======================================================
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return next(new ApiError(403, 'Access denied from this IP address'));
    }
    next();
  };
};

// ======================================================
// SECURITY HEADERS
// ======================================================
const securityHeaders = (req, res, next) => {
  Object.entries(securityConfig.securityHeaders || {}).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.removeHeader('X-Powered-By');
  next();
};

// ======================================================
// BOT DETECTION
// ======================================================
const botDetection = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const botPatterns = [
    'bot','crawler','spider','scraper','curl','wget',
    'python','java','perl','php','ruby','go-http-client'
  ];
  if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern)) && !req.path.startsWith('/api/public')) {
    console.warn(`Bot detected: ${userAgent} → ${req.path}`);
  }
  next();
};

// ======================================================
// REQUEST SIZE LIMIT
// ======================================================
const requestSizeLimiter = (req, res, next) => {
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > 10 * 1024 * 1024) return next(new ApiError(413, 'Request entity too large'));
  next();
};

// ======================================================
// SQL INJECTION PREVENTION
// ======================================================
const sqlInjectionPrevention = (req, res, next) => {
  const suspiciousPatterns = [
    /\bSELECT\b/i, /\bINSERT\b/i, /\bUPDATE\b/i,
    /\bDELETE\b/i, /\bDROP\b/i, /\bUNION\b/i, /--/, /;/
  ];
  const check = (value) => typeof value === 'string' && suspiciousPatterns.some(p => p.test(value));
  const scan = (obj) => Object.values(obj || {}).some(v => (v && typeof v === 'object' ? scan(v) : check(v)));
  if (scan(req.query) || scan(req.body)) return next(new ApiError(400, 'Invalid input detected'));
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  speedLimiter,
  requestId,
  sessionConfig,
  csrfProtection,
  csrfErrorHandler,
  ipWhitelist,
  securityHeaders,
  botDetection,
  requestSizeLimiter,
  sqlInjectionPrevention
};