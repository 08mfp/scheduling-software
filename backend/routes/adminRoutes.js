// backend/routes/adminRoutes.js
/**
 * @module backend/routes/adminRoutes
 * @description This file contains the routes for managing users with 'admin' role.
 * @api Admin Routes
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication and authorization middleware to all admin routes
router.use(authenticate);
router.use(authorize('admin')); // Only users with 'admin' role can access these routes

// Get all users
router.get('/users', adminController.getAllUsers);

// Get user by ID
router.get('/users/:userId', adminController.getUserById);

// Update any user
router.put('/users/:userId', adminController.updateAnyUser);

// Delete any user
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;
