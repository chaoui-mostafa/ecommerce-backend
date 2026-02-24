const AuditLog = require('../models/AuditLog');

// Audit logging middleware
const auditLog = (action) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    let responseBody;

    // Override send function to capture response
    res.send = function(body) {
      responseBody = body;
      originalSend.call(this, body);
    };

    // Continue to next middleware
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        // Only log certain actions
        const shouldLog = shouldLogAction(req.method, req.path);
        
        if (shouldLog && req.user) {
          await AuditLog.create({
            user: req.user._id,
            action: action || getActionFromRequest(req),
            resource: req.baseUrl || req.path,
            resourceId: req.params.id || null,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            ip: req.headers['x-forwarded-for'] || req.ip,
            userAgent: req.headers['user-agent'],
            requestBody: sanitizeForLogging(req.body),
            responseBody: sanitizeForLogging(responseBody),
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Audit log error:', error);
      }
    });
  };
};

// Login attempt logging
const loginAttempt = async (req, res, next) => {
  const originalSend = res.send;
  let responseBody;

  res.send = function(body) {
    responseBody = body;
    originalSend.call(this, body);
  };

  next();

  res.on('finish', async () => {
    try {
      const success = res.statusCode < 400;
      
      await AuditLog.create({
        user: req.body?.email || null,
        action: 'LOGIN_ATTEMPT',
        resource: 'auth',
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.headers['x-forwarded-for'] || req.ip,
        userAgent: req.headers['user-agent'],
        requestBody: { email: req.body?.email },
        responseBody: {
          success,
          message: responseBody?.message || (success ? 'Login successful' : 'Login failed')
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Login audit error:', error);
    }
  });
};

// Sensitive action logging
const sensitiveActionLog = async (req, res, next) => {
  const sensitiveActions = ['DELETE', 'PUT', 'PATCH'];
  
  if (sensitiveActions.includes(req.method) || req.path.includes('/admin')) {
    console.warn(`Sensitive action performed: ${req.method} ${req.path} by user ${req.user?._id || 'unknown'}`);
  }
  
  next();
};

// Data export logging
const dataExportLog = async (req, res, next) => {
  if (req.path.includes('/export') || req.path.includes('/download')) {
    console.info(`Data export requested: ${req.path} by user ${req.user?._id}`);
    
    // Add to audit log
    try {
      await AuditLog.create({
        user: req.user?._id,
        action: 'DATA_EXPORT',
        resource: req.path,
        method: req.method,
        ip: req.headers['x-forwarded-for'] || req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Export log error:', error);
    }
  }
  
  next();
};

// Helper function to determine if action should be logged
const shouldLogAction = (method, path) => {
  const logMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const excludePaths = ['/health', '/public', '/static'];
  
  return logMethods.includes(method) && 
         !excludePaths.some(exclude => path.includes(exclude));
};

// Helper function to get action from request
const getActionFromRequest = (req) => {
  const method = req.method;
  const path = req.path;
  
  if (method === 'POST' && path.includes('/create')) return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'GET' && path.includes('/export')) return 'EXPORT';
  
  return `${method}_${path.replace(/\//g, '_').toUpperCase()}`;
};

// Helper function to sanitize sensitive data for logging
const sanitizeForLogging = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'authorization', 'cookie', 'secret'];
  let sanitized = { ...data };
  
  if (typeof sanitized === 'object') {
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
  }
  
  return sanitized;
};

// Audit log model (create this file)
const createAuditLogModel = () => {
  const mongoose = require('mongoose');
  
  const auditLogSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    action: {
      type: String,
      required: true
    },
    resource: String,
    resourceId: String,
    method: String,
    path: String,
    statusCode: Number,
    ip: String,
    userAgent: String,
    requestBody: mongoose.Schema.Types.Mixed,
    responseBody: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  }, {
    timestamps: true
  });

  // Index for efficient querying
  auditLogSchema.index({ user: 1, timestamp: -1 });
  auditLogSchema.index({ action: 1, timestamp: -1 });
  auditLogSchema.index({ ip: 1, timestamp: -1 });

  // Set TTL for logs (30 days)
  auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  return mongoose.model('AuditLog', auditLogSchema);
};

module.exports = {
  auditLog,
  loginAttempt,
  sensitiveActionLog,
  dataExportLog,
  createAuditLogModel
};