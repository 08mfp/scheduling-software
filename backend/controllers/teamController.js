/**
 * @module backend/controllers/teamController
 * @description This file contains the controller functions for managing Teams in the database.
 * @api Team
 * @version 1.0.0
 * @authors github.com/08mfp
 */
const Team = require('../models/Team');
const upload = require('../middleware/upload');
const Player = require('../models/Player'); 
const Fixture = require('../models/Fixture');
const fs = require('fs');

/**
 * @desc    Get all teams
 * @route   GET /api/teams
 * @access  Public
 */
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('stadium');
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get a team by ID
 * @route   GET /api/teams/:id
 * @access  Public
 */
exports.getTeamById = async (req, res) => {
    try {
      const team = await Team.findById(req.params.id).populate('stadium');
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.status(200).json(team);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

/**
 * @desc    Get a team by ID with players
 * @route   GET /api/teams/:id/players
 * @access  Public
 */
exports.getTeamWithPlayers = async (req, res) => {
    try {
      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
  
      const players = await Player.find({ team: req.params.id });
  
      res.status(200).json({ team, players });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

/**
 * @desc    Get fixtures for a team
 * @route   GET /api/teams/:id/fixtures
 * @access  Public
 */
exports.getTeamFixtures = async (req, res) => {
    try {
      const fixtures = await Fixture.find({
        $or: [{ homeTeam: req.params.id }, { awayTeam: req.params.id }],
      })
        .populate('homeTeam', 'teamName')
        .populate('awayTeam', 'teamName')
        .populate('stadium', 'stadiumName');
  
      res.status(200).json(fixtures);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

// /**
//  * @desc    Create a new team
//  * @route   POST /api/teams
//  * @access  Public
//  */
// exports.createTeam = async (req, res) => {
//   const team = new Team({
//     teamName: req.body.teamName,
//     teamRanking: req.body.teamRanking,
//     teamLocation: req.body.teamLocation,
//     teamHomeStadium: req.body.teamHomeStadium,
//     teamCoach: req.body.teamCoach,
//     teamPlayers: req.body.teamPlayers,
//   });

//   try {
//     const newTeam = await team.save();
//     res.status(201).json(newTeam);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

/**
 * @desc    Create a new team
 * @route   POST /api/teams
 * @access  Public
 */
exports.createTeam = (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      } else {
        try {
          const { teamName, teamRanking, teamLocation, teamCoach, stadium } = req.body;
          const team = new Team({
            teamName,
            teamRanking,
            teamLocation,
            teamCoach,
            stadium,
            image: req.file ? `/uploads/${req.file.filename}` : undefined,
          });
  
          if (req.body.removeImage === 'true') {
            team.image = undefined;
          }
  
          await team.save();
          res.status(201).json(team);
        } catch (error) {
          console.error('Error creating team:', error);
          res.status(500).json({ message: error.message });
        }
      }
    });
  };


// /**
//  * @desc    Update a team
//  * @route   PUT /api/teams/:id
//  * @access  Public
//  */
// exports.updateTeam = async (req, res) => {
//   try {
//     const team = await Team.findById(req.params.id);
//     if (!team) {
//       return res.status(404).json({ message: 'Team not found' });
//     }

//     team.teamName = req.body.teamName || team.teamName;
//     team.teamRanking = req.body.teamRanking || team.teamRanking;
//     team.teamLocation = req.body.teamLocation || team.teamLocation;
//     team.teamHomeStadium = req.body.teamHomeStadium || team.teamHomeStadium;
//     team.teamCoach = req.body.teamCoach || team.teamCoach;
//     team.teamPlayers = req.body.teamPlayers || team.teamPlayers;

//     const updatedTeam = await team.save();
//     res.status(200).json(updatedTeam);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

/**
 * @desc    Update a team
 * @route   PUT /api/teams/:id
 * @access  Public
 */
exports.updateTeam = (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      } else {
        try {
          const team = await Team.findById(req.params.id);
          if (!team) {
            return res.status(404).json({ message: 'Team not found' });
          }
  
          team.teamName = req.body.teamName || team.teamName;
          team.teamRanking = req.body.teamRanking || team.teamRanking;
          team.teamLocation = req.body.teamLocation || team.teamLocation;
          team.teamCoach = req.body.teamCoach || team.teamCoach;
          team.stadium = req.body.stadium || team.stadium;
  
          if (req.body.removeImage === 'true') {
            if (team.image) {
              const oldImagePath = '.' + team.image;
              try {
                await fs.promises.unlink(oldImagePath);
              } catch (err) {
                if (err.code !== 'ENOENT') {
                  console.error('Error deleting old image file:', err);
                  return res.status(500).json({ message: 'Server error' });
                }
              }
            }
            team.image = undefined;
          } else if (req.file) {
            if (team.image) {
              const oldImagePath = '.' + team.image;
              try {
                await fs.promises.unlink(oldImagePath);
              } catch (err) {
                if (err.code !== 'ENOENT') {
                  console.error('Error deleting old image file:', err);
                  return res.status(500).json({ message: 'Server error' });
                }
              }
            }
            team.image = `/uploads/${req.file.filename}`;
          }
  
          await team.save();
          res.status(200).json(team);
        } catch (error) {
          console.error('Error updating team:', error);
          res.status(500).json({ message: error.message });
        }
      }
    });
  };


/**
 * @desc    Delete a team
 * @route   DELETE /api/teams/:id
 * @access  Public
 */
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    await Team.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};