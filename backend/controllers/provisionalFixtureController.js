// backend/controllers/provisionalFixtureController.js
/**
 * @module backend/controllers/provisionalFixtureController
 * @description This file contains the controller functions for managing provisional fixtures in the database. It is used by the scheduling algorithm to generate provisional fixtures, which are then saved to the main datyabase.
 * @api ManualFixture
 * @version 1.0.0
 * @authors github.com/08mfp
 */

//! NEED TO CLEANUP THIS CODE. CONFUSING IF ELSE STATEMENTS

const ProvisionalFixture = require('../models/ProvisionalFixture');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');

// Import algorithms
const { generateRandomFixtures } = require('../algorithms/randomAlgorithm');
const { generateRound5ExtravaganzaFixtures } = require('../algorithms/round5Extravaganza');
const { generateTravelOptimizedFixtures } = require('../algorithms/travelOptimizedScheduler');
const { generateBalancedTravelFixtures } = require('../algorithms/balancedTravelScheduler');



/**
 * @desc    Generate provisional fixtures
 * @route   POST /api/provisional-fixtures/generate
 * @access  Public
 */
exports.generateProvisionalFixtures = async (req, res) => {
    try {
      const { algorithm, season, teams: selectedTeamIds } = req.body;

      // Clear existing provisional fixtures for the selected season (so that we don't have duplicate fixtures)
      await ProvisionalFixture.deleteMany({ season });

      let result;

      if (algorithm === 'random') {
        // Validate that exactly 6 team IDs are provided (we will restrict this on front end interface)
        if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
          return res.status(400).json({ message: 'Exactly 6 teams must be selected for the Random algorithm.' });
        }

        // Fetch selected teams from the database
        const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');

        if (teams.length !== 6) {
          return res.status(400).json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
        }

        // sort teams by ranking  //! helps with the round 5 extravaganza algorithm
        teams.sort((a, b) => a.teamRanking - b.teamRanking);

        // Generate fixtures using the selected teams
        result = await generateRandomFixtures(teams, season);
      } else if (algorithm === 'round5Extravaganza') {
        // Validate that exactly 6 team IDs are provided
        if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
          return res.status(400).json({ message: 'Exactly 6 teams must be selected for the Round 5 Extravaganza algorithm.' });
        }

        // Fetch selected teams from the database
        const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium'); //duplicate code?

        if (teams.length !== 6) {
          return res.status(400).json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
        }

        // sort teams by ranking 
        teams.sort((a, b) => a.teamRanking - b.teamRanking);

        // Generate fixtures using the selected teams
        result = await generateRound5ExtravaganzaFixtures(teams, season);
      } else if (algorithm === 'travelOptimized') {
        // Validate that exactly 6 team IDs are provided
        if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
          return res.status(400).json({ message: 'Exactly 6 teams must be selected for the Travel Optimized algorithm.' });
        }
      
        // Fetch selected teams from the database
        const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');
      
        if (teams.length !== 6) {
          return res.status(400).json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
        }
      
        // Generate fixtures using the selected teams
        result = await generateTravelOptimizedFixtures(teams, season);
    }

    else if (algorithm === 'balancedTravel') { // New Algorithm Handling
        // Validate that exactly 6 team IDs are provided
        if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
          return res.status(400).json({ message: 'Exactly 6 teams must be selected for the Balanced Travel algorithm.' });
        }
  
        // Fetch selected teams from the database
        const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');
  
        if (teams.length !== 6) {
          return res.status(400).json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
        }
  
        // Generate fixtures using the selected teams
        result = await generateBalancedTravelFixtures(teams, season);
      }
      
      else {
        return res.status(400).json({ message: 'Algorithm not implemented' });
      }

      // Save provisional fixtures to database
      await ProvisionalFixture.insertMany(result.fixtures);

      // Populate fixtures for response
      const populatedFixtures = await ProvisionalFixture.find({ season })
        .populate('homeTeam', 'teamName')
        .populate('awayTeam', 'teamName')
        .populate('stadium', 'stadiumName');

      res.status(200).json({
        message: 'Provisional fixtures generated',
        fixtures: populatedFixtures,
        summary: result.summary,
      });
    } catch (error) {
      console.error('Error generating provisional fixtures:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get all provisional fixtures
 * @route   GET /api/provisional-fixtures
 * @access  Public
 */
exports.getProvisionalFixtures = async (req, res) => {
  try {
    const provisionalFixtures = await ProvisionalFixture.find({})
      .populate('homeTeam', 'teamName')
      .populate('awayTeam', 'teamName')
      .populate('stadium', 'stadiumName');
    res.status(200).json(provisionalFixtures);
  } catch (error) {
    console.error('Error fetching provisional fixtures:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Save provisional fixtures to main fixtures collection/database
 * @route   POST /api/provisional-fixtures/save
 * @access  Public
 */
exports.saveProvisionalFixtures = async (req, res) => {
  try {
    const { season } = req.body;

    // Delete existing fixtures for the season (so that we don't have duplicate fixtures)
    await Fixture.deleteMany({ season });

    // Get provisional fixtures
    const provisionalFixtures = await ProvisionalFixture.find({ season });

    // Save provisional fixtures to main fixtures collection (database)
    const fixturesData = provisionalFixtures.map((fixture) => ({
      round: fixture.round,
      date: fixture.date,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      stadium: fixture.stadium,
      location: fixture.location,
      season: fixture.season,
    }));

    await Fixture.insertMany(fixturesData);

    // Clear provisional fixtures
    await ProvisionalFixture.deleteMany({ season });

    res.status(200).json({ message: 'Fixtures saved' });
  } catch (error) {
    console.error('Error saving provisional fixtures:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Clear all provisional fixtures. So that we can start fresh next time
 * @route   DELETE /api/provisional-fixtures
 * @access  Public
 */
exports.clearProvisionalFixtures = async (req, res) => {
  try {
    await ProvisionalFixture.deleteMany({});
    res.status(200).json({ message: 'Provisional fixtures cleared' });
  } catch (error) {
    console.error('Error clearing provisional fixtures:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
