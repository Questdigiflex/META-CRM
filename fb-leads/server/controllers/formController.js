import Form from '../models/Form.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Add a new Facebook form
 */
export const addForm = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { formId, formName } = req.body;
    const userId = req.userId;

    // Check if form already exists for this user
    const existingForm = await Form.findOne({ userId, formId });
    if (existingForm) {
      return res.status(400).json({ 
        success: false, 
        error: 'Form already exists for this user' 
      });
    }

    // Create new form
    const form = new Form({
      userId,
      formId,
      formName: formName || null
    });

    // Save form to database
    await form.save();

    res.status(201).json({
      success: true,
      data: form
    });
  } catch (error) {
    console.error('Add form error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

/**
 * Get all forms for a user
 */
export const getForms = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all forms for user
    const forms = await Form.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: forms.length,
      data: forms
    });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

/**
 * Delete a form
 */
export const deleteForm = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.userId;
    
    // Create a query that safely checks for either MongoDB ObjectId or Facebook formId
    let query = { userId };
    
    // Check if the ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      // If not a valid ObjectId, search by formId instead
      query.formId = id;
    }

    // Find form by id and user id
    const form = await Form.findOne(query);

    if (!form) {
      return res.status(404).json({ 
        success: false, 
        error: 'Form not found' 
      });
    }

    // Delete form
    await form.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

/**
 * Update a form
 */
export const updateForm = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.userId;
    const { formName, isActive } = req.body;
    
    // Create a query that safely checks for either MongoDB ObjectId or Facebook formId
    let query = { userId };
    
    // Check if the ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      // If not a valid ObjectId, search by formId instead
      query.formId = id;
    }

    // Find form by id and user id
    let form = await Form.findOne(query);

    if (!form) {
      return res.status(404).json({ 
        success: false, 
        error: 'Form not found' 
      });
    }

    // Update form fields if provided
    if (formName !== undefined) form.formName = formName;
    if (isActive !== undefined) form.isActive = isActive;

    // Save updated form
    await form.save();

    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
}; 