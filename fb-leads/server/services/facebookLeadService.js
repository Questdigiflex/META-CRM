const axios = require('axios');
const dotenv = require('dotenv');
const User = require('../models/User');
const Form = require('../models/Form');

// Configure dotenv
dotenv.config();

class FacebookLeadService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Validates the Facebook API configuration for a user
   * @param {string} userId - User ID
   * @param {string} [appId] - Facebook app ID (optional)
   * @returns {Promise<Object>} User with access token
   * @throws {Error} If configuration is invalid
   */
  async validateUserConfig(userId, appId = null) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // 1. If specific app ID is provided, get that token
    if (appId && user.facebookApps && user.facebookApps.length > 0) {
      const app = user.facebookApps.find(app => app._id.toString() === appId);
      if (app) {
        return {
          user,
          accessToken: app.accessToken,
          appId: app._id.toString()
        };
      } else {
        throw new Error('Facebook app not found');
      }
    }

    // 2. Use first available app token if present
    if (user.facebookApps && user.facebookApps.length > 0) {
      const app = user.facebookApps[0];
      return {
        user,
        accessToken: app.accessToken,
        appId: app._id.toString()
      };
    }

    // 3. Use legacy token as fallback
    if (user.accessToken) {
      return {
        user,
        accessToken: user.accessToken,
        appId: 'legacy'
      };
    }

    // 4. No valid token found
    throw new Error('Facebook Access Token is required');
  }

  /**
   * Fetches leads from Facebook Lead Ads form
   * @param {Object} options - Query options
   * @param {string} options.userId - User ID
   * @param {string} options.formId - Form ID (optional)
   * @param {string} options.appId - Facebook app ID (optional)
   * @param {string} options.since - ISO date string for fetching leads since a specific date
   * @param {number} options.limit - Number of leads to fetch (default: 100)
   * @returns {Promise<Array>} Array of leads
   */
  async fetchFacebookLeads(options = {}) {
    try {
      const { userId, formId, appId, since, limit = 100 } = options;
      
      // Validate user configuration
      const { user, accessToken } = await this.validateUserConfig(userId, appId);
      
      // Get forms to fetch leads from
      let forms;
      if (formId) {
        // If formId is provided, fetch only that form
        const form = await Form.findOne({ 
          userId, 
          $or: [
            { _id: formId },
            { formId: formId }
          ]
        });
        
        if (!form) {
          throw new Error(`Form not found: ${formId}`);
        }
        
        forms = [form];
      } else {
        // Otherwise, fetch all active forms for the user
        const query = { userId, isActive: true };
        
        // If appId is provided, filter forms by that app
        if (appId && appId !== 'legacy') {
          query.facebookAppId = appId;
        }
        
        forms = await Form.find(query);
        
        if (forms.length === 0) {
          throw new Error('No active forms found for this user');
        }
      }
      
      console.log(`Fetching leads for ${forms.length} forms...`);
      
      // Fetch leads for each form
      const allLeads = [];
      
      for (const form of forms) {
        const formLeads = await this.fetchLeadsForForm({
          formId: form.formId,
          formName: form.formName,
          pageId: form.pageId,
          pageName: form.pageName,
          accessToken,
          since,
          limit
        });
        
        // Add user ID to each lead
        const processedLeads = formLeads.map(lead => ({
          ...lead,
          userId
        }));
        
        allLeads.push(...processedLeads);
        
        // Update lastFetchedAt for the form
        form.lastFetchedAt = new Date();
        await form.save();
      }
      
      console.log(`Successfully fetched ${allLeads.length} leads`);
      return allLeads;
    } catch (error) {
      console.error('Error fetching Facebook leads:', error);
      throw error;
    }
  }

  /**
   * Fetches leads for a specific form
   * @param {Object} options - Query options
   * @param {string} options.formId - Form ID
   * @param {string} options.formName - Form name
   * @param {string} options.pageId - Page ID
   * @param {string} options.pageName - Page name
   * @param {string} options.accessToken - Facebook access token
   * @param {string} options.since - ISO date string for fetching leads since a specific date
   * @param {number} options.limit - Number of leads to fetch
   * @returns {Promise<Array>} Array of leads
   */
  async fetchLeadsForForm(options = {}) {
    try {
      const { 
        formId, 
        formName, 
        pageId, 
        pageName, 
        accessToken, 
        since, 
        limit,
        after
      } = options;
      
      // Build the query parameters
      const params = new URLSearchParams({
        access_token: accessToken,
        limit: limit,
        fields: [
          'id',
          'created_time',
          'field_data',
          'form_id',
          'platform',
          'campaign_name',
          'adset_name',
          'ad_name',
          'ad_id'
        ].join(',')
      });

      // Add since parameter if provided
      if (since) {
        params.append('since', since);
      }
      
      // Add after parameter for pagination
      if (after) {
        params.append('after', after);
      }

      console.log(`Fetching leads for form: ${formId}`);
      console.log('Since:', since || 'all time');

      const response = await axios.get(
        `${this.baseUrl}/${formId}/leads?${params.toString()}`
      );

      if (!response.data) {
        throw new Error('Empty response from Facebook API');
      }

      if (!response.data.data) {
        console.log(`No leads found for form: ${formId}`);
        return []; // Return empty array instead of throwing error
      }

      const normalizedLeads = response.data.data.map(lead => {
        try {
          return this.normalizeLead(lead, formId, formName, pageId, pageName);
        } catch (error) {
          console.error('Error normalizing lead:', error);
          console.error('Problematic lead data:', JSON.stringify(lead, null, 2));
          return null;
        }
      }).filter(lead => lead !== null); // Remove any leads that failed to normalize

      console.log(`Successfully fetched and normalized ${normalizedLeads.length} leads for form: ${formId}`);
      
      // Handle pagination if there are more leads
      if (response.data.paging && response.data.paging.next) {
        try {
          const nextPageUrl = new URL(response.data.paging.next);
          const nextPageParams = Object.fromEntries(nextPageUrl.searchParams);
          
          // Recursively fetch next page
          const nextPageLeads = await this.fetchLeadsForForm({
            formId,
            formName,
            pageId,
            pageName,
            accessToken,
            limit,
            after: nextPageParams.after
          });
          
          // Combine leads from both pages
          normalizedLeads.push(...nextPageLeads);
        } catch (error) {
          console.error('Error fetching next page of leads:', error);
        }
      }
      
      return normalizedLeads;
    } catch (error) {
      if (error.response) {
        // Facebook API error
        const apiError = error.response.data.error || {};
        console.error('Facebook API Error:', apiError);
        throw new Error(`Facebook API Error: ${apiError.message || error.message}`);
      }
      console.error(`Error fetching leads for form ${options.formId}:`, error);
      throw error;
    }
  }

  /**
   * Normalizes a lead object from Facebook's format
   * @param {Object} lead - Raw lead data from Facebook
   * @param {string} formId - Form ID
   * @param {string} formName - Form name
   * @param {string} pageId - Page ID
   * @param {string} pageName - Page name
   * @returns {Object} Normalized lead object
   */
  normalizeLead(lead, formId, formName, pageId, pageName) {
    if (!lead || typeof lead !== 'object') {
      throw new Error('Invalid lead data received');
    }

    if (!Array.isArray(lead.field_data)) {
      console.warn('No field_data array in lead:', lead);
      lead.field_data = []; // Set default empty array
    }

    const fieldData = lead.field_data.map(field => {
      if (!field.values || !Array.isArray(field.values) || field.values.length === 0) {
        return {
          name: field.name?.toLowerCase() || 'unknown',
          value: null
        };
      }
      return {
        name: field.name?.toLowerCase() || 'unknown',
        value: field.values[0]
      };
    });

    // Extract common fields like name, email, phone
    let fullName = null;
    let email = null;
    let phone = null;

    for (const field of fieldData) {
      const fieldName = field.name.toLowerCase();
      
      if (fieldName === 'full_name' || fieldName === 'name' || fieldName === 'full name') {
        fullName = field.value;
      } else if (fieldName === 'email' || fieldName === 'email address') {
        email = field.value;
      } else if (fieldName === 'phone' || fieldName === 'phone number' || fieldName === 'mobile' || fieldName === 'contact') {
        phone = field.value;
      }
    }

    return {
      leadId: lead.id || 'unknown',
      formId: lead.form_id || formId,
      formName: formName || null,
      pageId: pageId || null,
      pageName: pageName || null,
      createdTime: lead.created_time ? new Date(lead.created_time) : new Date(),
      fullName,
      email,
      phone,
      fieldData,
      rawData: {
        platform: lead.platform || 'unknown',
        campaignName: lead.campaign_name || 'unknown',
        adsetName: lead.adset_name || 'unknown',
        adName: lead.ad_name || 'unknown',
        adId: lead.ad_id || 'unknown'
      }
    };
  }
}

const facebookLeadService = new FacebookLeadService();
module.exports = facebookLeadService; 