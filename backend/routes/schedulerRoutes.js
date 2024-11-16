// backend/routes/schedulerRoutes.js
/**
 * @module backend/routes/schedulerRoutes
 * @description This module is used for defining scheduler routes for the application.
 * @api Scheduler Routes
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

// Route to run the scheduler
router.post('/run', schedulerController.runScheduler);

module.exports = router;
