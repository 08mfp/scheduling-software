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

router.use(authenticate);
router.use(authorize('admin'));
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateAnyUser);
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;