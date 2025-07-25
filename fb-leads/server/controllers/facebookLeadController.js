// Verify the correct Lead import - should be at the top of the file
const Lead = require('../models/Lead');
const Form = require('../models/Form');
const facebookLeadService = require('../services/facebookLeadService');
const cron = require('node-cron');
const mongoose = require('mongoose');

class FacebookLeadController {
  constructor() {
    // Bind methods to maintain 'this' context
    this.handleManualSync = this.handleManualSync.bind(this);
    this.getLeads = this.getLeads.bind(this);
    this.getLead = this.getLead.bind(this);
    this.updateLeadStatus = this.updateLeadStatus.bind(this);
    this.exportLeads = this.exportLeads.bind(this);
  }

  /**
   * Syncs leads from Facebook to the database
   * @param {Object} options - Sync options
   * @param {string} options.userId - User ID
   * @param {string} options.formId - Form ID (optional)
   * @param {string} options.appId - Facebook app ID (optional)
   * @returns {Promise<Object>} Sync results
   */
  async syncFacebookLeads(options = {}) {
    try {
      const { userId, formId, appId } = options;
      console.log(`Starting Facebook lead sync for user: ${userId}...`);
      
      if (!userId) {
        throw new Error('User ID is required for syncing leads');
      }

      // Get the timestamp of the last synced lead for this user
      const query = { userId };
      if (formId) {
        query.formId = formId;
      }
      
      const lastLead = await Lead.findOne(query, { createdTime: 1 })
        .sort({ createdTime: -1 })
        .lean();

      console.log('Last synced lead time:', lastLead?.createdTime || 'No previous leads');

      // If we have a last lead, fetch only newer leads
      const syncOptions = {
        ...options,
        since: lastLead ? lastLead.createdTime.toISOString() : undefined
      };

      // Fetch leads from Facebook
      const leads = await facebookLeadService.fetchFacebookLeads(syncOptions);

      // Initialize results
      const results = {
        totalFetched: 0,
        inserted: 0,
        errors: [],
      };

      // If no leads were returned, return early with empty results
      if (!leads || !Array.isArray(leads)) {
        console.log('No leads returned from Facebook API');
        return results;
      }

      // Update total fetched
      results.totalFetched = leads.length;
      console.log(`Processing ${leads.length} leads...`);

      // Process each lead
      for (const lead of leads) {
        try {
          console.log(`Processing lead ID: ${lead.leadId}`);
          
          // Try to insert the lead, skip if it already exists
          const savedLead = await Lead.findOneAndUpdate(
            { leadId: lead.leadId },
            {
              ...lead,
              lastSyncedAt: new Date()
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true
            }
          );
          
          console.log(`Lead ${lead.leadId} saved to database`);
          results.inserted++;
        } catch (error) {
          console.error(`Error processing lead ${lead.leadId}:`, error);
          results.errors.push({
            leadId: lead.leadId,
            error: error.message
          });
        }
      }

      console.log('Sync results:', results);
      return results;
    } catch (error) {
      console.error('Lead sync failed:', error);
      throw new Error(`Lead sync failed: ${error.message}`);
    }
  }

  /**
   * Express route handler for manual sync
   */
  async handleManualSync(req, res) {
    try {
      const userId = req.userId;
      const { formId, appId } = req.query;
      
      // Sync leads
      const results = await this.syncFacebookLeads({
        userId,
        formId,
        appId
      });

      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error('Error syncing Facebook leads:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync Facebook leads'
      });
    }
  }

  /**
   * Starts the cron job for automatic lead syncing
   */
  startCronJob() {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        console.log('Starting automated Facebook lead sync...');
        
        // Get all active forms
        const forms = await Form.find({ isActive: true }).populate('userId');
        
        console.log(`Found ${forms.length} active forms`);
        
        // Sync leads for each form
        for (const form of forms) {
          try {
            await this.syncFacebookLeads({
              userId: form.userId,
              formId: form.formId,
              appId: form.facebookAppId // Use the app ID associated with the form
            });
          } catch (error) {
            console.error(`Error syncing leads for form ${form.formId}:`, error);
          }
        }
        
        console.log('Facebook lead sync completed');
      } catch (error) {
        console.error('Facebook lead sync failed:', error);
      }
    });
    
    console.log('Facebook lead sync cron job started');
  }

  /**
   * Get all Facebook leads with pagination and enhanced filtering
   */
  async getLeads(req, res) {
    try {
      const userId = req.userId;
      const { 
        page = 1, 
        limit = 10, 
        formId, 
        pageId,
        startDate, 
        endDate, 
        status,
        search
      } = req.query;
      
      // Build query
      const query = { userId };
      
      // Add form filter if provided
      if (formId) {
        query.formId = formId;
      }
      
      // Add page filter if provided
      if (pageId) {
        query.pageId = pageId;
      }
      
      // Add date range filter if provided
      if (startDate || endDate) {
        query.createdTime = {};
        if (startDate) query.createdTime.$gte = new Date(startDate);
        if (endDate) query.createdTime.$lte = new Date(endDate);
      }
      
      // Add status filter if provided
      if (status) {
        query.status = status;
      }
      
      // Add search filter if provided
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      const leads = await Lead.find(query)
        .sort({ createdTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const count = await Lead.countDocuments(query);

      res.json({
        success: true,
        data: leads,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      });
    } catch (error) {
      console.error('Error fetching Facebook leads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Facebook leads'
      });
    }
  }

  /**
   * Get a specific Facebook lead by ID
   */
  async getLead(req, res) {
    try {
      const userId = req.userId;
      const leadId = req.params.id;
      
      // Create a query that safely checks for either MongoDB ObjectId or Facebook leadId
      let query = { userId };
      
      // Check if the ID is a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(leadId)) {
        query._id = leadId;
      } else {
        // If not a valid ObjectId, search by leadId instead
        query.leadId = leadId;
      }
      
      const lead = await Lead.findOne(query).lean();
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Facebook lead not found'
        });
      }

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      console.error('Error fetching Facebook lead:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Facebook lead'
      });
    }
  }

  /**
   * Updates a lead's status
   */
  async updateLeadStatus(req, res) {
    try {
      const userId = req.userId;
      const leadId = req.params.id;
      const { status, notes } = req.body;

      // Create a query that safely checks for either MongoDB ObjectId or Facebook leadId
      let query = { userId };
      
      // Check if the ID is a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(leadId)) {
        query._id = leadId;
      } else {
        // If not a valid ObjectId, search by leadId instead
        query.leadId = leadId;
      }

      const lead = await Lead.findOneAndUpdate(
        query,
        { status, notes },
        { new: true }
      );

      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Export leads to CSV with enhanced fields
   */
  async exportLeads(req, res) {
    try {
      const userId = req.userId;
      const { formId, pageId, startDate, endDate, status } = req.query;
      
      // Build query
      const query = { userId };
      
      // Add form filter if provided
      if (formId) {
        query.formId = formId;
      }
      
      // Add page filter if provided
      if (pageId) {
        query.pageId = pageId;
      }
      
      // Add date range filter if provided
      if (startDate || endDate) {
        query.createdTime = {};
        if (startDate) query.createdTime.$gte = new Date(startDate);
        if (endDate) query.createdTime.$lte = new Date(endDate);
      }
      
      // Add status filter if provided
      if (status) {
        query.status = status;
      }

      const leads = await Lead.find(query)
        .sort({ createdTime: -1 })
        .lean();
        
      if (leads.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No leads found matching the criteria'
        });
      }
      
      // Generate CSV header with enhanced fields
      const csvHeader = [
        'Lead ID',
        'Form ID',
        'Form Name',
        'Page ID',
        'Page Name',
        'Full Name',
        'Email',
        'Phone',
        'Created Time',
        'Status',
        'Campaign',
        'Ad Set',
        'Ad',
        'Notes'
      ].join(',');
      
      // Generate CSV rows
      const csvRows = leads.map(lead => {
        return [
          lead.leadId,
          lead.formId,
          lead.formName || '',
          lead.pageId || '',
          lead.pageName || '',
          lead.fullName || '',
          lead.email || '',
          lead.phone || '',
          lead.createdTime ? new Date(lead.createdTime).toISOString() : '',
          lead.status || 'new',
          lead.rawData?.campaignName || '',
          lead.rawData?.adsetName || '',
          lead.rawData?.adName || '',
          lead.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });
      
      // Combine header and rows
      const csv = [csvHeader, ...csvRows].join('\n');
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Send CSV
      res.send(csv);
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export leads'
      });
    }
  }
}

// Create and export a singleton instance
const controller = new FacebookLeadController();

module.exports = controller; 