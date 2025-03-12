/**
 * @module backend/controllers/fixtureController
 * @description This file contains the controller functions for managing fixtures in the database.
 * @api Fixture
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const Fixture = require('../models/Fixture');

/**
 * @desc    Get all fixtures
 * @route   GET /api/fixtures
 * @access  Public
 */
exports.getAllFixtures = async (req, res) => {
  try {
    const query = {};
    if (req.query.season) {
      query.season = req.query.season;
    }
    const fixtures = await Fixture.find(query)
      .populate('homeTeam', 'teamName')
      .populate('awayTeam', 'teamName')
      .populate('stadium', 'stadiumName');
    res.status(200).json(fixtures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get all distinct seasons, used by front end to filter fixtures by seaosn
 * @route   GET /api/fixtures/seasons
 * @access  Public
 */
// exports.getAllSeasons = async (req, res) => {
//     try {
//       const seasons = await Fixture.distinct('season').sort((a, b) => b - a);
//       res.status(200).json(seasons);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   };

//Below is with caching to reduce the number of database queries (i think)
/**
 * @desc    Get all distinct seasons
 * @route   GET /api/fixtures/seasons
 * @access  Public
 */
exports.getAllSeasons = async (req, res) => {
  try {
    const seasons = await Fixture.distinct('season');
    if (!seasons || seasons.length === 0) {
      return res.status(404).json({ message: 'No seasons found.' });
    }
    const sortedSeasons = seasons.sort((a, b) => b - a);
    res.status(200).json(sortedSeasons);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
  

/**
 * @desc    Get a fixture by ID
 * @route   GET /api/fixtures/:id
 * @access  Public
 */
exports.getFixtureById = async (req, res) => {
  try {
    const fixture = await Fixture.findById(req.params.id)
      .populate('homeTeam', 'teamName')
      .populate('awayTeam', 'teamName')
      .populate('stadium', 'stadiumName');
    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }
    res.status(200).json(fixture);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Create a new fixture
 * @route   POST /api/fixtures
 * @access  Private (Admin only)
 */
exports.createFixture = async (req, res) => {
  const fixture = new Fixture({
    round: req.body.round,
    date: req.body.date,
    homeTeam: req.body.homeTeam,
    awayTeam: req.body.awayTeam,
    stadium: req.body.stadium,
    location: req.body.location,
    homeTeamScore: req.body.homeTeamScore,
    awayTeamScore: req.body.awayTeamScore,
    season: req.body.season,
  });

  try {
    const newFixture = await fixture.save();
    res.status(201).json(newFixture);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * @desc    Update a fixture
 * @route   PUT /api/fixtures/:id
 * @access  Private (Admin only)
 */
exports.updateFixture = async (req, res) => {
  try {
    const fixture = await Fixture.findById(req.params.id);
    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }

    fixture.round = req.body.round || fixture.round;
    fixture.date = req.body.date || fixture.date;
    fixture.homeTeam = req.body.homeTeam || fixture.homeTeam;
    fixture.awayTeam = req.body.awayTeam || fixture.awayTeam;
    fixture.stadium = req.body.stadium || fixture.stadium;
    fixture.location = req.body.location || fixture.location;
    fixture.season = req.body.season || fixture.season;

    if (req.body.homeTeamScore !== undefined) {
      fixture.homeTeamScore = req.body.homeTeamScore;
    }
    if (req.body.awayTeamScore !== undefined) {
      fixture.awayTeamScore = req.body.awayTeamScore;
    }

    const updatedFixture = await fixture.save();
    res.status(200).json(updatedFixture);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * @desc    Delete a fixture
 * @route   DELETE /api/fixtures/:id
 * @access  Private (Admin only)
 */
exports.deleteFixture = async (req, res) => {
  try {
    const fixture = await Fixture.findById(req.params.id);
    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }

    await Fixture.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Fixture deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Bulk create fixtures
 * @route   POST /api/fixtures/bulk
 * @access  Private (Admin only)
 */
exports.bulkCreateFixtures = async (req, res) => {
  try {
    const fixtures = req.body.fixtures;
    const newFixtures = await Fixture.insertMany(fixtures);
    res.status(201).json(newFixtures);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};