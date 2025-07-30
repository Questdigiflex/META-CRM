const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { check } = require('express-validator');
const facebookTokenController = require('../controllers/facebookTokenController');
const facebookPageController = require('../controllers/facebookPageController');
const facebookLeadController = require('../controllers/facebookLeadController');

// Apply auth middleware to all routes
router.use(auth);

// Token management routes
// @route   POST /api/facebook/token
// @desc    Save a Facebook access token
// @access  Private
router.post('/token', [
  check('accessToken', 'Access token is required').not().isEmpty()
], facebookTokenController.saveToken);

// @route   POST /api/facebook/token/exchange
// @desc    Exchange a short-lived token for a long-lived token
// @access  Private
router.post('/token/exchange', facebookTokenController.exchangeToken);

// @route   GET /api/facebook/apps
// @desc    Get all Facebook apps for a user
// @access  Private
router.get('/apps', facebookTokenController.getUserApps);

// @route   DELETE /api/facebook/apps/:appId
// @desc    Delete a Facebook app
// @access  Private
router.delete('/apps/:appId', facebookTokenController.deleteApp);

// @route   DELETE /api/facebook/apps/direct/:appId
// @desc    Delete a Facebook app using direct MongoDB approach
// @access  Private
router.delete('/apps/direct/:appId', facebookTokenController.deleteAppDirect);

// @route   POST /api/facebook/app-credentials
// @desc    Save Facebook App ID and App Secret
// @access  Private
router.post('/app-credentials', facebookTokenController.saveAppCredentials);

// @route   GET /api/facebook/app-credentials
// @desc    Get Facebook App ID and App Secret status
// @access  Private
router.get('/app-credentials', facebookTokenController.getAppCredentials);

// Page and form discovery routes
// @route   GET /api/facebook/pages
// @desc    Get all Facebook pages for a user
// @access  Private
router.get('/pages', facebookPageController.getUserPages);

// @route   GET /api/facebook/pages/:pageId/forms
// @desc    Get all forms for a Facebook page
// @access  Private
router.get('/pages/:pageId/forms', facebookPageController.getPageForms);

// @route   GET /api/facebook/pages/:pageId/adaccounts
// @desc    Get all ad accounts for a Facebook page
// @access  Private
router.get('/pages/:pageId/adaccounts', facebookPageController.getPageAdAccounts);

// @route   GET /api/facebook/discover
// @desc    Discover and save all forms for a user
// @access  Private
router.get('/discover', facebookPageController.discoverForms);

// Lead fetching routes
// @route   GET /api/facebook/forms/:formId/leads
// @desc    Get all leads for a form
// @access  Private
router.get('/forms/:formId/leads', facebookLeadController.getLeads);

// @route   GET /api/facebook/forms/:formId/sync
// @desc    Sync leads for a form
// @access  Private
router.get('/forms/:formId/sync', facebookLeadController.handleManualSync);

// @route   POST /api/facebook/migrate-forms
// @desc    Migrate forms to fix missing facebookAppId
// @access  Private
router.post('/migrate-forms', async (req, res) => {
  try {
    const { migrateForms } = require('../scripts/migrateForms');
    await migrateForms();
    res.json({ success: true, message: 'Form migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
