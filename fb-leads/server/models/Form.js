const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
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
  formName: {
    type: String,
    trim: true,
    default: null
  },
  // New fields for page information
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
  // New field to associate with a specific Facebook app
  facebookAppId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.facebookApps',
    default: null
  },
  lastFetchedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure uniqueness of formId per user
formSchema.index({ userId: 1, formId: 1 }, { unique: true });

const Form = mongoose.model('Form', formSchema);

module.exports = Form; 