// backend/routes/playerRoutes.js
/**
 * @module backend/routes/playerRoutes
 * @description This module is used for defining player routes for the application.
 * @api Player Routes
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

// Route to fetch all players
router.get('/', playerController.getAllPlayers);

// Route to create a player
router.post('/', playerController.createPlayer);

// Route to fetch a player by id
router.get('/:id', playerController.getPlayerById);

// Route to update a player by id
router.put('/:id', playerController.updatePlayer);

// Route to delete a player by id
router.delete('/:id', playerController.deletePlayer);

module.exports = router;
