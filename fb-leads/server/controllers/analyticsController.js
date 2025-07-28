const analyticsService = require('../services/analyticsService');
const User = require('../models/User');
const cron = require('node-cron');

/**
 * Get Facebook Ads insights
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInsights = async (req, res) => {
  try {
    const { ad_account_id, date_preset, breakdown, force_refresh } = req.query;
    const userId = req.userId;
    
    // Validate required parameters
    if (!ad_account_id) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account ID is required'
      });
    }
    
    if (!date_preset) {
      return res.status(400).json({
        success: false,
        error: 'Date preset is required'
      });
    }
    
    // Validate date preset
    const validDatePresets = ['today', 'yesterday', 'last_7d', 'last_30d', 'last_90d', 'this_month', 'last_month'];
    if (!validDatePresets.includes(date_preset)) {
      return res.status(400).json({
        success: false,
        error: `Invalid date preset. Must be one of: ${validDatePresets.join(', ')}`
      });
    }
    
    // Get user to find access token
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get access token from user's Facebook apps
    let accessToken = null;
    
    // First check if token is provided in query
    if (req.query.access_token) {
      accessToken = req.query.access_token;
    } else if (user.facebookApps && user.facebookApps.length > 0) {
      // Otherwise use the first available app token
      const app = user.facebookApps.find(app => app.accessToken);
      if (app) {
        accessToken = app.accessToken;
      }
    } else if (user.accessToken) {
      // Fall back to legacy token if available
      accessToken = user.accessToken;
    }
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'No Facebook access token available. Please provide one or connect a Facebook account.'
      });
    }
    
    // Get insights from service
    const insights = await analyticsService.getInsights(
      userId,
      accessToken,
      ad_account_id,
      date_preset,
      breakdown || null,
      force_refresh === 'true'
    );
    
    // Return insights data
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    
    // Handle Facebook API errors
    if (error.message && error.message.includes('Facebook API Error')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
};

/**
 * Get available ad accounts for the user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAdAccounts = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user to find access token
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get access token from user's Facebook apps
    let accessToken = null;
    
    if (user.facebookApps && user.facebookApps.length > 0) {
      // Use the first available app token
      const app = user.facebookApps.find(app => app.accessToken);
      if (app) {
        accessToken = app.accessToken;
      }
    } else if (user.accessToken) {
      // Fall back to legacy token if available
      accessToken = user.accessToken;
    }
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'No Facebook access token available. Please connect a Facebook account.'
      });
    }
    
    // Fetch ad accounts from Facebook API
    const axios = require('axios');
    const response = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_id,account_status'
      }
    });
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from Facebook Ad Accounts API');
    }
    
    // Return ad accounts
    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Error getting ad accounts:', error);
    
    // Handle Facebook API errors
    if (error.response && error.response.data && error.response.data.error) {
      return res.status(400).json({
        success: false,
        error: `Facebook API Error: ${error.response.data.error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ad accounts'
    });
  }
};

/**
 * Export insights to CSV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exportInsights = async (req, res) => {
  try {
    const { ad_account_id, date_preset, breakdown } = req.query;
    const userId = req.userId;
    
    // Validate required parameters
    if (!ad_account_id || !date_preset) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account ID and Date preset are required'
      });
    }
    
    // Get user to find access token
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get access token
    let accessToken = null;
    
    if (user.facebookApps && user.facebookApps.length > 0) {
      const app = user.facebookApps.find(app => app.accessToken);
      if (app) {
        accessToken = app.accessToken;
      }
    } else if (user.accessToken) {
      accessToken = user.accessToken;
    }
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'No Facebook access token available'
      });
    }
    
    // Get insights data
    const insights = await analyticsService.getInsights(
      userId,
      accessToken,
      ad_account_id,
      date_preset,
      breakdown || null
    );
    
    if (!insights || !insights.data || !Array.isArray(insights.data)) {
      throw new Error('Invalid insights data');
    }
    
    // Convert insights to CSV
    const { Parser } = require('json2csv');
    
    // Flatten the actions array for CSV
    const flattenedData = insights.data.map(item => {
      const flatItem = { ...item };
      
      // Handle actions array if it exists
      if (item.actions && Array.isArray(item.actions)) {
        item.actions.forEach(action => {
          flatItem[`action_${action.action_type}`] = action.value;
        });
        
        delete flatItem.actions;
      }
      
      return flatItem;
    });
    
    // Generate CSV
    const fields = Object.keys(flattenedData[0] || {});
    const parser = new Parser({ fields });
    const csv = parser.parse(flattenedData);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=facebook_ads_insights_${date_preset}.csv`);
    
    // Send CSV
    res.send(csv);
  } catch (error) {
    console.error('Error exporting insights:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to export insights data'
    });
  }
};

/**
 * Start the cron job for refreshing analytics data
 */
const startCronJob = () => {
  analyticsService.setupCronJob(cron);
};

module.exports = {
  getInsights,
  getAdAccounts,
  exportInsights,
  startCronJob
}; 