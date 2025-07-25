import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator';
import facebookTokenService from '../services/facebookTokenService.js';

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email }).catch(err => {
      console.error('Error finding user:', err);
      throw new Error('Database connection error. Please try again later.');
    });
    
    if (user) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      password
    });

    // Save user to database
    await user.save().catch(err => {
      console.error('Error saving user:', err);
      throw new Error('Failed to create user. Please try again later.');
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error' 
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).catch(err => {
      console.error('Error finding user:', err);
      throw new Error('Database connection error. Please try again later.');
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Get Facebook apps
    const apps = await facebookTokenService.getUserApps(user._id);

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        accessToken: user.accessToken,
        facebookApps: apps.map(app => ({
          id: app._id,
          appId: app.appId,
          appName: app.appName,
          tokenType: app.tokenType,
          expiresAt: app.expiresAt
        })),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error' 
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    // User is already attached to req object from auth middleware
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get Facebook apps
    const apps = await facebookTokenService.getUserApps(user._id);

    // Prepare response data
    const userData = user.toObject();
    
    // Add Facebook apps with masked tokens
    userData.facebookApps = apps.map(app => ({
      id: app._id,
      appId: app.appId,
      appName: app.appName,
      tokenType: app.tokenType,
      expiresAt: app.expiresAt,
      accessToken: app.accessToken ? `${app.accessToken.substring(0, 8)}...` : null
    }));

    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

/**
 * Update Facebook access token
 * @deprecated Use the facebookTokenController.saveToken method instead
 */
export const updateAccessToken = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Access token is required' 
      });
    }

    // Save token using the token service
    await facebookTokenService.saveUserToken(req.userId, { accessToken });

    // Get updated user
    const user = await User.findById(req.userId).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update access token error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
}; 