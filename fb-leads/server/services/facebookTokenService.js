const axios = require('axios');
const dotenv = require('dotenv');
const User = require('../models/User');

// Configure dotenv
dotenv.config();

class FacebookTokenService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
  }

  /**
   * Convert a short-lived token to a long-lived token
   * @param {string} shortLivedToken - The short-lived token to convert
   * @param {string} userId - The user ID for checking user-specific app credentials
   * @returns {Promise<Object>} The long-lived token data
   */
  async exchangeToken(shortLivedToken, userId = null) {
    try {
      let appId = this.appId;
      let appSecret = this.appSecret;
      
      // Check if user has their own app credentials
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.facebookAppId && user.facebookAppSecret) {
          appId = user.facebookAppId;
          appSecret = user.facebookAppSecret;
          console.log('[exchangeToken] Using user-specific app credentials');
        }
      }
      
      if (!appId || !appSecret) {
        throw new Error('Facebook App ID and App Secret must be configured in environment variables or user settings');
      }

      const url = `${this.baseUrl}/oauth/access_token`;
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      });

      const response = await axios.get(`${url}?${params.toString()}`);

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from Facebook token exchange');
      }

      // Calculate expiration date
      const expiresIn = response.data.expires_in || 5184000; // Default to 60 days in seconds
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      return {
        accessToken: response.data.access_token,
        expiresAt,
        tokenType: 'long_lived'
      };
    } catch (error) {
      console.error('Error exchanging token:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(`Facebook API Error: ${error.response.data.error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Save a Facebook access token for a user
   * @param {string} userId - The user ID
   * @param {Object} tokenData - The token data to save
   * @param {string} tokenData.accessToken - The access token
   * @param {string} [tokenData.appId] - The Facebook app ID
   * @param {string} [tokenData.appName] - The Facebook app name
   * @param {string} [tokenData.tokenType] - The token type (short_lived or long_lived)
   * @param {Date} [tokenData.expiresAt] - The token expiration date
   * @returns {Promise<Object>} The updated user object
   */
  async saveUserToken(userId, tokenData) {
    try {
      console.log('[saveUserToken] Starting with data:', {
        userId,
        hasToken: !!tokenData.accessToken,
        appId: tokenData.appId || 'none',
        appName: tokenData.appName || 'none',
        tokenType: tokenData.tokenType || 'short_lived'
      });
      
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // For backward compatibility, also set the legacy accessToken field
      user.accessToken = tokenData.accessToken;
      
      // Generate a unique appId if not provided
      const generatedAppId = tokenData.appId || `app_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // CRITICAL: Ensure appName is NEVER null, undefined, or empty string
      let appName = 'Facebook App';
      
      if (tokenData.appName && typeof tokenData.appName === 'string' && tokenData.appName.trim()) {
        appName = tokenData.appName.trim();
      } else {
        // Generate a unique name with timestamp
        const timestamp = new Date().toISOString().substring(0, 19).replace('T', ' ');
        appName = `Facebook App (${timestamp})`;
      }
      
      console.log('[saveUserToken] Using app name:', appName);
      
      // Check if this app already exists (by appId if provided, otherwise create new)
      const existingAppIndex = user.facebookApps.findIndex(app => 
        tokenData.appId && app.appId === tokenData.appId
      );
      
      let savedApp;
      
      if (existingAppIndex >= 0) {
        console.log('[saveUserToken] Updating existing app at index:', existingAppIndex);
        // Update existing app
        user.facebookApps[existingAppIndex].accessToken = tokenData.accessToken;
        user.facebookApps[existingAppIndex].tokenType = tokenData.tokenType || 'short_lived';
        user.facebookApps[existingAppIndex].expiresAt = tokenData.expiresAt || null;
        
        // Always update the app name if it's provided
        user.facebookApps[existingAppIndex].appName = appName;
        
        console.log('[saveUserToken] Updated app name to:', appName);
        savedApp = user.facebookApps[existingAppIndex];
      } else {
        // Add new app with the provided name
        console.log('[saveUserToken] Creating new app with name:', appName);
        
        const newApp = {
          appId: generatedAppId,
          appName: appName,
          accessToken: tokenData.accessToken,
          tokenType: tokenData.tokenType || 'short_lived',
          expiresAt: tokenData.expiresAt || null,
          createdAt: new Date()
        };
        
        user.facebookApps.push(newApp);
        console.log('[saveUserToken] Added new app:', {
          appId: newApp.appId,
          appName: newApp.appName
        });
        savedApp = newApp;
      }
      
      // Save the user document
      await user.save();
      
      // Verify the app name was saved correctly
      const updatedUser = await User.findById(userId);
      const savedApps = updatedUser.facebookApps;
      
      // Find the app we just saved
      const verifiedApp = savedApps.find(app => 
        (savedApp._id && app._id.toString() === savedApp._id.toString()) || 
        (savedApp.appId && app.appId === savedApp.appId)
      );
      
      if (verifiedApp) {
        console.log('[saveUserToken] Verified app name after save:', verifiedApp.appName);
        if (verifiedApp.appName !== appName) {
          console.warn('[saveUserToken] Warning: App name mismatch after save. Expected:', appName, 'Got:', verifiedApp.appName);
        }
      } else {
        console.warn('[saveUserToken] Warning: Could not find saved app after save');
      }
      
      return updatedUser;
    } catch (error) {
      console.error('[saveUserToken] Error:', error);
      throw error;
    }
  }

  /**
   * Get Facebook app information for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of Facebook app data
   */
  async getUserApps(userId) {
    try {
      console.log('[getUserApps] Fetching apps for userId:', userId);
      
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      console.log('[getUserApps] Found user with', user.facebookApps.length, 'apps');
      
      // Make sure all apps have valid properties
      const apps = user.facebookApps.map(app => {
        // Convert to plain object if it's a Mongoose document
        const appData = app.toObject ? app.toObject() : { ...app };
        
        // Ensure app has a name
        if (!appData.appName) {
          appData.appName = 'Facebook App';
        }
        
        // Make sure _id is accessible as a string
        if (appData._id) {
          appData._id = appData._id.toString();
        }
        
        console.log('[getUserApps] Processing app:', {
          _id: appData._id,
          appName: appData.appName,
          tokenType: appData.tokenType
        });
        
        return appData;
      });
      
      // Add legacy token as a default app if it exists and no apps are configured
      if (user.accessToken && apps.length === 0) {
        apps.push({
          _id: 'legacy',
          appId: null,
          appName: 'Default App',
          accessToken: user.accessToken,
          tokenType: 'unknown',
          expiresAt: null,
          createdAt: new Date()
        });
      }
      
      console.log('[getUserApps] Returning', apps.length, 'apps');
      
      return apps;
    } catch (error) {
      console.error('[getUserApps] Error:', error);
      throw error;
    }
  }

  /**
   * Delete a Facebook app for a user
   * @param {string} userId - The user ID
   * @param {string} appId - The app ID to delete
   * @returns {Promise<Object>} The updated user object
   */
  async deleteUserApp(userId, appId) {
    try {
      console.log(`[deleteUserApp] Starting deletion for userId: ${userId}, appId: ${appId}`);
      
      const user = await User.findById(userId);
      
      if (!user) {
        console.log(`[deleteUserApp] User not found: ${userId}`);
        throw new Error('User not found');
      }
      
      console.log(`[deleteUserApp] User found, has ${user.facebookApps.length} apps`);
      console.log(`[deleteUserApp] Apps before deletion:`, user.facebookApps.map(app => ({
        _id: app._id.toString(),
        appName: app.appName || 'Unnamed',
        appId: app.appId
      })));
      
      // If trying to delete the legacy app
      if (appId === 'legacy') {
        console.log(`[deleteUserApp] Deleting legacy token`);
        user.accessToken = null;
        await user.save();
        return user;
      }
      
      // Use the new User.deleteApp method
      const deleted = await user.deleteApp(appId);
      
      if (!deleted) {
        console.log(`[deleteUserApp] App not found or could not be deleted, trying alternative approach`);
        
        // Try one more approach - direct MongoDB update
        try {
          const result = await User.updateOne(
            { _id: userId },
            { $pull: { facebookApps: { _id: appId } } }
          );
          
          console.log(`[deleteUserApp] MongoDB direct update result:`, result);
          
          // Get the updated user
          const updatedUser = await User.findById(userId);
          return updatedUser;
        } catch (updateError) {
          console.error(`[deleteUserApp] Error in direct MongoDB update:`, updateError);
          // Continue with the original user object
        }
      }
      
      // Return the user (which should be updated if deletion was successful)
      return user;
    } catch (error) {
      console.error('[deleteUserApp] Error:', error);
      throw error;
    }
  }
}

const facebookTokenService = new FacebookTokenService();
module.exports = facebookTokenService; 