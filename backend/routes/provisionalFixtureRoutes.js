// backend/routes/provisionalFixtureRoutes.js
/**
 * @module backend/routes/provisionalFixtureRoutes
 * @description This module is used for defining provisional fixture routes for the application.
 * @api Provisional Fixture Routes
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const provisionalFixtureController = require('../controllers/provisionalFixtureController');

// Generate Provisional Fixtures
router.post('/generate', provisionalFixtureController.generateProvisionalFixtures);

// Get All Provisional Fixtures
router.get('/', provisionalFixtureController.getProvisionalFixtures);

// Save Fixtures
router.post('/save', provisionalFixtureController.saveProvisionalFixtures);

// Clear Fixtures
router.delete('/', provisionalFixtureController.clearProvisionalFixtures);

module.exports = router;
