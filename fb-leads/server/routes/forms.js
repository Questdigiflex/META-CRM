const express = require('express');
const { check } = require('express-validator');
const formController = require('../controllers/formController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   POST /api/forms/add
// @desc    Add a new form
// @access  Private
router.post(
  '/add',
  [
    check('formId', 'Form ID is required').not().isEmpty()
  ],
  formController.addForm
);

// @route   GET /api/forms/list
// @desc    Get all forms for a user
// @access  Private
router.get('/list', formController.getForms);

// @route   DELETE /api/forms/delete/:id
// @desc    Delete a form
// @access  Private
router.delete('/delete/:id', formController.deleteForm);

// @route   PUT /api/forms/update/:id
// @desc    Update a form
// @access  Private
router.put('/update/:id', formController.updateForm);

module.exports = router; 