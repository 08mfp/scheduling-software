// backend/routes/adminRoutes.js

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
