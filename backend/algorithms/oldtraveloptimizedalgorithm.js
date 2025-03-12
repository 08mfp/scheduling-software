const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const axios = require('axios');
require('dotenv').config();

const distanceCache = new NodeCache({ stdTTL: 86400 });

async function generateTravelOptimizedFixtures(teams, season, restWeeks = []) {
  console.log('Generating travel optimized fixtures...');
}

module.exports = {
  generateTravelOptimizedFixtures,
};
