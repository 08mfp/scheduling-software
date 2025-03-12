/**
 * @module backend/routes/teamRoutes
 * @description This module is used for defining team routes for the application.
 * @api Team Routes
 * @version 2.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');

// router.get('/', teamController.getAllTeams);
// router.post('/', teamController.createTeam);
// router.get('/:id', teamController.getTeamById);
// router.put('/:id', teamController.updateTeam);
// router.delete('/:id', teamController.deleteTeam);
// router.get('/:id/players', teamController.getTeamWithPlayers); 
// router.get('/:id/fixtures', teamController.getTeamFixtures);

// Public access routes
// router.get('/', authenticate, authorize('admin', 'manager', 'viewer'), teamController.getAllTeams);
router.get('/', teamController.getAllTeams);
router.get('/:id', authenticate, authorize('admin', 'manager', 'viewer'), teamController.getTeamById);
router.get('/:id/players', authenticate, authorize('admin', 'manager', 'viewer'), teamController.getTeamWithPlayers);
router.get('/:id/fixtures', authenticate, authorize('admin', 'manager', 'viewer'), teamController.getTeamFixtures);

// Admin-only routes
router.post('/', authenticate, authorize('admin'), teamController.createTeam);
router.put('/:id', authenticate, authorize('admin'), teamController.updateTeam);
router.delete('/:id', authenticate, authorize('admin'), teamController.deleteTeam);

module.exports = router;
