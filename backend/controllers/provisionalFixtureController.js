/**
 * @module backend/controllers/provisionalFixtureController
 * @description This file contains controller functions for managing provisional fixtures.
 * It supports generating, saving, and clearing provisional fixtures using different algorithms.
 * Now includes the option for rest weeks.
 * @api ManualFixture
 * @version 1.1.0
 */

const ProvisionalFixture = require('../models/ProvisionalFixture');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');

// Import algorithms.
const { generateRandomFixtures } = require('../algorithms/randomAlgorithm');
const { generateRound5ExtravaganzaFixtures } = require('../algorithms/round5Extravaganza');
const { generateTravelOptimizedFixtures } = require('../algorithms/travelOptimizedScheduler');
const { generateStandardDeviationBalancedFixtures } = require('../algorithms/travelBalancedScheduler');
const { generateComprehensiveFairFixtures } = require('../algorithms/unifiedScheduler');

/**
 * @desc    Generate provisional fixtures
 * @route   POST /api/provisional-fixtures/generate
 * @access  Private (Admin only)
 */
exports.generateProvisionalFixtures = async (req, res) => {
  try {
    const {
      algorithm,
      season,
      teams: selectedTeamIds,
      restWeeks
    } = req.body;

    // Clear existing provisional fixtures for the selected season
    await ProvisionalFixture.deleteMany({ season });

    let result;

    // -------------------------------------------------------------
    // 1) Random Algorithm
    // -------------------------------------------------------------
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
          .json({ message: 'Some selected teams could not be found. Check team IDs.' });
      }

      // Sort teams by ranking (lowest rank => best rank)
      teams.sort((a, b) => a.teamRanking - b.teamRanking);

      // Generate using your random algorithm
      result = await generateRandomFixtures(teams, season, restWeeks);
    }

    // -------------------------------------------------------------
    // 2) Round 5 Extravaganza
    // -------------------------------------------------------------
    else if (algorithm === 'round5Extravaganza') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for Round 5 Extravaganza.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');
      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Check team IDs.' });
      }

      teams.sort((a, b) => a.teamRanking - b.teamRanking);
      result = await generateRound5ExtravaganzaFixtures(teams, season, restWeeks);
    }

    // -------------------------------------------------------------
    // 3) Travel Optimized
    // -------------------------------------------------------------
    else if (algorithm === 'travelOptimized') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Travel Optimized algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');
      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Check team IDs.' });
      }

      result = await generateTravelOptimizedFixtures(teams, season, restWeeks);
    }

    // -------------------------------------------------------------
    // 4) Balanced Travel (Standard Deviation Minimizer)
    // -------------------------------------------------------------
    else if (algorithm === 'balancedTravel') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Balanced Travel algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');
      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Check team IDs.' });
      }

      result = await generateStandardDeviationBalancedFixtures(teams, season, restWeeks);
    }

    // -------------------------------------------------------------
    // 5) Unified Scheduler
    // -------------------------------------------------------------
    else if (algorithm === 'unifiedScheduler') {
      if (!selectedTeamIds || !Array.isArray(selectedTeamIds) || selectedTeamIds.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Exactly 6 teams must be selected for the Unified Scheduler algorithm.' });
      }

      const teams = await Team.find({ _id: { $in: selectedTeamIds } }).populate('stadium');
      if (teams.length !== 6) {
        return res
          .status(400)
          .json({ message: 'Some selected teams could not be found. Check team IDs.' });
      }

      teams.sort((a, b) => a.teamRanking - b.teamRanking);

      // Extract additional parameters if provided
      // (1) Weighted parameters from the client
      const weights = req.body.weights || {};
      // (2) Local search flag
      const runLocalSearch = !!req.body.runLocalSearch;
      // (3) partialLocks or previousYearHome, if used
      const partialLocks = req.body.partialLocks || {};
      const previousYearHome = req.body.previousYearHome || {};

      // Build options object
      const options = {
        partialLocks,
        previousYearHome,
        runLocalSearch,
      };

      // Generate using the comprehensive fair scheduler
      result = await generateComprehensiveFairFixtures(
        teams,
        season,
        restWeeks,   // requestedRestCount from client
        weights,
        options
      );
    }

    // -------------------------------------------------------------
    // If no matching algorithm
    // -------------------------------------------------------------
    else {
      return res.status(400).json({ message: 'Algorithm not implemented.' });
    }

    // -------------------------------------------------------------
    // Save provisional fixtures to the DB
    // -------------------------------------------------------------
    await ProvisionalFixture.insertMany(result.fixtures);

    // Populate for response
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
 * @desc    Save provisional fixtures to main Fixtures collection
 * @route   POST /api/provisional-fixtures/save
 * @access  Private (Admin only)
 */
exports.saveProvisionalFixtures = async (req, res) => {
  try {
    const { season } = req.body;

    // Delete existing fixtures for that season
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

    // Clear provisional fixtures after saving
    await ProvisionalFixture.deleteMany({ season });

    res.status(200).json({ message: 'Fixtures saved' });
  } catch (error) {
    console.error('Error saving provisional fixtures:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Clear all provisional fixtures
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
