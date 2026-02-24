const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const securityConfig = require('../config/securityConfig');

// Generate secure random token
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

// Generate API key
const generateApiKey = () => {
  const prefix = 'pk_';
  const random = crypto.randomBytes(24).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32);
  return prefix + random;
};

// Generate secret key
const generateSecretKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash data with salt
const hashData = (data, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  
  const hash = crypto.pbkdf2Sync(
    data,
    salt,
    securityConfig.encryption.iterations,
    securityConfig.encryption.keylen,
    securityConfig.encryption.digest
  ).toString('hex');
  
  return { hash, salt };
};

// Verify hashed data
const verifyHash = (data, hash, salt) => {
  const { hash: newHash } = hashData(data, salt);
  return crypto.timingSafeEqual(
    Buffer.from(newHash),
    Buffer.from(hash)
  );
};

// Encrypt sensitive data
const encrypt = (text, key = null) => {
  if (!key) {
    key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key',
      'salt',
      32
    );
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    securityConfig.encryption.algorithm,
    key,
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Decrypt sensitive data
const decrypt = (encryptedData, key = null) => {
  if (!key) {
    key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key',
      'salt',
      32
    );
  }
  
  const decipher = crypto.createDecipheriv(
    securityConfig.encryption.algorithm,
    key,
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < securityConfig.passwordPolicy.minLength) {
    errors.push(`Password must be at least ${securityConfig.passwordPolicy.minLength} characters`);
  }
  
  if (password.length > securityConfig.passwordPolicy.maxLength) {
    errors.push(`Password cannot exceed ${securityConfig.passwordPolicy.maxLength} characters`);
  }
  
  if (securityConfig.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (securityConfig.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (securityConfig.passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (securityConfig.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

// Generate HMAC signature
const generateHMAC = (data, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
};

// Verify HMAC signature
const verifyHMAC = (data, signature, secret) => {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
    .replace(/\.\./g, '.')
    .substring(0, 255);
};

// Detect potential attacks
const detectAttack = (req) => {
  const attacks = [];
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] || req.ip;
  
  // Check for SQL injection patterns
  const sqlPattern = /(\bSELECT\b.*\bFROM\b)|(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)/i;
  if (sqlPattern.test(JSON.stringify(req.query)) || sqlPattern.test(JSON.stringify(req.body))) {
    attacks.push('SQL_INJECTION');
  }
  
  // Check for XSS patterns
  const xssPattern = /<script|javascript:|onerror=|onload=/i;
  if (xssPattern.test(JSON.stringify(req.query)) || xssPattern.test(JSON.stringify(req.body))) {
    attacks.push('XSS');
  }
  
  // Check for path traversal
  const pathTraversalPattern = /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i;
  if (pathTraversalPattern.test(req.path)) {
    attacks.push('PATH_TRAVERSAL');
  }
  
  // Check for suspicious user agents
  const suspiciousUA = ['sqlmap', 'nikto', 'nmap', 'hydra'];
  if (suspiciousUA.some(ua => userAgent.toLowerCase().includes(ua))) {
    attacks.push('SUSPICIOUS_USER_AGENT');
  }
  
  // Check for rate limit bypass attempts
  if (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',').length > 3) {
    attacks.push('PROXY_CHAIN');
  }
  
  return {
    detected: attacks.length > 0,
    attacks,
    ip,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  generateSecureToken,
  generateApiKey,
  generateSecretKey,
  hashData,
  verifyHash,
  encrypt,
  decrypt,
  validatePasswordStrength,
  generateOTP,
  generateHMAC,
  verifyHMAC,
  sanitizeFilename,
  detectAttack
};