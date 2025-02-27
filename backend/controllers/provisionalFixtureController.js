// backend/controllers/provisionalFixtureController.js
/**
 * @module backend/controllers/provisionalFixtureController
 * @description This file contains controller functions for managing provisional fixtures.
 * It supports generating, saving, and clearing provisional fixtures using different algorithms.
 * Now includes the option for rest weeks.
 * @api ManualFixture
 * @version 1.1.0
 * @authors github.com/08mfp
 */

const ProvisionalFixture = require('../models/ProvisionalFixture');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');

// Import algorithms.
const { generateRandomFixtures } = require('../algorithms/randomAlgorithm');
const { generateRound5ExtravaganzaFixtures } = require('../algorithms/round5Extravaganza');
const { generateTravelOptimizedFixtures } = require('../algorithms/travelOptimizedScheduler');
const { generateBalancedTravelFixtures } = require('../algorithms/balancedTravelScheduler');

/**
 * @desc    Generate provisional fixtures
 * @route   POST /api/provisional-fixtures/generate
 * @access  Private (Admin only)
 */
exports.generateProvisionalFixtures = async (req, res) => {
  try {
    const { algorithm, season, teams: selectedTeamIds, restWeeks } = req.body;

    // Clear existing provisional fixtures for the selected season.
    await ProvisionalFixture.deleteMany({ season });

    let result;

    if (algorithm === 'random') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Random algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');

      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
      }

      // Sort teams by ranking.
      teams.sort((a, b) => a.teamRanking - b.teamRanking);

      // Pass restWeeks to generateRandomFixtures.
      result = await generateRandomFixtures(teams, season, restWeeks);
    } else if (algorithm === 'round5Extravaganza') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Round 5 Extravaganza algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');

      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
      }

      teams.sort((a, b) => a.teamRanking - b.teamRanking);
      result = await generateRound5ExtravaganzaFixtures(teams, season);
    } else if (algorithm === 'travelOptimized') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Travel Optimized algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');

      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
      }

      result = await generateTravelOptimizedFixtures(teams, season);
    } else if (algorithm === 'balancedTravel') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Balanced Travel algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');

      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Please ensure all team IDs are correct.' });
      }

      result = await generateBalancedTravelFixtures(teams, season);
    } else {
      return res.status(400).json({ message: 'Algorithm not implemented' });
    }

    // Save provisional fixtures to the database.
    await ProvisionalFixture.insertMany(result.fixtures);

    // Populate fixtures for response.
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
 * @access  Private (Admin only)
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
 * @access  Private (Admin only)
 */
exports.saveProvisionalFixtures = async (req, res) => {
  try {
    const { season } = req.body;

    // Delete existing fixtures for the season.
    await Fixture.deleteMany({ season });

    const provisionalFixtures = await ProvisionalFixture.find({ season });

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

    // Clear provisional fixtures.
    await ProvisionalFixture.deleteMany({ season });

    res.status(200).json({ message: 'Fixtures saved' });
  } catch (error) {
    console.error('Error saving provisional fixtures:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Clear all provisional fixtures.
 * @route   DELETE /api/provisional-fixtures
 * @access  Private (Admin only)
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
