const axios = require('axios');
const Analytics = require('../models/Analytics');

class AnalyticsService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Fetch insights from Facebook Ads API
   * @param {string} accessToken - Facebook access token
   * @param {string} adAccountId - Facebook Ad Account ID (without 'act_' prefix)
   * @param {string} datePreset - Date preset (today, yesterday, last_7d, etc.)
   * @param {string} [breakdown] - Optional breakdown parameter (age, gender, device, etc.)
   * @returns {Promise<Object>} - The insights data
   */
  async fetchInsights(accessToken, adAccountId, datePreset, breakdown = null) {
    try {
      // Ensure adAccountId is properly formatted
      const formattedAdAccountId = adAccountId.startsWith('act_') 
        ? adAccountId 
        : `act_${adAccountId}`;
      
      // Build URL and parameters
      const url = `${this.baseUrl}/${formattedAdAccountId}/insights`;
      
      // Define fields to fetch
      const fields = [
        'campaign_name',
        'adset_name',
        'ad_name',
        'impressions',
        'clicks',
        'ctr',
        'spend',
        'cpm',
        'cpc',
        'reach',
        'actions'
      ].join(',');
      
      // Build query parameters
      const params = {
        access_token: accessToken,
        fields,
        date_preset: datePreset,
        level: 'ad',
        limit: 500
      };
      
      // Add breakdown if provided
      if (breakdown) {
        params.breakdowns = breakdown;
      }
      
      // Make the API request
      const response = await axios.get(url, { params });
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Facebook Insights API');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching Facebook Ads insights:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(`Facebook API Error: ${error.response.data.error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Cache insights data in MongoDB
   * @param {string} userId - User ID
   * @param {string} adAccountId - Ad Account ID
   * @param {string} datePreset - Date preset
   * @param {string} breakdown - Breakdown parameter
   * @param {Object} data - Insights data
   * @returns {Promise<Object>} - The saved analytics document
   */
  async cacheInsights(userId, adAccountId, datePreset, breakdown, data) {
    try {
      // Calculate expiration time (6 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);
      
      // Find existing cache or create new one
      let analytics = await Analytics.findOne({
        userId,
        adAccountId,
        datePreset,
        breakdown
      });
      
      if (analytics) {
        // Update existing cache
        analytics.data = data;
        analytics.fetchedAt = new Date();
        analytics.expiresAt = expiresAt;
      } else {
        // Create new cache
        analytics = new Analytics({
          userId,
          adAccountId,
          datePreset,
          breakdown,
          data,
          expiresAt
        });
      }
      
      // Save to database
      await analytics.save();
      
      return analytics;
    } catch (error) {
      console.error('Error caching insights data:', error);
      throw error;
    }
  }
  
  /**
   * Get cached insights or fetch new ones
   * @param {string} userId - User ID
   * @param {string} accessToken - Facebook access token
   * @param {string} adAccountId - Ad Account ID
   * @param {string} datePreset - Date preset
   * @param {string} breakdown - Breakdown parameter
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Object>} - The insights data
   */
  async getInsights(userId, accessToken, adAccountId, datePreset, breakdown = null, forceRefresh = false) {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await Analytics.findOne({
          userId,
          adAccountId,
          datePreset,
          breakdown
        });
        
        // Return cached data if available and not expired
        if (cachedData && cachedData.expiresAt > new Date()) {
          return cachedData.data;
        }
      }
      
      // Fetch fresh data from Facebook
      const freshData = await this.fetchInsights(accessToken, adAccountId, datePreset, breakdown);
      
      // Cache the data
      await this.cacheInsights(userId, adAccountId, datePreset, breakdown, freshData);
      
      return freshData;
    } catch (error) {
      console.error('Error getting insights:', error);
      throw error;
    }
  }
  
  /**
   * Setup cron job to refresh analytics data
   * @param {Object} cron - node-cron instance
   */
  setupCronJob(cron) {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running analytics refresh cron job...');
      
      try {
        // Find analytics records that are about to expire
        const analytics = await Analytics.find({
          expiresAt: { $lt: new Date(Date.now() + 1000 * 60 * 60) } // Less than 1 hour until expiry
        }).populate('userId', 'facebookApps');
        
        console.log(`Found ${analytics.length} analytics records to refresh`);
        
        // Process each record
        for (const record of analytics) {
          try {
            // Skip if user doesn't exist or has no apps
            if (!record.userId || !record.userId.facebookApps || record.userId.facebookApps.length === 0) {
              continue;
            }
            
            // Find a valid access token
            const app = record.userId.facebookApps.find(app => app.accessToken);
            if (!app) continue;
            
            // Fetch fresh data
            const freshData = await this.fetchInsights(
              app.accessToken,
              record.adAccountId,
              record.datePreset,
              record.breakdown
            );
            
            // Update cache
            record.data = freshData;
            record.fetchedAt = new Date();
            
            // Reset expiration (6 hours from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 6);
            record.expiresAt = expiresAt;
            
            await record.save();
            console.log(`Refreshed analytics for user ${record.userId._id}, ad account ${record.adAccountId}`);
          } catch (error) {
            console.error(`Error refreshing analytics record ${record._id}:`, error);
            // Continue with next record
          }
        }
      } catch (error) {
        console.error('Error in analytics refresh cron job:', error);
      }
    });
  }
}

const analyticsService = new AnalyticsService();
module.exports = analyticsService; 