/**
 * @module backend/controllers/adminController
 * @description This file contains the controller functions for managing Users in the database.
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */

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

    const users = await User.find().select('-password -apiKey').lean();

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
    const { userId } = req.params; 

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    // Find user by ID, excluding password and API key
    const user = await User.findById(userId).select('-password -apiKey').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const transformedUser = {
      _id: user._id,
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      email: user.email,
      role: user.role,
      homeCity: user.homeCity,
      age: user.age,
      image: user.image,
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
    const { userId } = req.params;
    const admin = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    if (admin._id.toString() === userId) {
      logger.info(`Admin ${admin.email} is updating their own profile.`);
      // ! Decide whether to allow or restrict certain changes for admins, maybe add a super admin
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isRoleChanged = req.body.role && req.body.role !== user.role;

    if (isRoleChanged) {
      const { secretCode } = req.body;
      const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'YOUR_SECRET_KEY'; 

      if (secretCode !== ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid secret code for role change.' });
      }
    }

    user.name.firstName = req.body.firstName || user.name.firstName;
    user.name.lastName = req.body.lastName || user.name.lastName;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.homeCity = req.body.homeCity || user.homeCity;
    user.age = req.body.age !== undefined ? req.body.age : user.age;

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
        image: user.image,
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

    if (req.user._id.toString() === userId) {
      logger.warn(`Admin ${req.user.email} attempted to delete themselves.`);
      return res.status(400).json({ message: 'Admins cannot delete themselves.' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      logger.warn(`User not found for deletion: ID ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.image) {
      const imagePath = path.join(__dirname, '..', user.image);
      try {
        await fs.promises.unlink(imagePath);
        logger.info(`Deleted user image: ${imagePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') { // Ignore file not found errors
          logger.error(`Error deleting user image: ${err.message}`);
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