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

/**
 * Get available Facebook pages for the user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPages = async (req, res) => {
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
    
    // Get access token from user's Facebook apps (same approach as facebookPageController)
    let accessToken = null;
    let app = null;
    
    if (user.facebookApps && user.facebookApps.length > 0) {
      // Use the first available app
      app = user.facebookApps.find(app => app.accessToken);
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
    
    // Fetch pages from Facebook API (same endpoint as facebookPageController)
    const axios = require('axios');
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'id,name,category'
      }
    });
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from Facebook Pages API');
    }
    
    // Return pages in the same format as facebookPageController
    const pages = response.data.data.map(page => ({
      id: page.id,
      name: page.name,
      category: page.category
    }));
    
    console.log(`Successfully fetched ${pages.length} pages for analytics`);
    
    // Return pages
    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Error getting pages:', error);
    
    // Handle Facebook API errors
    if (error.response && error.response.data && error.response.data.error) {
      return res.status(400).json({
        success: false,
        error: `Facebook API Error: ${error.response.data.error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pages'
    });
  }
};

/**
 * Get ad accounts for a specific page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAdAccountsByPage = async (req, res) => {
  try {
    const { pageId } = req.query;
    const userId = req.userId;
    
    if (!pageId) {
      return res.status(400).json({
        success: false,
        error: 'Page ID is required'
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
    
    // Get access token from user's Facebook apps (same approach as facebookPageController)
    let accessToken = null;
    
    if (user.facebookApps && user.facebookApps.length > 0) {
      // Use the first available app
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
    
    // First get the page access token (same approach as facebookPageController)
    const axios = require('axios');
    const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'id,access_token'
      }
    });
    
    if (!pagesResponse.data || !pagesResponse.data.data) {
      throw new Error('Invalid response from Facebook Pages API');
    }
    
    const page = pagesResponse.data.data.find(p => p.id === pageId);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }
    
    // Now get ad accounts for this page
    const adAccountsResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/adaccounts`, {
      params: {
        access_token: page.access_token,
        fields: 'id,name,account_id,account_status'
      }
    });
    
    if (!adAccountsResponse.data || !adAccountsResponse.data.data) {
      throw new Error('Invalid response from Facebook Ad Accounts API');
    }
    
    console.log(`Successfully fetched ${adAccountsResponse.data.data.length} ad accounts for page ${pageId}`);
    
    // Return ad accounts
    res.json({
      success: true,
      data: adAccountsResponse.data.data
    });
  } catch (error) {
    console.error('Error getting ad accounts by page:', error);
    
    // Handle Facebook API errors
    if (error.response && error.response.data && error.response.data.error) {
      return res.status(400).json({
        success: false,
        error: `Facebook API Error: ${error.response.data.error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ad accounts for page'
    });
  }
};

module.exports = {
  getInsights,
  getAdAccounts,
  getPages,
  getAdAccountsByPage,
  exportInsights,
  startCronJob
}; 