const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Default JWT secret if not provided in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fb_leads_default_secret_key_for_development';

/**
 * Authentication middleware to protect routes
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token, access denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token, authorization denied' 
    });
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = { auth, generateToken }; 