const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const facebookAppSchema = new mongoose.Schema({
  appId: {
    type: String,
    trim: true
  },
  appName: {
    type: String,
    trim: true
  },
  accessToken: {
    type: String,
    required: true
  },
  tokenType: {
    type: String,
    enum: ['short_lived', 'long_lived'],
    default: 'short_lived'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // Legacy field - kept for backward compatibility
  accessToken: {
    type: String,
    default: null
  },
  // New field for multiple Facebook apps and tokens
  facebookApps: [facebookAppSchema],
  // Facebook App ID and Secret for generating long-lived tokens
  facebookAppId: {
    type: String,
    trim: true,
    default: null
  },
  facebookAppSecret: {
    type: String,
    trim: true,
    default: null
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  
  if (!user.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Add a pre-save hook to handle the facebookApps array
userSchema.pre('save', async function(next) {
  // If facebookApps array is modified, ensure it's properly handled
  if (this.isModified('facebookApps')) {
    console.log('[User Model] facebookApps modified, ensuring proper structure');
    
    // Ensure each app has required fields
    this.facebookApps = this.facebookApps.map(app => {
      // CRITICAL: Ensure app has a name - NEVER allow null, undefined, or empty string
      if (!app.appName || app.appName.trim() === '') {
        const timestamp = new Date().toISOString().substring(0, 19).replace('T', ' ');
        app.appName = `Facebook App (${timestamp})`;
        console.log('[User Model] Set missing app name to:', app.appName);
      }
      
      if (!app.tokenType) {
        app.tokenType = 'short_lived';
      }
      
      if (!app.createdAt) {
        app.createdAt = new Date();
      }
      
      return app;
    });
    
    console.log(`[User Model] Saving with ${this.facebookApps.length} apps`);
    
    // Log all app names for verification
    this.facebookApps.forEach((app, index) => {
      console.log(`[User Model] App ${index}: ${app.appName} (ID: ${app._id})`);
    });
  }
  
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error;
  }
};

// Helper method to get all access tokens
userSchema.methods.getAllAccessTokens = function() {
  const tokens = this.facebookApps.map(app => app.accessToken);
  
  // Include legacy token if it exists and not already in the list
  if (this.accessToken && !tokens.includes(this.accessToken)) {
    tokens.push(this.accessToken);
  }
  
  return tokens;
};

// Helper method to get a specific access token by app ID
userSchema.methods.getAccessTokenByAppId = function(appId) {
  const app = this.facebookApps.find(app => app.appId === appId);
  return app ? app.accessToken : null;
};

// Helper method to delete an app by ID
userSchema.methods.deleteApp = async function(appId) {
  console.log(`[User.deleteApp] Deleting app with ID: ${appId}`);
  
  // Store original length for comparison
  const originalLength = this.facebookApps.length;
  
  // Try to delete by MongoDB _id first
  let appFound = false;
  const updatedApps = this.facebookApps.filter(app => {
    const shouldKeep = app._id.toString() !== appId;
    if (!shouldKeep) {
      appFound = true;
      console.log(`[User.deleteApp] Found app to delete by _id: ${app._id}`);
    }
    return shouldKeep;
  });
  
  // If app wasn't found by _id, try by appId field
  if (!appFound) {
    console.log(`[User.deleteApp] App not found by _id, trying by appId field`);
    const secondAttempt = this.facebookApps.filter(app => {
      const shouldKeep = app.appId !== appId;
      if (!shouldKeep) {
        appFound = true;
        console.log(`[User.deleteApp] Found app to delete by appId: ${app.appId}`);
      }
      return shouldKeep;
    });
    
    if (appFound) {
      this.facebookApps = secondAttempt;
    }
  } else {
    // Use the first filtered result
    this.facebookApps = updatedApps;
  }
  
  console.log(`[User.deleteApp] App found and deleted: ${appFound}`);
  console.log(`[User.deleteApp] Apps reduced from ${originalLength} to ${this.facebookApps.length}`);
  
  // Save the user document
  if (appFound) {
    await this.save();
    console.log(`[User.deleteApp] User saved successfully`);
  }
  
  return appFound;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 