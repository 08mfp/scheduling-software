// backend/routes/playerRoutes.js
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

// // Route to fetch all players
// router.get('/', playerController.getAllPlayers);

// // Route to create a player
// router.post('/', playerController.createPlayer);

// // Route to fetch a player by id
// router.get('/:id', playerController.getPlayerById);

// // Route to update a player by id
// router.put('/:id', playerController.updatePlayer);

// // Route to delete a player by id
// router.delete('/:id', playerController.deletePlayer);

// Manager and above can create and edit players
router.get('/', authenticate, authorize('admin', 'manager'), playerController.getAllPlayers); // maybe allow regsitered users too
router.get('/:id', authenticate, authorize('admin', 'manager'), playerController.getPlayerById);
router.post('/', authenticate, authorize('admin', 'manager'), playerController.createPlayer);
router.put('/:id', authenticate, authorize('admin', 'manager'), playerController.updatePlayer);

// Admin-only can delete players
router.delete('/:id', authenticate, authorize('admin'), playerController.deletePlayer);


module.exports = router;
