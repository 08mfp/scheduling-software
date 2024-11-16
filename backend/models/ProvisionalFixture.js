// backend/models/ProvisionalFixture.js
/**
 * @module backend/models/ProvisionalFixture
 * @description This module is used for defining provisioanl fixtures in the database. used by scheduling algorithm before we post thefixture list to the main database.
 * @api ProvisionalFixture
 * @version 1.0.0
 * @authors github.com/08mfp
 */
const mongoose = require('mongoose');

const ProvisionalFixtureSchema = new mongoose.Schema({
  round: Number,
  date: Date,
  homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  stadium: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  location: String,
  season: Number,
});

module.exports = mongoose.model('ProvisionalFixture', ProvisionalFixtureSchema);
