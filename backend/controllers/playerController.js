/**
 * @module backend/controllers/playerController
 * @description This file contains the controller functions for managing Players in the database.
 * @api Player
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const Player = require('../models/Player');
const upload = require('../middleware/upload');
const fs = require('fs');

/**
 * @desc    Get all players
 * @route   GET /api/players
 * @access  Private (Manager and above)
 */
exports.getAllPlayers = async (req, res) => {
  try {
    const query = {};
    if (req.query.team) {
      query.team = req.query.team;
    }
    const players = await Player.find(query).populate('team', 'teamName');
    res.status(200).json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get a player by ID
 * @route   GET /api/players/:id
 * @access  Private (Manager and above)
 */
exports.getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'teamName');
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.status(200).json(player);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// /**
//  * @desc    Create a new player
//  * @route   POST /api/players
//  * @access  Public
//  */
// exports.createPlayer = async (req, res) => {
//   const player = new Player({
//     firstName: req.body.firstName,
//     lastName: req.body.lastName,
//     dateOfBirth: req.body.dateOfBirth,
//     team: req.body.team,
//   });

//   try {
//     const newPlayer = await player.save();
//     res.status(201).json(newPlayer);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

/**
 * @desc    Create a new player
 * @route   POST /api/players
 * @access  Private (Manager and above)
 */
exports.createPlayer = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    } else {
      try {
        const { firstName, lastName, dateOfBirth, team } = req.body;
        const player = new Player({
          firstName,
          lastName,
          dateOfBirth,
          team,
          image: req.file ? `/uploads/${req.file.filename}` : undefined,
        });

        if (req.body.removeImage === 'true') {
          player.image = undefined;
        }

        await player.save();
        res.status(201).json(player);
      } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({ message: error.message });
      }
    }
  });
};
  
  

// /**
//  * @desc    Update a player
//  * @route   PUT /api/players/:id
//  * @access  Public
//  */
// exports.updatePlayer = async (req, res) => {
//   try {
//     const player = await Player.findById(req.params.id);
//     if (!player) {
//       return res.status(404).json({ message: 'Player not found' });
//     }

//     player.firstName = req.body.firstName || player.firstName;
//     player.lastName = req.body.lastName || player.lastName;
//     player.dateOfBirth = req.body.dateOfBirth || player.dateOfBirth;
//     player.team = req.body.team || player.team;

//     const updatedPlayer = await player.save();
//     res.status(200).json(updatedPlayer);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

/**
 * @desc    Update a player
 * @route   PUT /api/players/:id
 * @access  Private (Manager and above)
 */
exports.updatePlayer = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    } else {
      try {
        const player = await Player.findById(req.params.id);
        if (!player) {
          return res.status(404).json({ message: 'Player not found' });
        }

        player.firstName = req.body.firstName || player.firstName;
        player.lastName = req.body.lastName || player.lastName;
        player.dateOfBirth = req.body.dateOfBirth || player.dateOfBirth;
        player.team = req.body.team || player.team;

        if (req.body.removeImage === 'true') {
          if (player.image) {
            const oldImagePath = '.' + player.image;
            try {
              await fs.promises.unlink(oldImagePath);
            } catch (err) {
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old image file:', err);
                return res.status(500).json({ message: 'Server error' });
              }
            }
          }
          player.image = undefined;
        } else if (req.file) {
          if (player.image) {
            const oldImagePath = '.' + player.image;
            try {
              await fs.promises.unlink(oldImagePath);
            } catch (err) {
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old image file:', err);
                return res.status(500).json({ message: 'Server error' });
              }
            }
          }
          player.image = `/uploads/${req.file.filename}`;
        }

        await player.save();
        res.status(200).json(player);
      } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ message: error.message });
      }
    }
  });
};


/**
 * @desc    Delete a player
 * @route   DELETE /api/players/:id
 * @access  Private (Admin only)
 */
exports.deletePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    if (player.image) {
      const oldImagePath = '.' + player.image;
      try {
        await fs.promises.unlink(oldImagePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error('Error deleting image file:', err);
          return res.status(500).json({ message: 'Server error' });
        }
      }
    }

    await Player.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Player deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};