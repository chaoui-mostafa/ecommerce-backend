module.exports = {
  // Rate limiting configuration
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: 'Too many requests from this IP, please try again later.'
  },

  // Auth rate limiting (stricter for auth endpoints)
  authRateLimiting: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 failed attempts per hour
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts. Please try again after an hour.'
  },

  // API key rate limiting
  apiKeyRateLimiting: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10000, // 10,000 requests per day
    message: 'Daily API limit exceeded.'
  },

  // CORS configuration
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://www.yourdomain.com']
      : ['http://localhost:3000', 'http://localhost:5000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Helmet.js configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    expectCt: { maxAge: 86400, enforce: true },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Password policy
  passwordPolicy: {
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventPasswordReuse: 5, // Prevent last 5 passwords
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    expiryWarning: 7 * 24 * 60 * 60 * 1000 // Warn 7 days before expiry
  },

  // JWT configuration
  jwt: {
    accessToken: {
      secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      expiresIn: '15m' // Short-lived access token
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '-refresh',
      expiresIn: '7d' // Longer-lived refresh token
    },
    issuer: 'ecommerce-api',
    audience: 'ecommerce-client'
  },

  // Encryption configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    keylen: 32,
    digest: 'sha256'
  },

  // File upload security
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    scanUploads: true,
    virusScan: process.env.NODE_ENV === 'production'
  },

  // API security headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
};