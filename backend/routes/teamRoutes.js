// backend/routes/teamRoutes.js
/**
 * @module backend/routes/teamRoutes
 * @description This module is used for defining team routes for the application.
 * @api Team Routes
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// Route to fetch all teams
router.get('/', teamController.getAllTeams);

// Route to create a team
router.post('/', teamController.createTeam);

// Route to fetch a team by id
router.get('/:id', teamController.getTeamById);

// Route to update a team by id
router.put('/:id', teamController.updateTeam);

// Route to delete a team by id
router.delete('/:id', teamController.deleteTeam);

// Route to fetch a team with players
router.get('/:id/players', teamController.getTeamWithPlayers); 

// Route to fetch a team's fixtures
router.get('/:id/fixtures', teamController.getTeamFixtures);

module.exports = router;
