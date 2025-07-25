import axios from 'axios';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Form from '../models/Form.js';

// Configure dotenv
dotenv.config();

class FacebookPageService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Get all pages a user manages
   * @param {string} userId - User ID
   * @param {string} [appId] - Facebook app ID (optional)
   * @returns {Promise<Array>} Array of pages
   */
  async getUserPages(userId, appId = null) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      let accessToken;
      
      if (appId) {
        // Get token for specific app
        const app = user.facebookApps.find(app => app._id.toString() === appId);
        if (!app) {
          throw new Error('Facebook app not found');
        }
        accessToken = app.accessToken;
      } else {
        // Use legacy token if no app specified
        accessToken = user.accessToken;
        
        // If no legacy token, use the first app token
        if (!accessToken && user.facebookApps.length > 0) {
          accessToken = user.facebookApps[0].accessToken;
        }
      }
      
      if (!accessToken) {
        throw new Error('No Facebook access token found');
      }
      
      // Get pages from Facebook
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category'
        }
      });
      
      if (!response.data || !response.data.data) {
        return [];
      }
      
      return response.data.data.map(page => ({
        pageId: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category
      }));
    } catch (error) {
      console.error('Error getting user pages:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(`Facebook API Error: ${error.response.data.error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Get all lead forms for a page
   * @param {string} pageId - Page ID
   * @param {string} pageAccessToken - Page access token
   * @returns {Promise<Array>} Array of forms
   */
  async getPageForms(pageId, pageAccessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}/leadgen_forms`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,name,status,created_time'
        }
      });
      
      if (!response.data || !response.data.data) {
        return [];
      }
      
      return response.data.data.map(form => ({
        formId: form.id,
        formName: form.name,
        status: form.status,
        createdTime: form.created_time
      }));
    } catch (error) {
      console.error(`Error getting forms for page ${pageId}:`, error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(`Facebook API Error: ${error.response.data.error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Discover and save all forms for a user
   * @param {string} userId - User ID
   * @param {string} [appId] - Facebook app ID (optional)
   * @returns {Promise<Object>} Discovery results
   */
  async discoverAndSaveForms(userId, appId = null) {
    try {
      // Get all pages the user manages
      const pages = await this.getUserPages(userId, appId);
      
      if (pages.length === 0) {
        return {
          success: true,
          message: 'No Facebook pages found',
          pages: 0,
          forms: 0
        };
      }
      
      let totalForms = 0;
      const results = [];
      
      // For each page, get all lead forms
      for (const page of pages) {
        try {
          const forms = await this.getPageForms(page.pageId, page.accessToken);
          
          // Save each form to the database
          for (const form of forms) {
            try {
              // Check if form already exists
              const existingForm = await Form.findOne({
                userId,
                formId: form.formId
              });
              
              if (existingForm) {
                // Update existing form
                existingForm.formName = form.formName;
                existingForm.pageId = page.pageId;
                existingForm.pageName = page.name;
                
                if (appId) {
                  existingForm.facebookAppId = appId;
                }
                
                await existingForm.save();
              } else {
                // Create new form
                const newForm = new Form({
                  userId,
                  formId: form.formId,
                  formName: form.formName,
                  pageId: page.pageId,
                  pageName: page.name,
                  facebookAppId: appId || null,
                  isActive: true
                });
                
                await newForm.save();
                totalForms++;
              }
            } catch (formError) {
              console.error(`Error saving form ${form.formId}:`, formError);
            }
          }
          
          results.push({
            pageId: page.pageId,
            pageName: page.name,
            formsCount: forms.length
          });
        } catch (pageError) {
          console.error(`Error processing page ${page.pageId}:`, pageError);
          results.push({
            pageId: page.pageId,
            pageName: page.name,
            error: pageError.message
          });
        }
      }
      
      return {
        success: true,
        pages: pages.length,
        forms: totalForms,
        results
      };
    } catch (error) {
      console.error('Error discovering forms:', error);
      throw error;
    }
  }
}

const facebookPageService = new FacebookPageService();
export default facebookPageService; 