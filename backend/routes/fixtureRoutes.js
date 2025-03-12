/** 
* @module backend/routes/fixtureRoutes
* @description This module is used for defining the fixture routes for the application.
* @api Fixture Routes
* @version 2.0.0
* @authors github.com/08mfp
*/

const express = require('express');
const router = express.Router();
const fixtureController = require('../controllers/fixtureController');
const { authenticate, authorize } = require('../middleware/auth');

// router.delete('/:id', fixtureController.deleteFixture);
// router.get('/seasons', fixtureController.getAllSeasons);
// router.get('/bulk', fixtureController.bulkCreateFixtures)
// router.get('/:id', fixtureController.getFixtureById);
// router.put('/:id', fixtureController.updateFixture);
// router.delete('/:id', fixtureController.deleteFixture);
// router.get('/', fixtureController.getAllFixtures);
// router.post('/', fixtureController.createFixture);

// Public access routes
// router.get('/', authenticate, authorize('admin', 'manager', 'viewer', 'guest'), fixtureController.getAllFixtures);
router.get('/', fixtureController.getAllFixtures);
// router.get('/seasons', authenticate, authorize('admin', 'manager', 'viewer', 'guest', ''), fixtureController.getAllSeasons);
router.get('/seasons', fixtureController.getAllSeasons);
router.get('/:id', fixtureController.getFixtureById);
// router.get('/:id', authenticate, authorize('admin', 'manager', 'viewer', 'guest'), fixtureController.getFixtureById);

// Admin-only routes
router.post('/', authenticate, authorize('admin'), fixtureController.createFixture);
router.put('/:id', authenticate, authorize('admin'), fixtureController.updateFixture);
router.delete('/:id', authenticate, authorize('admin'), fixtureController.deleteFixture);
router.post('/bulk', authenticate, authorize('admin'), fixtureController.bulkCreateFixtures);

module.exports = router;