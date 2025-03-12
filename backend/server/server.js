/**
 * @module backend/server/server
 * @description This module is the entry point for the server.
 * @api NONE
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const logger = require('../middleware/logger');
const { morganMiddleware } = require('../middleware/logger');
const teamRoutes = require('../routes/teamRoutes');
const stadiumRoutes = require('../routes/stadiumRoutes');
const playerRoutes = require('../routes/playerRoutes');
const fixtureRoutes = require('../routes/fixtureRoutes'); 
const schedulerRoutes = require('../routes/schedulerRoutes');
const provisionalFixtureRoutes = require('../routes/provisionalFixtureRoutes');
const manualFixtureRoutes = require('../routes/manualFixtureRoutes');
const userRoutes = require('../routes/userRoutes');
const adminRoutes = require('../routes/adminRoutes');


const app = express();
app.use(bodyParser.json());
app.use(cors()); //! ADD AUTHENTICATION HERE
// app.use(logger); 
app.use(morganMiddleware);
app.use('/api/teams', teamRoutes);
app.use('/api/stadiums', stadiumRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/uploads', express.static('uploads'))
app.use('/api/provisional-fixtures', provisionalFixtureRoutes);
app.use('api/fixtures/seasons', fixtureRoutes); //maybe remove if not being used later. This is just for front end
app.use('/api/manual-fixtures', manualFixtureRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

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
