const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  formId: {
    type: String,
    required: true,
    trim: true
  },
  // New fields for form and page information
  formName: {
    type: String,
    trim: true,
    default: null
  },
  pageId: {
    type: String,
    trim: true,
    default: null
  },
  pageName: {
    type: String,
    trim: true,
    default: null
  },
  leadId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fullName: {
    type: String,
    trim: true,
    default: null
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  createdTime: {
    type: Date,
    required: true
  },
  fieldData: [{
    name: String,
    value: mongoose.Schema.Types.Mixed
  }],
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new'
  },
  notes: {
    type: String,
    default: null
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for faster queries
leadSchema.index({ userId: 1, formId: 1, createdTime: -1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead; 