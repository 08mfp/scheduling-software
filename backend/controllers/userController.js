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

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role } = req.body;

    // Check if the user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name: { firstName, lastName },
      email,
      role: role || 'guest', // Default role is 'guest'
    });

    // Generate API key
    user.generateApiKey();

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      apiKey: user.apiKey,
    });
  } catch (error) {
    console.error('Error registering user:', error);
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
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // For simplicity, we're not handling passwords here
    // In a real application, you should verify the password

    // Generate a new API key
    user.generateApiKey();
    user.requestCount = 0;
    user.requestResetTime = Date.now();
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      apiKey: user.apiKey,
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
