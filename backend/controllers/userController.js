//backend/controllers/userController.js
/**
 * @module backend/controllers/userController
 * @description This module is used for defining the User controller functions, e.g. registerUser, loginUser, generateApiKey, queryUser, etc. 
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */



const User = require('../models/User');
const crypto = require('crypto');
const logger = require('../middleware/logger');
const upload = require('../middleware/upload');
const fs = require('fs');


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
        homeCity: user.homeCity,
        age: user.age,
        image: user.image,
      });
    } catch (error) {
      logger.error(`Error fetching current user: ${error.message}`);
      res.status(500).json({ message: 'Server error' });
    }
  };


// Update User Profile
/**
 * @desc    Update User Profile
 * @route   PUT /api/users/me
 * @access  Private
 */

exports.updateUserProfile = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      logger.error(`Error uploading image: ${err}`);
      return res.status(400).json({ message: err });
    } else {
      try {
        const user = req.user; // Retrieved from authentication middleware

        if (!user) {
          return res.status(401).json({ message: 'User not authenticated' });
        }

        // Update fields
        user.name.firstName = req.body.firstName || user.name.firstName;
        user.name.lastName = req.body.lastName || user.name.lastName;
        user.email = req.body.email || user.email;
        user.homeCity = req.body.homeCity || user.homeCity;
        user.age = req.body.age || user.age;

        // Handle password change
        if (req.body.password) {
          user.password = req.body.password;
        }

        // Handle image removal or upload
        if (req.body.removeImage === 'true') {
          // Delete old image if exists
          if (user.image) {
            const oldImagePath = '.' + user.image;
            try {
              await fs.promises.unlink(oldImagePath);
            } catch (err) {
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old image file:', err);
                return res.status(500).json({ message: 'Server error' });
              }
            }
          }
          user.image = undefined;
        } else if (req.file) {
          // Delete old image if exists
          if (user.image) {
            const oldImagePath = '.' + user.image;
            try {
              await fs.promises.unlink(oldImagePath);
            } catch (err) {
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old image file:', err);
                return res.status(500).json({ message: 'Server error' });
              }
            }
          }
          user.image = `/uploads/${req.file.filename}`;
        }

        await user.save();

        logger.info(`User profile updated: ${user.email}`);

        res.status(200).json({
          message: 'Profile updated successfully',
          user: {
            firstName: user.name.firstName,
            lastName: user.name.lastName,
            email: user.email,
            role: user.role,
            homeCity: user.homeCity,
            age: user.age,
            image: user.image,
          },
        });
      } catch (error) {
        logger.error(`Error updating user profile: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
      }
    }
  });
};
  
  

/**
 * @desc    Delete User Profile
 * @route   DELETE /api/users/me
 * @access  Private
 */
exports.deleteUserProfile = async (req, res) => {
  try {
      const user = req.user; // Retrieved from authentication middleware

      if (!user) {
          logger.warn('Attempt to delete profile without authentication.');
          return res.status(401).json({ message: 'User not authenticated.' });
      }

      // Prevent user from deleting themselves if necessary (optional)
      // For example, if you have a super-admin role that shouldn't be deleted

      // Handle image deletion if the user has an associated image
      if (user.image) {
          const imagePath = '.' + user.image; // Assuming image path is stored relative to the project root
          try {
              await fs.promises.unlink(imagePath);
              logger.info(`Deleted user image: ${imagePath}`);
          } catch (err) {
              if (err.code !== 'ENOENT') { // Ignore file not found errors
                  logger.error(`Error deleting user image: ${err.message}`);
                  return res.status(500).json({ message: 'Server error while deleting image.' });
              }
          }
      }

      // Delete the user from the database
      await User.findByIdAndDelete(user._id);
      logger.info(`User deleted: ${user.email}`);

      res.status(200).json({ message: 'User profile deleted successfully.' });
  } catch (error) {
      logger.error(`Error deleting user profile: ${error.message}`);
      res.status(500).json({ message: 'Server error.' });
  }
};