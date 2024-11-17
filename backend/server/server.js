// backend/server/server.js
/**
 * @module backend/server/server
 * @description This module is the entry point for the server.
 * @api NONE
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express'); // Import express server
const mongoose = require('mongoose'); // used for MongoDB
const bodyParser = require('body-parser'); // used to parse incoming request bodies
const cors = require('cors'); // used to enable Cross-Origin Resource Sharing (and authentication)
require('dotenv').config();

// Import Middleware for logging to console
const logger = require('../middleware/logger');

// Routes
const teamRoutes = require('../routes/teamRoutes');
const stadiumRoutes = require('../routes/stadiumRoutes');
const playerRoutes = require('../routes/playerRoutes');
const fixtureRoutes = require('../routes/fixtureRoutes'); 
const schedulerRoutes = require('../routes/schedulerRoutes');
const provisionalFixtureRoutes = require('../routes/provisionalFixtureRoutes');
const manualFixtureRoutes = require('../routes/manualFixtureRoutes');


const app = express(); // Initialize express server and store in app
app.use(bodyParser.json()); // Parse incoming request bodies
app.use(cors()); // Enable Cross-Origin Resource Sharing //! ADD AUTHENTICATION HERE
app.use(logger); // Server logging middleware go comsole

// Routes
app.use('/api/teams', teamRoutes);
app.use('/api/stadiums', stadiumRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/uploads', express.static('uploads'))
app.use('/api/provisional-fixtures', provisionalFixtureRoutes);
app.use('api/fixtures/seasons', fixtureRoutes); //maybe remove if not being used later. This is just for front end
app.use('/api/manual-fixtures', manualFixtureRoutes);

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/sixnations', {
    useNewUrlParser: true, //! wht is this?
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(5003, () => {
      console.log('Server started on port 5003');
    });
  })
  .catch((err) => console.log(err));
