/**
 * @module backend/routes/manualFixtureRoutes
 * @description This module is used for defining manual fixture routes for the application.
 * @version 2.0.0
 * @api Manual Fixture R
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const manualFixtureController = require('../controllers/manualFixtureController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/previous-fixture', authenticate, authorize('admin'), manualFixtureController.getPreviousFixture);
router.post('/validate', authenticate, authorize('admin'), manualFixtureController.validateFixtures);
// router.post('/save', manualFixtureController.saveFixtures);
router.post('/save', authenticate, authorize('admin'), manualFixtureController.saveFixtures);

module.exports = router;