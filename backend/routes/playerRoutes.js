/**
 * @module backend/routes/playerRoutes
 * @description This module is used for defining player routes for the application.
 * @api Player Routes
 * @version 2.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const { authenticate, authorize } = require('../middleware/auth');

// router.get('/', playerController.getAllPlayers);
// router.post('/', playerController.createPlayer);
// router.get('/:id', playerController.getPlayerById);
// router.put('/:id', playerController.updatePlayer);
// router.delete('/:id', playerController.deletePlayer);

// Manager and above access
router.get('/', authenticate, authorize('admin', 'manager', 'viewer'), playerController.getAllPlayers); // maybe allow regsitered users too
router.get('/:id', authenticate, authorize('admin', 'manager', 'viewer'), playerController.getPlayerById);
router.post('/', authenticate, authorize('admin', 'manager'), playerController.createPlayer);
router.put('/:id', authenticate, authorize('admin', 'manager'), playerController.updatePlayer);

// Admin-only access
router.delete('/:id', authenticate, authorize('admin'), playerController.deletePlayer);

module.exports = router;