//backend/routes/userRoutes.js
/**
 * @module backend/routes/userRoutes
 * @description This module is used for defining the User routes.
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');



// Register a new user
router.post('/register', userController.registerUser);

// User login
router.post('/login', userController.loginUser);

// Get current user
router.get('/me', authenticate, userController.getCurrentUser);

// Update user profile
router.put('/me', authenticate, userController.updateUserProfile);

router.delete('/me', authenticate, userController.deleteUserProfile);

module.exports = router;
