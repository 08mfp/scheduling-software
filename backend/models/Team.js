/**
 * @module backend/models/Team
 * @description This module is used for defining the schema for teams in the database. Stadium is a required field for a team, will give options from list of available stadiums.
 * @api Team
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  image: {
    type: String,
  },
  teamName: {
    type: String,
    required: true,
  },
  teamRanking: {
    type: Number,
    required: true,
  },
  teamLocation: {
    type: String,
    required: true,
  },
  teamCoach: {
    type: String,
    required: true,
  },
  stadium: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stadium',
    required: true, //! later add a unique constraint if interfering with scheduling algorithms.
  },
});

module.exports = mongoose.model('Team', TeamSchema);