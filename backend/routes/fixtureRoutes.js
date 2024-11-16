// backend/routes/fixtureRoutes.js
/** 
* @module backend/routes/fixtureRoutes
* @description This module is used for defining the fixture routes for the application.
* @api Fixture Routes
* @version 1.0.0
* @authors github.com/08mfp
*/

const express = require('express');
const router = express.Router();
const fixtureController = require('../controllers/fixtureController');

// Route to delete a fixture by id
router.delete('/:id', fixtureController.deleteFixture);

// Route to fetch all distinct seasons
router.get('/seasons', fixtureController.getAllSeasons);

// Route to create multiple fixtures
router.get('/bulk', fixtureController.bulkCreateFixtures)

// Route to fetch  fixtures by id
router.get('/:id', fixtureController.getFixtureById);

// Route to update a fixture by id
router.put('/:id', fixtureController.updateFixture);

// Route to delete a fixture by id
router.delete('/:id', fixtureController.deleteFixture);

// Route to fetch all fixtures
router.get('/', fixtureController.getAllFixtures);

// Route to create a fixture
router.post('/', fixtureController.createFixture);

module.exports = router;