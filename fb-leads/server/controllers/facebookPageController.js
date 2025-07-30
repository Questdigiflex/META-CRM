const User = require('../models/User');
const Form = require('../models/Form');
const axios = require('axios');

// @route   GET /api/facebook/pages
// @desc    Get all pages a user manages
// @access  Private
const getUserPages = async (req, res) => {
  try {
    const { appId } = req.query;

    console.log('GET /api/facebook/pages - App ID received:', appId);

    if (!appId) {
      return res.status(400).json({ success: false, error: 'App ID is required' });
    }

    // Find user and the specific app
    const user = await User.findById(req.userId);
    console.log('User found:', user ? user._id : 'Not found');

    if (!user || !user.facebookApps) {
      return res.status(404).json({ success: false, error: 'User or apps not found' });
    }

    console.log('Available apps:', user.facebookApps.map(app => ({
      _id: app._id.toString(),
      appName: app.appName || 'Unnamed',
      appId: app.appId
    })));

    // Try to find the app by _id or by name
    let app = user.facebookApps.find(app => app._id.toString() === appId);
    console.log('App found by ID match:', app ? 'Yes' : 'No');
    
    // If not found by ID, try by name (for backwards compatibility)
    if (!app && appId) {
      // Check for exact name match
      app = user.facebookApps.find(app => 
        (app.appName && app.appName.toLowerCase() === appId.toLowerCase()) ||
        (!app.appName && appId === 'Unnamed App')
      );
      console.log('App found by name match:', app ? 'Yes' : 'No');
      
      // Special case for "Unnamed App" - find first app with null/undefined name
      if (!app && appId === 'Unnamed App') {
        app = user.facebookApps.find(app => !app.appName);
        console.log('App found by "Unnamed App" special case:', app ? 'Yes' : 'No');
      }
      
      // Last resort - just use the first app if available
      if (!app && user.facebookApps.length > 0) {
        app = user.facebookApps[0];
        console.log('Using first available app as fallback');
      }
    }

    if (!app) {
      return res.status(404).json({ 
        success: false, 
        error: `App not found with ID: ${appId}. Please make sure the app ID is correct.`
      });
    }

    console.log('Using app:', {
      _id: app._id.toString(),
      appName: app.appName || 'Unnamed',
      appId: app.appId
    });

    // Get pages from Facebook
    try {
      console.log(`Fetching pages with access token from app: ${app.appName || 'Unknown app'}`);
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${app.accessToken}&fields=id,name,category,access_token`
      );

      if (!response.data || !response.data.data) {
        return res.status(400).json({ success: false, error: 'Failed to fetch pages' });
      }

      // After fetching pages from Facebook:
      if (response.data && response.data.data) {
        const pages = response.data.data.map(page => ({
          pageId: page.id,
          name: page.name,
          category: page.category,
          accessToken: page.access_token
        }));
        // Update the app.pages[] in user.facebookApps
        if (user.facebookApps && app) {
          const appIndex = user.facebookApps.findIndex(a => a._id.toString() === app._id.toString());
          if (appIndex !== -1) {
            user.facebookApps[appIndex].pages = pages;
            await user.save();
          }
        }
        console.log(`Successfully fetched ${pages.length} pages`);
        return res.json({ success: true, data: pages });
      }
    } catch (error) {
      console.error('Facebook API error:', error.response?.data || error.message);
      let errorMessage = 'Failed to fetch pages';
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
        
        // Give more specific guidance for common errors
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          errorMessage += '. Your access token may be expired or invalid. Please generate a new one.';
        }
      }
      
      return res.status(400).json({ 
        success: false, 
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error getting pages:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @route   GET /api/facebook/forms
// @desc    Get all lead forms for a page
// @access  Private
const getPageForms = async (req, res) => {
  try {
    const { pageId, appId } = req.query;

    console.log('GET /api/facebook/forms - App ID received:', appId, 'Page ID:', pageId);

    if (!pageId || !appId) {
      return res.status(400).json({ success: false, error: 'Page ID and App ID are required' });
    }

    // Find user and the specific app
    const user = await User.findById(req.userId);
    console.log('User found:', user ? user._id : 'Not found');

    if (!user || !user.facebookApps) {
      return res.status(404).json({ success: false, error: 'User or apps not found' });
    }

    console.log('Available apps:', user.facebookApps.map(app => ({
      _id: app._id.toString(),
      appName: app.appName || 'Unnamed',
      appId: app.appId
    })));

    // Try to find the app by _id or by name
    let app = user.facebookApps.find(app => app._id.toString() === appId);
    console.log('App found by ID match:', app ? 'Yes' : 'No');
    
    // If not found by ID, try by name (for backwards compatibility)
    if (!app && appId) {
      // Check for exact name match
      app = user.facebookApps.find(app => 
        (app.appName && app.appName.toLowerCase() === appId.toLowerCase()) ||
        (!app.appName && appId === 'Unnamed App')
      );
      console.log('App found by name match:', app ? 'Yes' : 'No');
      
      // Special case for "Unnamed App" - find first app with null/undefined name
      if (!app && appId === 'Unnamed App') {
        app = user.facebookApps.find(app => !app.appName);
        console.log('App found by "Unnamed App" special case:', app ? 'Yes' : 'No');
      }
      
      // Last resort - just use the first app if available
      if (!app && user.facebookApps.length > 0) {
        app = user.facebookApps[0];
        console.log('Using first available app as fallback');
      }
    }

    if (!app) {
      return res.status(404).json({ 
        success: false, 
        error: `App not found with ID: ${appId}. Please make sure the app ID is correct.`
      });
    }

    console.log('Using app:', {
      _id: app._id.toString(),
      appName: app.appName || 'Unnamed',
      appId: app.appId
    });

    // Get page access token
    try {
      console.log(`Fetching pages for app: ${app.appName || 'Unknown app'}`);
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${app.accessToken}&fields=id,access_token`
      );

      if (!pagesResponse.data || !pagesResponse.data.data) {
        return res.status(400).json({ success: false, error: 'Failed to fetch pages' });
      }

      const page = pagesResponse.data.data.find(p => p.id === pageId);

      if (!page) {
        return res.status(404).json({ 
          success: false, 
          error: `Page not found with ID: ${pageId}. Make sure this page is accessible with your app.` 
        });
      }

      // Get forms for the page
      console.log(`Fetching forms for page: ${pageId}`);
      const formsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${page.access_token}`
      );

      if (!formsResponse.data || !formsResponse.data.data) {
        return res.json({ success: true, data: [] });
      }

      const forms = formsResponse.data.data.map(form => ({
        formId: form.id,
        name: form.name,
        status: form.status,
        pageId
      }));

      console.log(`Successfully fetched ${forms.length} forms for page ${pageId}`);
      return res.json({ success: true, data: forms });
    } catch (error) {
      console.error('Facebook API error:', error.response?.data || error.message);
      let errorMessage = 'Failed to fetch forms';
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
        
        // Give more specific guidance for common errors
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          errorMessage += '. Your access token may be expired or invalid. Please generate a new one.';
        }
      }
      
      return res.status(400).json({ 
        success: false, 
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error getting forms:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @route   GET /api/facebook/discover
// @desc    Discover and save all forms for a user
// @access  Private
const discoverForms = async (req, res) => {
  try {
    const { appId } = req.query;

    console.log('GET /api/facebook/discover - App ID received:', appId);

    if (!appId) {
      return res.status(400).json({ success: false, error: 'App ID is required' });
    }

    // Find user and the specific app
    const user = await User.findById(req.userId);
    console.log('User found:', user ? user._id : 'Not found');

    if (!user || !user.facebookApps) {
      return res.status(404).json({ success: false, error: 'User or apps not found' });
    }

    console.log('Available apps:', user.facebookApps.map(app => ({
      _id: app._id.toString(),
      appName: app.appName || 'Unnamed',
      appId: app.appId
    })));

    // Try to find the app by _id or by name
    let app = user.facebookApps.find(app => app._id.toString() === appId);
    console.log('App found by ID match:', app ? 'Yes' : 'No');
    
    // If not found by ID, try by name (for backwards compatibility)
    if (!app && appId) {
      // Check for exact name match
      app = user.facebookApps.find(app => 
        (app.appName && app.appName.toLowerCase() === appId.toLowerCase()) ||
        (!app.appName && appId === 'Unnamed App')
      );
      console.log('App found by name match:', app ? 'Yes' : 'No');
      
      // Special case for "Unnamed App" - find first app with null/undefined name
      if (!app && appId === 'Unnamed App') {
        app = user.facebookApps.find(app => !app.appName);
        console.log('App found by "Unnamed App" special case:', app ? 'Yes' : 'No');
      }
      
      // Last resort - just use the first app if available
      if (!app && user.facebookApps.length > 0) {
        app = user.facebookApps[0];
        console.log('Using first available app as fallback');
      }
    }

    if (!app) {
      return res.status(404).json({ 
        success: false, 
        error: `App not found with ID: ${appId}. Please make sure the app ID is correct.`
      });
    }

    console.log('Using app:', {
      _id: app._id.toString(),
      appName: app.appName || 'Unnamed',
      appId: app.appId
    });

    // Get pages from Facebook
    let pages = [];
    try {
      console.log(`Discovering forms for app: ${app.appName || 'Unknown app'} with token: ${app.accessToken.substring(0, 10)}...`);
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${app.accessToken}&fields=id,name,category,access_token`
      );

      if (!response.data || !response.data.data) {
        return res.status(400).json({ success: false, error: 'Failed to fetch pages' });
      }

      pages = response.data.data;
      console.log(`Found ${pages.length} pages`);
    } catch (error) {
      console.error('Facebook API error:', error.response?.data || error.message);
      let errorMessage = 'Failed to fetch pages';
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
        
        // Give more specific guidance for common errors
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          errorMessage += '. Your access token may be expired or invalid. Please generate a new one.';
        }
      }
      
      return res.status(400).json({ 
        success: false, 
        error: errorMessage
      });
    }

    // For each page, get forms
    let totalForms = 0;
    let savedForms = 0;

    for (const page of pages) {
      try {
        console.log(`Fetching forms for page ${page.name} (${page.id})`);
        const formsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?access_token=${page.access_token}`
        );

        if (formsResponse.data && formsResponse.data.data) {
          const forms = formsResponse.data.data;
          totalForms += forms.length;
          console.log(`Found ${forms.length} forms for page ${page.name}`);

          // Save each form to database
          for (const form of forms) {
            // Check if form already exists
            const existingForm = await Form.findOne({ 
              formId: form.id,
              userId: req.userId
            });

            if (!existingForm) {
              // Get form details
              const formDetailsResponse = await axios.get(
                `https://graph.facebook.com/v18.0/${form.id}?access_token=${page.access_token}&fields=name,status,page,created_time`
              );

              const formDetails = formDetailsResponse.data;
              console.log(`Saving new form: ${formDetails.name} (${form.id})`);

              // Create new form
              const newForm = new Form({
                userId: req.userId,
                formId: form.id,
                formName: formDetails.name,
                pageId: page.id,
                pageName: page.name,
                facebookAppId: app._id.toString(), // Use the actual MongoDB ID
                status: formDetails.status,
                isActive: true,
                createdAt: formDetails.created_time ? new Date(formDetails.created_time) : new Date()
              });

              await newForm.save();
              savedForms++;
            } else {
              console.log(`Form ${form.id} already exists in database`);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching forms for page ${page.id}:`, error.response?.data || error.message);
        // Continue with next page even if this one fails
      }
    }

    return res.json({ 
      success: true, 
      message: `Discovered ${totalForms} forms from ${pages.length} pages, saved ${savedForms} new forms`,
      forms: totalForms,
      pages: pages.length,
      newForms: savedForms
    });
  } catch (error) {
    console.error('Error discovering forms:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get all ad accounts for a Facebook page
 * @route GET /api/facebook/pages/:pageId/adaccounts
 * @access Private
 */
const getPageAdAccounts = async (req, res) => {
  try {
    const { pageId } = req.params;
    const user = await User.findById(req.userId);
    if (!user || !user.facebookApps) {
      return res.status(404).json({ success: false, error: 'User or apps not found' });
    }
    // Find the page's access token from user's pages
    let pageAccessToken = null;
    for (const app of user.facebookApps) {
      if (app.pages && app.pages.length > 0) {
        const page = app.pages.find(p => p.pageId === pageId);
        if (page && page.accessToken) {
          pageAccessToken = page.accessToken;
          break;
        }
      }
    }
    // If not found in stored pages, try to fetch pages and find the token
    if (!pageAccessToken) {
      // Try all app tokens to fetch pages
      for (const app of user.facebookApps) {
        if (!app.accessToken) continue;
        try {
          const axios = require('axios');
          const response = await axios.get(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${app.accessToken}&fields=id,access_token`
          );
          if (response.data && response.data.data) {
            const page = response.data.data.find(p => p.id === pageId);
            if (page && page.access_token) {
              pageAccessToken = page.access_token;
              break;
            }
          }
        } catch (e) { /* ignore and try next app */ }
      }
    }
    if (!pageAccessToken) {
      return res.status(404).json({ success: false, error: 'Page access token not found' });
    }
    // Fetch ad accounts connected to this page
    const axios = require('axios');
    const adAccountsRes = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/adaccounts`,
      {
        params: {
          access_token: pageAccessToken,
          fields: 'id,name,account_id,account_status'
        }
      }
    );
    if (!adAccountsRes.data || !adAccountsRes.data.data) {
      return res.status(400).json({ success: false, error: 'Failed to fetch ad accounts for this page' });
    }
    return res.json({ success: true, data: adAccountsRes.data.data });
  } catch (error) {
    console.error('Error fetching ad accounts for page:', error.response?.data || error.message);
    let errorMessage = 'Failed to fetch ad accounts for this page';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }
    return res.status(500).json({ success: false, error: errorMessage });
  }
};

module.exports = {
  getUserPages,
  getPageForms,
  discoverForms,
  getPageAdAccounts,
}; 