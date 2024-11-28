// backend/routes/provisionalFixtureRoutes.js
/**
 * @module backend/routes/provisionalFixtureRoutes
 * @description This module is used for defining provisional fixture routes for the application.
 * @api Provisional Fixture Routes
 * @version 2.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const provisionalFixtureController = require('../controllers/provisionalFixtureController');
const { authenticate, authorize } = require('../middleware/auth');

// Generate Provisional Fixtures
// router.post('/generate', provisionalFixtureController.generateProvisionalFixtures);
router.post('/generate', authenticate, authorize('admin'), provisionalFixtureController.generateProvisionalFixtures);

// Get All Provisional Fixtures
// router.get('/', provisionalFixtureController.getProvisionalFixtures);
router.post('/', authenticate, authorize('admin'), provisionalFixtureController.getProvisionalFixtures);

// Save Fixtures
// router.post('/save', provisionalFixtureController.saveProvisionalFixtures);
router.post('/save', authenticate, authorize('admin'), provisionalFixtureController.saveProvisionalFixtures);

// Clear Fixtures
// router.delete('/', provisionalFixtureController.clearProvisionalFixtures);
router.post('/', authenticate, authorize('admin'), provisionalFixtureController.clearProvisionalFixtures);


module.exports = router;
