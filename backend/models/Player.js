// backend/models/Player.js
/**
 * @module backend/models/Player
 * @description This module is used for defining the schema for players in the database. It also includes automatic generation for the player's full name and age. Links to Team
 * @api Player
 * @version 1.0.0
 * @authors github.com/08mfp
 */


const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  image: {
    type: String,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
});

// automatic for player's full name
PlayerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// automatic for age
PlayerSchema.virtual('age').get(function () {
  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const m = today.getMonth() - this.dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }
  return age;
});

// to make sure virtuals are serialized
PlayerSchema.set('toObject', { virtuals: true });
PlayerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Player', PlayerSchema);
