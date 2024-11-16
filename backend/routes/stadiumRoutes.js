// backend/routes/stadiumRoutes.js
/**
 * @module backend/routes/stadiumRoutes
 * @description This module is used for defining stadium routes for the application.
 * @api Stadium Routes
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const stadiumController = require('../controllers/stadiumController');

// Route to fetch all stadiums
router.get('/', stadiumController.getAllStadiums);

// Route to create a stadium
router.post('/', stadiumController.createStadium);

// Route to fetch a stadium by id
router.get('/:id', stadiumController.getStadiumById);

// Route to update a stadium by id
router.put('/:id', stadiumController.updateStadium);

// Route to delete a stadium by id
router.delete('/:id', stadiumController.deleteStadium);

module.exports = router;
