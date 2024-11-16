// backend/routes/manualFixtureRoutes.js
/**
 * @module backend/routes/manualFixtureRoutes
 * @description This module is used for defining manual fixture routes for the application.
 * @api Manual Fixture R
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const manualFixtureController = require('../controllers/manualFixtureController');

// Get previous fixture to determine home/away
router.get('/previous-fixture', manualFixtureController.getPreviousFixture);

// Validate manually scheduled fixtures
router.post('/validate', manualFixtureController.validateFixtures);

// Save manually scheduled fixtures
router.post('/save', manualFixtureController.saveFixtures);

module.exports = router;
