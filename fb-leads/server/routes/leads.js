const express = require('express');
const facebookLeadController = require('../controllers/facebookLeadController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/leads
// @desc    Get all leads with pagination
// @access  Private
router.get('/', facebookLeadController.getLeads);

// @route   GET /api/leads/fetch
// @desc    Manually fetch leads from Facebook
// @access  Private
router.get('/fetch', facebookLeadController.handleManualSync);

// @route   GET /api/leads/export
// @desc    Export leads to CSV
// @access  Private
router.get('/export', facebookLeadController.exportLeads);

// @route   GET /api/leads/:id
// @desc    Get a specific lead
// @access  Private
router.get('/:id', facebookLeadController.getLead);

// @route   PUT /api/leads/:id
// @desc    Update lead status
// @access  Private
router.put('/:id', facebookLeadController.updateLeadStatus);

module.exports = router; 