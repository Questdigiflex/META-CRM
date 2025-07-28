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

// @route   GET /api/analytics/export
// @desc    Export insights to CSV
// @access  Private
router.get('/export', auth, analyticsController.exportInsights);

module.exports = router; 