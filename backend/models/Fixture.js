/**
 * @module backend/models/Fixture
 * @description This module is used for defining the schema for fixtures in the database. It also includes custom validation for scores based on the date of the fixture.
 * @api Fixture
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const mongoose = require('mongoose');

const FixtureSchema = new mongoose.Schema({
  round: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  date: {
    type: Date,
    required: true,
  },
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  stadium: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stadium',
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  homeTeamScore: {
    type: Number,
    // Score is required for past fixtures (before current system date), validation implemented below
  },
  awayTeamScore: {
    type: Number,
    // Score is required for past fixtures (before current system date), validation implemented below
  },
  season: {
    type: Number,
    required: true,
  },
});

FixtureSchema.pre('validate', function (next) {
  const now = new Date();
  const fixtureDate = new Date(this.date);

  if (fixtureDate < now) {
    if (this.homeTeamScore == null || this.awayTeamScore == null) {
      //! commented this out during model setup
      //! Uncomment below lines for to enforce score requirement for past fixtures
      // const err = new Error('Scores are required for past fixtures');
      // next(err);
      // If you want to allow fixtures without scores for past dates, comment out the above lines
    }
  } else {
    // If Fixture is in the future
    // This checks and makes sure that scores are not set for future fixtures
    if (this.homeTeamScore != null || this.awayTeamScore != null) {
      const err = new Error('Scores cannot be set for future fixtures');
      next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Fixture', FixtureSchema);