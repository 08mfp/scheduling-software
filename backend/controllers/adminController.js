// backend/controllers/adminController.js

const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const logger = require('../middleware/logger');
const path = require('path');

/**
 * @desc    Get All Users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users, excluding passwords and API keys
    const users = await User.find().select('-password -apiKey').lean();

    // Transform users to include firstName and lastName at the top level
    const transformedUsers = users.map(user => ({
      _id: user._id,
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      email: user.email,
      role: user.role,
      homeCity: user.homeCity,
      age: user.age,
      image: user.image,
    }));

    res.status(200).json({ users: transformedUsers });
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`);
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

/**
 * @desc    Get User By ID
 * @route   GET /api/admin/users/:userId
 * @access  Private (Admin only)
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from URL parameters

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    // Find user by ID, excluding password and API key
    const user = await User.findById(userId).select('-password -apiKey').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Transform user data
    const transformedUser = {
      _id: user._id,
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      email: user.email,
      role: user.role,
      homeCity: user.homeCity,
      age: user.age,
      image: user.image,
      // Add any additional fields as necessary
    };

    res.status(200).json({ user: transformedUser });
  } catch (error) {
    logger.error(`Error fetching user by ID: ${error.message}`);
    res.status(500).json({ message: 'Server error while fetching user.' });
  }
};

/**
 * @desc    Update Any User
 * @route   PUT /api/admin/users/:userId
 * @access  Private (Admin only)
 */
exports.updateAnyUser = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from URL
    const admin = req.user; // Authenticated admin from middleware

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    // Prevent admin from changing their own role or deleting themselves if necessary
    if (admin._id.toString() === userId) {
      logger.info(`Admin ${admin.email} is updating their own profile.`);
      // Optional: Decide whether to allow or restrict certain changes
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Detect if role is being changed
    const isRoleChanged = req.body.role && req.body.role !== user.role;

    if (isRoleChanged) {
      const { secretCode } = req.body;
      const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'YOUR_SECRET_KEY'; // Use environment variable

      if (secretCode !== ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid secret code for role change.' });
      }
    }

    // Update fields
    user.name.firstName = req.body.firstName || user.name.firstName;
    user.name.lastName = req.body.lastName || user.name.lastName;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.homeCity = req.body.homeCity || user.homeCity;
    user.age = req.body.age !== undefined ? req.body.age : user.age;

    // Handle password change
    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    logger.info(`User updated successfully: ${user.email}`);

    res.status(200).json({
      message: 'User updated successfully.',
      user: {
        _id: user._id,
        firstName: user.name.firstName,
        lastName: user.name.lastName,
        email: user.email,
        role: user.role,
        homeCity: user.homeCity,
        age: user.age,
        image: user.image, // Assuming image is still managed elsewhere
      },
    });
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    res.status(500).json({ message: 'Server error while updating user.' });
  }
};

/**
 * @desc    Delete Any User
 * @route   DELETE /api/admin/users/:userId
 * @access  Private (Admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      logger.warn(`Admin ${req.user.email} attempted to delete themselves.`);
      return res.status(400).json({ message: 'Admins cannot delete themselves.' });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    // Find and delete user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      logger.warn(`User not found for deletion: ID ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle image deletion if the user has an associated image
    if (user.image) {
      const imagePath = path.join(__dirname, '..', user.image); // Adjust path as necessary
      try {
        await fs.promises.unlink(imagePath);
        logger.info(`Deleted user image: ${imagePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') { // Ignore file not found errors
          logger.error(`Error deleting user image: ${err.message}`);
          // Optionally, respond with an error or continue
        }
      }
    }

    logger.info(`User deleted: ${user.email}`);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};
