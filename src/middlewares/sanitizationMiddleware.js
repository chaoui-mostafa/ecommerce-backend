const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');

// MongoDB injection sanitization
const sanitizeMongo = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential MongoDB injection attempt detected at ${key}`);
  }
});

// XSS sanitization
const sanitizeXSS = xss();

// HTTP Parameter Pollution protection
const sanitizeHPP = hpp({
  whitelist: [
    'page',
    'limit',
    'sort',
    'fields',
    'category',
    'price',
    'rating',
    'tags'
  ]
});

// Custom sanitization for user input
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove any HTML tags
        req.query[key] = req.query[key].replace(/<[^>]*>/g, '');
        // Escape special characters
        req.query[key] = validator.escape(req.query[key]);
        // Trim whitespace
        req.query[key] = req.query[key].trim();
      }
    });
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

// Helper function to recursively sanitize objects
const sanitizeObject = (obj) => {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      // Remove any HTML tags
      obj[key] = obj[key].replace(/<[^>]*>/g, '');
      // Escape special characters but preserve JSON structure
      obj[key] = validator.escape(obj[key]);
      // Trim whitespace
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  });
};

// Email sanitization
const sanitizeEmail = (req, res, next) => {
  if (req.body.email) {
    req.body.email = validator.normalizeEmail(req.body.email, {
      all_lowercase: true,
      gmail_lowercase: true,
      gmail_remove_dots: true,
      gmail_remove_subaddress: true,
      gmail_convert_googlemaildotcom: true,
      outlookdotcom_lowercase: true,
      outlookdotcom_remove_subaddress: true,
      yahoo_lowercase: true,
      yahoo_remove_subaddress: true,
      icloud_lowercase: true,
      icloud_remove_subaddress: true
    });
  }
  next();
};

// Phone number sanitization
const sanitizePhone = (req, res, next) => {
  if (req.body.phone || req.body.shippingAddress?.phone) {
    const phone = req.body.phone || req.body.shippingAddress?.phone;
    // Remove all non-digit characters except + and -
    const sanitized = phone.replace(/[^\d+\-()\s]/g, '').trim();
    
    if (req.body.phone) {
      req.body.phone = sanitized;
    }
    if (req.body.shippingAddress?.phone) {
      req.body.shippingAddress.phone = sanitized;
    }
  }
  next();
};

// URL sanitization
const sanitizeUrl = (req, res, next) => {
  const urlFields = ['image', 'avatar', 'profilePicture', 'website'];
  
  urlFields.forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      // Validate URL format
      if (!validator.isURL(req.body[field], {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true
      })) {
        req.body[field] = '';
      }
    }
  });
  
  next();
};

// File name sanitization
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '') // Remove special characters
    .replace(/\.\./g, '.') // Prevent directory traversal
    .trim();
};

// HTML content sanitization (for rich text fields)
const sanitizeHtml = (html) => {
  if (!html) return html;
  
  // Allow only safe HTML tags
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];
  
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  html = html.replace(/\s*on\w+="[^"]*"/g, '');
  
  // Remove javascript: links
  html = html.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  
  return html;
};

module.exports = {
  sanitizeMongo,
  sanitizeXSS,
  sanitizeHPP,
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeHtml
};