const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// @route   GET /api/analytics/insights
// @desc    Get Facebook Ads insights
// @access  Private
router.get('/insights', auth, analyticsController.getInsights);

// @route   GET /api/analytics/ad-accounts
// @desc    Get available ad accounts
// @access  Private
router.get('/ad-accounts', auth, analyticsController.getAdAccounts);

// @route   GET /api/analytics/pages
// @desc    Get available Facebook pages
// @access  Private
router.get('/pages', auth, analyticsController.getPages);

// @route   GET /api/analytics/ad-accounts-by-page
// @desc    Get ad accounts for a specific page
// @access  Private
router.get('/ad-accounts-by-page', auth, analyticsController.getAdAccountsByPage);

// @route   GET /api/analytics/export
// @desc    Export insights to CSV
// @access  Private
router.get('/export', auth, analyticsController.exportInsights);

module.exports = router; 