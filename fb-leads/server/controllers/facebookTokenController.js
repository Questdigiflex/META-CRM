const { validationResult } = require('express-validator');
const facebookTokenService = require('../services/facebookTokenService');
const User = require('../models/User'); // Added missing import for User model
const mongoose = require('mongoose'); // Added missing import for mongoose

/**
 * Save a Facebook access token
 */
const saveToken = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.userId;
    const { accessToken, appId, appName } = req.body;

    console.log('[saveToken] Received token save request with:', { 
      hasToken: !!accessToken,
      appId: appId || 'none',
      appName: appName || 'none'
    });

    // Ensure we have an app name - NEVER use undefined or empty string
    const finalAppName = appName && typeof appName === 'string' && appName.trim() 
      ? appName.trim() 
      : `Facebook App ${new Date().toISOString().substring(0, 19).replace('T', ' ')}`;

    console.log('[saveToken] Using app name:', finalAppName);

    // Save token to user
    const user = await facebookTokenService.saveUserToken(userId, {
      accessToken,
      appId,
      appName: finalAppName,
      tokenType: 'short_lived'
    });

    // Verify the app was saved with the correct name
    const savedApp = user.facebookApps[user.facebookApps.length - 1];
    console.log('[saveToken] App saved with name:', savedApp.appName);
    
    // Check if the name was saved correctly
    if (savedApp.appName !== finalAppName) {
      console.warn('[saveToken] Warning: App name mismatch. Expected:', finalAppName, 'Got:', savedApp.appName);
    }

    res.status(200).json({
      success: true,
      message: 'Access token saved successfully',
      appName: savedApp.appName,
      appId: savedApp._id.toString()
    });
  } catch (error) {
    console.error('[saveToken] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

/**
 * Convert a short-lived token to a long-lived token
 */
const exchangeToken = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.userId;
    const { appId } = req.body;

    // Get the user and their token
    let accessToken;
    
    if (appId) {
      const apps = await facebookTokenService.getUserApps(userId);
      const app = apps.find(app => app._id.toString() === appId);
      
      if (!app) {
        return res.status(404).json({
          success: false,
          error: 'Facebook app not found'
        });
      }
      
      accessToken = app.accessToken;
    } else {
      // Use the legacy token
      const apps = await facebookTokenService.getUserApps(userId);
      const legacyApp = apps.find(app => app._id === 'legacy');
      
      if (!legacyApp) {
        return res.status(404).json({
          success: false,
          error: 'No access token found'
        });
      }
      
      accessToken = legacyApp.accessToken;
    }

    // Exchange the token - pass userId to use user-specific app credentials if available
    const longLivedToken = await facebookTokenService.exchangeToken(accessToken, userId);

    // Save the long-lived token
    await facebookTokenService.saveUserToken(userId, {
      accessToken: longLivedToken.accessToken,
      appId: appId || null,
      tokenType: 'long_lived',
      expiresAt: longLivedToken.expiresAt
    });

    res.status(200).json({
      success: true,
      message: 'Token successfully exchanged for a long-lived token',
      expiresAt: longLivedToken.expiresAt
    });
  } catch (error) {
    console.error('Exchange token error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

/**
 * Save Facebook App ID and App Secret
 */
const saveAppCredentials = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.userId;
    const { facebookAppId, facebookAppSecret } = req.body;

    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update app credentials
    if (facebookAppId !== undefined) {
      user.facebookAppId = facebookAppId;
    }
    
    if (facebookAppSecret !== undefined) {
      user.facebookAppSecret = facebookAppSecret;
    }

    // Save the user
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Facebook App credentials saved successfully',
      hasAppId: !!user.facebookAppId,
      hasAppSecret: !!user.facebookAppSecret
    });
  } catch (error) {
    console.error('Save app credentials error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

/**
 * Get Facebook App ID and App Secret status
 */
const getAppCredentials = async (req, res) => {
  try {
    const userId = req.userId;

    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      hasAppId: !!user.facebookAppId,
      hasAppSecret: !!user.facebookAppSecret,
      facebookAppId: user.facebookAppId || ''
    });
  } catch (error) {
    console.error('Get app credentials error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

/**
 * Get all Facebook apps for a user
 */
const getUserApps = async (req, res) => {
  try {
    const userId = req.userId;

    // Get apps
    const apps = await facebookTokenService.getUserApps(userId);

    // Mask the tokens for security
    const maskedApps = apps.map(app => ({
      ...app,
      accessToken: app.accessToken ? `${app.accessToken.substring(0, 8)}...` : null
    }));

    res.status(200).json({
      success: true,
      data: maskedApps
    });
  } catch (error) {
    console.error('Get user apps error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

/**
 * Delete a Facebook app
 */
const deleteApp = async (req, res) => {
  try {
    const userId = req.userId;
    const { appId } = req.params;
    
    console.log('[deleteApp] Delete app request received for appId:', appId);
    
    if (!appId || appId === 'undefined') {
      console.log('[deleteApp] Invalid appId:', appId);
      return res.status(400).json({
        success: false,
        error: 'App ID is required'
      });
    }

    // Get the user to verify they have this app
    const user = await User.findById(userId);
    if (!user) {
      console.log('[deleteApp] User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if the app exists
    const appExists = user.facebookApps.some(app => app._id.toString() === appId);
    console.log('[deleteApp] App exists by _id:', appExists);
    
    // Try multiple deletion approaches for maximum reliability
    let deleted = false;
    
    // 1. First try the direct User model method
    try {
      console.log('[deleteApp] Trying User.deleteApp method');
      deleted = await user.deleteApp(appId);
      console.log('[deleteApp] User.deleteApp result:', deleted);
    } catch (methodError) {
      console.error('[deleteApp] Error using User.deleteApp method:', methodError);
    }
    
    // 2. If that didn't work, try the service method
    if (!deleted) {
      try {
        console.log('[deleteApp] Trying facebookTokenService.deleteUserApp method');
        await facebookTokenService.deleteUserApp(userId, appId);
        deleted = true;
      } catch (serviceError) {
        console.error('[deleteApp] Error using facebookTokenService:', serviceError);
      }
    }
    
    // 3. Last resort - direct MongoDB update
    if (!deleted) {
      try {
        console.log('[deleteApp] Trying direct MongoDB update');
        const result = await User.updateOne(
          { _id: userId },
          { $pull: { facebookApps: { _id: mongoose.Types.ObjectId(appId) } } }
        );
        console.log('[deleteApp] Direct MongoDB update result:', result);
        deleted = result.modifiedCount > 0 || result.nModified > 0;
      } catch (dbError) {
        console.error('[deleteApp] Error with direct MongoDB update:', dbError);
      }
    }

    // Verify the app was deleted
    const updatedUser = await User.findById(userId);
    const appStillExists = updatedUser.facebookApps.some(app => app._id.toString() === appId);
    console.log('[deleteApp] App still exists after all deletion attempts:', appStillExists);
    
    if (appStillExists) {
      console.log('[deleteApp] WARNING: App could not be deleted after multiple attempts');
    }

    res.status(200).json({
      success: true,
      message: 'Facebook app deletion process completed',
      deleted: !appStillExists
    });
  } catch (error) {
    console.error('[deleteApp] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

/**
 * Delete a Facebook app - Direct MongoDB approach
 */
const deleteAppDirect = async (req, res) => {
  try {
    const userId = req.userId;
    const { appId } = req.params;
    
    console.log('[deleteAppDirect] Starting with userId:', userId, 'appId:', appId);
    
    if (!appId || appId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'App ID is required'
      });
    }

    // Use direct MongoDB update to remove the app
    const result = await User.updateOne(
      { _id: userId },
      { $pull: { facebookApps: { _id: mongoose.Types.ObjectId(appId) } } }
    );
    
    console.log('[deleteAppDirect] MongoDB update result:', result);
    
    if (result.nModified === 0) {
      // Try with string ID
      const result2 = await User.updateOne(
        { _id: userId },
        { $pull: { facebookApps: { _id: appId } } }
      );
      
      console.log('[deleteAppDirect] Second attempt result:', result2);
    }

    res.status(200).json({
      success: true,
      message: 'App deletion command sent to database',
      result
    });
  } catch (error) {
    console.error('[deleteAppDirect] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

module.exports = {
  saveToken,
  exchangeToken,
  getUserApps,
  deleteApp,
  deleteAppDirect,
  saveAppCredentials,
  getAppCredentials
}; 