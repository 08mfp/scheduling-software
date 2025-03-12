/**
 * @module backend/controllers/stadiumController
 * @description This file contains the controller functions for managing Stadiums in the database.
 * @api Stadium
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const Stadium = require('../models/Stadium');

/**
 * @desc    Get all stadiums
 * @route   GET /api/stadiums
 * @access  Private (Viewer and above)
 */
exports.getAllStadiums = async (req, res) => {
  try {
    const stadiums = await Stadium.find();
    res.status(200).json(stadiums);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get a stadium by ID
 * @route   GET /api/stadiums/:id
 * @access  Private (Viewer and above)
 */
exports.getStadiumById = async (req, res) => {
  try {
    const stadium = await Stadium.findById(req.params.id);
    if (!stadium) {
      return res.status(404).json({ message: 'Stadium not found' });
    }
    res.status(200).json(stadium);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Create a new stadium
 * @route   POST /api/stadiums
 * @access  Private (Admin only)
 */
exports.createStadium = async (req, res) => {
  const stadium = new Stadium({
    stadiumName: req.body.stadiumName,
    stadiumCity: req.body.stadiumCity,
    stadiumCountry: req.body.stadiumCountry,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    stadiumCapacity: req.body.stadiumCapacity,
    surfaceType: req.body.surfaceType,
  });

  try {
    const newStadium = await stadium.save();
    res.status(201).json(newStadium);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * @desc    Update a stadium
 * @route   PUT /api/stadiums/:id
 * @access  Private (Admin only)
 */
exports.updateStadium = async (req, res) => {
  try {
    const stadium = await Stadium.findById(req.params.id);
    if (!stadium) {
      return res.status(404).json({ message: 'Stadium not found' });
    }

    stadium.stadiumName = req.body.stadiumName || stadium.stadiumName;
    stadium.stadiumCity = req.body.stadiumCity || stadium.stadiumCity;
    stadium.stadiumCountry = req.body.stadiumCountry || stadium.stadiumCountry;
    stadium.latitude = req.body.latitude || stadium.latitude;
    stadium.longitude = req.body.longitude || stadium.longitude;
    stadium.stadiumCapacity = req.body.stadiumCapacity || stadium.stadiumCapacity;
    stadium.surfaceType = req.body.surfaceType || stadium.surfaceType;

    const updatedStadium = await stadium.save();
    res.status(200).json(updatedStadium);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * @desc    Delete a stadium
 * @route   DELETE /api/stadiums/:id
 * @access  Private (Admin only)
 */
exports.deleteStadium = async (req, res) => {
  try {
    const stadium = await Stadium.findById(req.params.id);
    if (!stadium) {
      return res.status(404).json({ message: 'Stadium not found' });
    }

    await Stadium.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Stadium deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};