const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adAccountId: {
    type: String,
    required: true
  },
  datePreset: {
    type: String,
    required: true,
    enum: ['today', 'yesterday', 'last_7d', 'last_30d', 'last_90d', 'this_month', 'last_month']
  },
  breakdown: {
    type: String,
    default: null
  },
  data: {
    type: Object,
    required: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Index for efficient queries and TTL
analyticsSchema.index({ userId: 1, adAccountId: 1, datePreset: 1, breakdown: 1 });
analyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics; 