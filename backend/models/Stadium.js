// backend/models/Stadium.js
/**
 * @module backend/models/Stadium
 * @description This module is used for defining the schema for stadiums in the database.
 * @api Stadium
 * @version 1.0.0
 * @authors github.com/08mfp
 */
const mongoose = require('mongoose');

const StadiumSchema = new mongoose.Schema({
  stadiumName: {
    type: String,
    required: true,
  },
  stadiumCity: {
    type: String,
    required: true,
  },
  stadiumCountry: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  stadiumCapacity: {
    type: Number,
    required: true,
  },
  surfaceType: {
    type: String,
    enum: ['Grass', 'Artificial Turf'], // add more later 
    required: true,
  },
});

module.exports = mongoose.model('Stadium', StadiumSchema);
