/**
 * @module backend/controllers/schedulerController
 * @description This file contains the controller functions for managing the scheduler in the database.
 * @api Scheduler
 * @version 1.0.0
 * @authors github.com/08mfp
 */

/**
 * @desc    Run the scheduler to generate provisional fixtures
 * @route   POST /api/scheduler/run
 * @access  Public
 */
exports.runScheduler = async (req, res) => {
    res.status(200).json({ message: 'Scheduler run successfully' });
  };
  