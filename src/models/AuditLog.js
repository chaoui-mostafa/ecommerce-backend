const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN_SUCCESS', 'LOGIN_FAILED',
      'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'PROFILE_UPDATE', 'ORDER_CREATE', 'ORDER_UPDATE',
      'ORDER_CANCEL', 'PAYMENT_PROCESS', 'REFUND',
      'EXPORT_DATA', 'API_KEY_GENERATE',
      'ADMIN_ACTION', 'MODERATE_REVIEW',
      'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED',
      'ERROR' // 🔥 مهم باش ما يطيحش السيرفر
    ]
  },

  resource: {
    type: String,
    required: true,
    index: true
  },

  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'resourceModel'
  },

  resourceModel: {
    type: String,
    enum: ['User', 'Product', 'Order', 'Review', 'Category', 'Cart']
  },

  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },

  path: String,

  statusCode: Number,

  ip: {
    type: String,
    required: true,
    index: true
  },

  userAgent: String,

  requestBody: mongoose.Schema.Types.Mixed,
  responseBody: mongoose.Schema.Types.Mixed,

  metadata: {
    type: Map,
    of: String
  },

  geoLocation: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number
  },

  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    default: 'INFO',
    index: true
  }

}, {
  timestamps: true
});

/* ================= TTL INDEX ================= */
// حذف تلقائي بعد 30 يوم
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

/* ================= COMPOUND INDEXES ================= */

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ ip: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

/* ================= VIRTUAL ================= */

auditLogSchema.virtual('formattedTimestamp').get(function () {
  return this.createdAt.toISOString();
});

/* ================= STATIC METHODS ================= */

auditLogSchema.statics.getUserActivity = function (userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    user: userId,
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });
};

auditLogSchema.statics.getSuspiciousActivity = function (hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  return this.find({
    severity: { $in: ['WARNING', 'CRITICAL'] },
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });
};

/* ================= OPTIMIZED STATISTICS ================= */

auditLogSchema.statics.getStatistics = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        failedLogins: {
          $sum: {
            $cond: [{ $eq: ['$action', 'LOGIN_FAILED'] }, 1, 0]
          }
        },
        errors: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'ERROR'] }, 1, 0]
          }
        },
        critical: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        totalLogs: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        failedLogins: 1,
        errors: 1,
        critical: 1
      }
    }
  ]);

  return stats[0] || {
    totalLogs: 0,
    uniqueUsers: 0,
    failedLogins: 0,
    errors: 0,
    critical: 0
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;