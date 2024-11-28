// backend/models/ManualFixture.js
/**
 * @module backend/models/ProvisionalFixture
 * @description This module is used for defining manual fixtures which the user individually  sets all fixtures.
 * sends data to provisioanl fixtures in the database. used by scheduling algorithm before we post thefixture list to the main database.
 * @api ProvisionalFixture
 * @version 1.0.0
 * @authors github.com/08mfp
 */

//sepearate schema for manual fixtures so that it does not interfere with already set fixtures whilst new ones are being added.

const mongoose = require('mongoose');

const ManualFixtureSchema = new mongoose.Schema({
  round: {
    type: Number,
    required: true,
    min: 1,
    max: 5, // Assuming 5 rounds
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
  season: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('ManualFixture', ManualFixtureSchema);
