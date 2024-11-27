// backend/routes/stadiumRoutes.js
/**
 * @module backend/routes/stadiumRoutes
 * @description This module is used for defining stadium routes for the application.
 * @api Stadium Routes
 * @version 2.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const stadiumController = require('../controllers/stadiumController');
const { authenticate, authorize } = require('../middleware/auth');

// // Route to fetch all stadiums
// router.get('/', stadiumController.getAllStadiums);

// // Route to create a stadium
// router.post('/', stadiumController.createStadium);

// // Route to fetch a stadium by id
// router.get('/:id', stadiumController.getStadiumById);

// // Route to update a stadium by id
// router.put('/:id', stadiumController.updateStadium);

// // Route to delete a stadium by id
// router.delete('/:id', stadiumController.deleteStadium);

// Viewer and above can read stadiums
router.get('/', authenticate, authorize('admin', 'manager', 'viewer'), stadiumController.getAllStadiums);
router.get('/:id', authenticate, authorize('admin', 'manager', 'viewer'), stadiumController.getStadiumById);

// Admin-only can create, update, delete stadiums
router.post('/', authenticate, authorize('admin'), stadiumController.createStadium);
router.put('/:id', authenticate, authorize('admin'), stadiumController.updateStadium);
router.delete('/:id', authenticate, authorize('admin'), stadiumController.deleteStadium);



module.exports = router;
