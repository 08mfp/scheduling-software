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


// router.get('/', stadiumController.getAllStadiums);
// router.post('/', stadiumController.createStadium);
// router.get('/:id', stadiumController.getStadiumById);
// router.put('/:id', stadiumController.updateStadium);
// router.delete('/:id', stadiumController.deleteStadium);

// Viewer and above access
router.get('/', authenticate, authorize('admin', 'manager', 'viewer'), stadiumController.getAllStadiums);
router.get('/:id', authenticate, authorize('admin', 'manager', 'viewer'), stadiumController.getStadiumById);

// Admin-only access
router.post('/', authenticate, authorize('admin'), stadiumController.createStadium);
router.put('/:id', authenticate, authorize('admin'), stadiumController.updateStadium);
router.delete('/:id', authenticate, authorize('admin'), stadiumController.deleteStadium);

module.exports = router;