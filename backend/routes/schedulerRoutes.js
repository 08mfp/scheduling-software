// backend/routes/schedulerRoutes.js
/**
 * @module backend/routes/schedulerRoutes
 * @description This module is used for defining scheduler routes for the application.
 * @api Scheduler Routes
 * @version 2.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');
const { authenticate, authorize } = require('../middleware/auth');


// // Route to run the scheduler
// router.post('/run', schedulerController.runScheduler);
// Admin-only can run scheduler
router.post('/run', authenticate, authorize('admin'), schedulerController.runScheduler);

module.exports = router;
