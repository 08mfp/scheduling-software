//backend/controllers/userController.js
/**
 * @module backend/controllers/userController
 * @description This module is used for defining the User controller functions, e.g. registerUser, loginUser, generateApiKey, queryUser, etc. 
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */

//! simplicity, password handling is omitted. 
//! In a real application, you should include password hashing and verification using packages like bcrypt.

const User = require('../models/User');
const crypto = require('crypto');
const logger = require('../middleware/logger');


/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
exports.registerUser = async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
  
      // Check if the user already exists
      let user = await User.findOne({ email });
      if (user) {
        logger.warn(`Attempt to register with existing email: ${email}`);
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Create new user
      user = new User({
        name: { firstName, lastName },
        email,
        password,
        role: role || 'guest', // Default role is 'guest'
      });
  
      // Generate API key
      user.generateApiKey();
  
      await user.save();
  
      logger.info(`User registered: ${email}`);
  
      res.status(201).json({
        message: 'User registered successfully',
        apiKey: user.apiKey,
      });
    } catch (error) {
      logger.error(`Error registering user: ${error.message}`);
      res.status(500).json({ message: 'Server error' });
    }
  };

/**
 * @desc    User login
 * @route   POST /api/users/login
 * @access  Public
 */
exports.loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        logger.warn(`Failed login attempt for non-existent email: ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Compare password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        logger.warn(`Failed login attempt for email: ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Generate a new API key
      user.generateApiKey();
      user.requestCount = 0;
      user.requestResetTime = Date.now();
      await user.save();
  
      logger.info(`User logged in: ${email}`);
  
      res.status(200).json({
        message: 'Login successful',
        apiKey: user.apiKey,
      });
    } catch (error) {
      logger.error(`Error logging in user: ${error.message}`);
      res.status(500).json({ message: 'Server error' });
    }
  };


/**
 * @desc    Get User details
 * @route   GET /api/users/me 
 * @access  Private
 */
exports.getCurrentUser = async (req, res) => {
    try {
      const user = req.user; // The authenticated user from the middleware
  
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
  
      // Respond with user details (excluding sensitive information)
      res.status(200).json({
        firstName: user.name.firstName,
        lastName: user.name.lastName,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      logger.error(`Error fetching current user: ${error.message}`);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  
