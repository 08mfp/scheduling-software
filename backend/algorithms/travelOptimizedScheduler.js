// backend/algorithms/travelOptimizedScheduler.js
/**
 * @module backend/algorithms/travelOptimizedScheduler
 * @description This module contains the algorithm for generating fixtures in a way where total travel distance is minimized.
 * @description It works by generating all unique matchups and then assigning home and away teams, then reordering the fixtures to reduce travel.
 * @api NONE
 * @version 1.0.0
 * @authors github.com/08mfp
 */

//! Things to test:
//! all teamss play once per round
//! each team plays every other team once
//! each team everty other team once only
//! each team plays at least 2 home and 2 away games (3H 2A or 2H 3A)
//! make sure fixtures correct alternate home and away based on previous year
//! make sure all fixtures for rounds are on the same weekend (in feb to march). No two rounds on same weekend. no overlapping fixtures.
//! fix date and timing logic 

//? CODE IMPROVEMENT IDEAS:
//? 1. Give user option to incorporate rest weeks (e.g. after round 2 and 4)
//? 2. Add tests for all functions and algorithm overall
//? 3. after provisional fixtures are generated, allow user to manually edit fixtures (using provisional fixture functioinality). then send to final. 
//? ^MIGHT BE DIFFICULT AS IT WOULD VALIDATE CONSTRAINTS. MAYVE ALLOW TO EDIT DATES AND TIMES ONLY (WITHIN ROUND WEEKEND)
//? 4.  show on front end the summary of the fixtures generated (and have a checker for all constraints)

//* RESTRICT FROM FRONT END SO THT BACK END ONLY RECEIVES 6 TEAMS

//TODO: ALGORITHM IS WORKING BUT NEED TO TEST THAT DISTANCES BETWEEN LOCATIONS ARE CORRECT. AND MANUALLY FIND THE BEST TRAVEL ROUTE for 2024 and 2025 FOR TESTING.
//TODO: ADD DOCUMENTATION FOR ALL env for google maps api
//* ERROR WITH DISTANCE CALCULATION. FIX THIS. READ BELOW.
//! ISSUE AS calculateDistanceBetweenCoordinates uses the Haversine formula, whilst getDistanceBetweenLocations uses the Google Maps API. 
//! This may cause discrepancies in the distances calculated.
//! What if travel needs to be over 1000km? Google Maps API may be better for this.
//! What if its less work to fly, haversine doesnt know this
//! can come up with eco friendly solution, but lowest distance could be via plane and not bus which would be more eco friendly
//! rework the algorithm to use google maps api for all distances or haversine for all distances. 
//! MAYBE JUST USE GOOGLE MAPS API FOR ALL DISTANCES (as it works for over countries) and then use Directions Service to get more travel details.

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const axios = require('axios');
const NodeCache = require('node-cache');
// Removed Google Maps API Client as we are now using the Haversine formula for distance calculations
// const { Client } = require('@googlemaps/google-maps-services-js'); // Google Maps API Client (used for distance matrix)
// const client = new Client({}); // Initialize Google Maps API Client
require('dotenv').config();

// Initialize cache with a TTL of 24 hours
const distanceCache = new NodeCache({ stdTTL: 86400 }); // 24 hours so that we don't have to fetch distances every time

/**
 * Generate fixtures while minimizing total travel distance over the season.
 *
 * @param {Array} teams - List of exactly 6 team objects with stadiums populated.
 * @param {Number} season - The season year.
 * @returns {Object} - An object containing fixtures and summary.
 */
async function generateTravelOptimizedFixtures(teams, season, restWeeks = []) {
  console.log('===== Starting Fixture Generation ====='); //! This is for console logging only

  // Validation: Ensure there are exactly 6 teams given 
  if (teams.length !== 6) {
    throw new Error('The algorithm requires exactly 6 teams.'); //! This is for console logging only
  }
  console.log(`Validated: ${teams.length} teams provided.`); //! This is for console logging only

  // Fetch previous season fixtures to apply the alternating venue rule
  console.log('Fetching previous season fixtures...');
  const previousSeasonFixtures = await Fixture.find({ season: season - 1 })
    .populate('homeTeam', '_id')
    .populate('awayTeam', '_id')
    .lean();
  console.log(`Fetched ${previousSeasonFixtures.length} fixtures from season ${season - 1}.`); //! This is for console logging only

  // Build a lookup map for previous fixtures
  const previousFixtureMap = new Map();
  for (const fixture of previousSeasonFixtures) { 
    const homeId = fixture.homeTeam._id.toString(); 
    const awayId = fixture.awayTeam._id.toString();
    const key = [homeId, awayId].sort().join('-'); // sort and join to make sure the key is always in the same order
    previousFixtureMap.set(key, fixture);
  }

  // Precompute Distances Between Stadiums
  const { distances, distanceMessages } = await precomputeDistances(teams); 
  console.log('All distances have been precomputed.');

  // Run the algorithm multiple times and keep the best result
  const maxAttempts = 10;
  let bestResult = null;
  let minimalTotalDistance = Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n=== Attempt ${attempt} ===`);

    let result;
    if (previousSeasonFixtures.length > 0) {
      // Previous season data exists (alternating venue rule)
      result = await generateFixturesWithPreviousData( 
        teams,
        season,
        previousFixtureMap,
        distances,
        distanceMessages,
        restWeeks
      );
    } else {
      // No previous season data
      result = await generateFixturesWithoutPreviousData(
        teams,
        season,
        distances,
        distanceMessages,
        restWeeks
      );
    }

    const totalTravelDistance = result.totalTravelDistance;
    console.log(`Total Travel Distance for Attempt ${attempt}: ${totalTravelDistance.toFixed(2)} km`);

    if (totalTravelDistance < minimalTotalDistance) {
      minimalTotalDistance = totalTravelDistance; // this is the best result so far
      bestResult = result;
      console.log(`New best result found on attempt ${attempt}.`);
    }
  }

  console.log('===== Fixture Generation Complete =====\n');
  return bestResult;
}

/**
 * Generate fixtures when previous season data is available.
 *
 * @param {Array} teams - List of team objects.
 * @param {Number} season - The season year.
 * @param {Map} previousFixtureMap - Map of previous season fixtures.
 * @param {Object} distances - Precomputed distances between teams from Haversine formula.
 * @param {Array} distanceMessages - Messages from distance calculations.
 * @returns {Object} - An object containing fixtures, summary, and totalTravelDistance.
 */
async function generateFixturesWithPreviousData(
  teams,
  season,
  previousFixtureMap,
  distances,
  distanceMessages,
  restWeeks = []
) {
  console.log('Generating fixtures using previous season data...');

  // Step 1: Generate Round-Robin Matchups (All Unique Matchups)
  const initialFixtures = generateRoundRobinMatchups(teams);
  console.log(`Generated ${initialFixtures.length} initial fixtures.`);

  // Step 2: Optimize Home and Away Assignments to Alternate Venues
  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    previousFixtureMap,
    teams,
    distances
  );
  console.log('Home and away assignments optimized.');

  // Step 3: Assign Fixtures to Rounds with Flexibility (Allow Swapping)
  const { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams, distances);
  console.log('Fixtures have been assigned to rounds with optimization.');

  // Step 4: Schedule Dates and Times Considering Sequential Games 
  const finalScheduledFixtures = await scheduleFixturesOptimized(scheduledFixtures, season, distances, restWeeks);
  console.log('Dates and times scheduled with consideration for sequential games.');

  // Step 5: Calculate Total Travel Distances (Per Team and Per Match)
  const { teamTravelDistances, matchTravelDistances } = calculateTeamTravelDistances(
    finalScheduledFixtures,
    distances,
    teams
  );
  console.log('Total travel distances calculated.');

  // Step 6: Build Summary (Includes Matchup Changes, for front end)
  const totalTravelDistance = Object.values(teamTravelDistances).reduce(
    (sum, distance) => sum + distance,
    0
  );
  const summary = buildSummary(
    teams,
    finalScheduledFixtures,
    distanceMessages,
    teamTravelDistances,
    matchTravelDistances,
    matchupChanges,
    totalTravelDistance
  );
  console.log('Summary built.');

  // Step 7: Format Final Fixtures List (For Database Storage)
  const formattedFixtures = finalScheduledFixtures.map((fixture) => ({
    round: fixture.round,
    date: fixture.date,
    homeTeam: fixture.homeTeam._id,
    awayTeam: fixture.awayTeam._id,
    stadium: fixture.stadium ? fixture.stadium._id : null,
    location: fixture.location,
    season,
  }));
  console.log('Final fixtures formatted.');

  return { fixtures: formattedFixtures, summary, totalTravelDistance };
}

/**
 * Generate fixtures when no previous season data is available.
 *
 * @param {Array} teams - List of team objects.
 * @param {Number} season - The season year.
 * @param {Object} distances - Precomputed distances between teams from Haversine formula.
 * @param {Array} distanceMessages - Messages from distance calculations.
 * @returns {Object} - An object containing fixtures, summary, and totalTravelDistance.
 */
async function generateFixturesWithoutPreviousData(
  teams,
  season,
  distances,
  distanceMessages,
  restWeeks = []
) {
  console.log('Generating fixtures without previous season data...');

  // Step 1: Generate Round-Robin Matchups (All Unique Matchups)
  const initialFixtures = generateRoundRobinMatchups(teams);
  console.log(`Generated ${initialFixtures.length} initial fixtures.`);

  // Step 2: Optimize Home and Away Assignments to Alternate Venues
  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    null, // No previous season data
    teams,
    distances
  );
  console.log('Home and away assignments optimized.');

  // Step 3: Assign Fixtures to Rounds with Flexibility (Allow Swapping)
  const { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams, distances);
  console.log('Fixtures have been assigned to rounds with optimization.');

  // Step 4: Schedule Dates and Times Considering Sequential Games 
  const finalScheduledFixtures = await scheduleFixturesOptimized(scheduledFixtures, season, distances);
  console.log('Dates and times scheduled with consideration for sequential games.');

  // Step 5: Calculate Total Travel Distances (Per Team and Per Match)
  const { teamTravelDistances, matchTravelDistances } = calculateTeamTravelDistances(
    finalScheduledFixtures,
    distances,
    teams
  );
  console.log('Total travel distances calculated.');

  // Step 6: Build Summary (Includes Matchup Changes, for front end)
  const totalTravelDistance = Object.values(teamTravelDistances).reduce(
    (sum, distance) => sum + distance,
    0
  );
  const summary = buildSummary(
    teams,
    finalScheduledFixtures,
    distanceMessages,
    teamTravelDistances,
    matchTravelDistances,
    matchupChanges,
    totalTravelDistance
  );
  console.log('Summary built.');

  // Step 7: Format Final Fixtures List (For Database Storage)
  const formattedFixtures = finalScheduledFixtures.map((fixture) => ({
    round: fixture.round,
    date: fixture.date,
    homeTeam: fixture.homeTeam._id,
    awayTeam: fixture.awayTeam._id,
    stadium: fixture.stadium ? fixture.stadium._id : null,
    location: fixture.location,
    season,
  }));
  console.log('Final fixtures formatted.');

  return { fixtures: formattedFixtures, summary, totalTravelDistance };
}

/**
 * Generate Round-Robin Matchups for an even number of teams using the circle method. fisher yates shuffle or 
 *
 * @param {Array} teams - List of team objects.
 * @returns {Array} - List of fixture objects with homeTeam and awayTeam.
 */
function generateRoundRobinMatchups(teams) {
  const numTeams = teams.length;
  if (numTeams % 2 !== 0) { //! maybe just be if numTeams !== 6
    throw new Error('Round-Robin scheduling requires an even number of teams.');
  }

  const totalRounds = numTeams - 1; //! will break if numTeams !== 6
  const halfSize = numTeams / 2; //! will break if numTeams !== 6

  // Create a list excluding the first team so that we can rotate the teams
  const teamsList = teams.slice(1);

  const rounds = [];

  for (let round = 0; round < totalRounds; round++) {
    const fixtures = [];
    const teamCount = teamsList.length;

    // Pair teams
    for (let i = 0; i < halfSize; i++) {
      const home = i === 0 ? teams[0] : teamsList[i - 1]; // First team is always home
      const away = teamsList[teamCount - i - 1]; // Last team is always away
      fixtures.push({ homeTeam: home, awayTeam: away });
    }

    rounds.push(fixtures);

    // Rotate teams for next round (except the first team)
    teamsList.unshift(teamsList.pop()); // Move last team to second position
  }

  // Flatten all rounds into a single list of fixtures
  const allFixtures = [];
  rounds.forEach((roundFixtures, roundIndex) => {
    roundFixtures.forEach((fixture) => {
      allFixtures.push({
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        round: roundIndex + 1, // Temporarily assign round number
      });
    });
  });

  return allFixtures;
}

/**
 * Optimize home and away assignments to always alternate venues from the previous season. (RULE)
 *
 * @param {Array} fixtures - List of fixtures with homeTeam and awayTeam.
 * @param {Map|null} previousFixtureMap - Map of previous season fixtures or null.
 * @param {Array} teams - List of team objects.
 * @param {Object} distances - Precomputed distances between teams.
 * @returns {Object} - Optimized fixtures and matchup changes.
 */
function optimizeHomeAwayAssignments(fixtures, previousFixtureMap, teams, distances) {
  console.log('Optimizing home and away assignments to always alternate venues...');

  const matchupChanges = []; // Record changes made to matchups
  const teamIds = teams.map((team) => team._id.toString());

  // Initialize home and away counts
  const homeCounts = {};
  const awayCounts = {};
  teamIds.forEach((teamId) => {
    homeCounts[teamId] = 0; 
    awayCounts[teamId] = 0;
  });

  // Initialize assignments
  const optimizedFixtures = []; 

  // Shuffle fixtures for randomness
  fixtures = shuffleArray(fixtures);

  // For each fixture, decide on home/away assignment
  fixtures.forEach((fixture) => {
    const homeTeamId = fixture.homeTeam._id.toString();
    const awayTeamId = fixture.awayTeam._id.toString();
    const key = [homeTeamId, awayTeamId].sort().join('-'); // sort to make sure the key is always in the same order

    let selectedOption;

    if (previousFixtureMap && previousFixtureMap.has(key)) { // if there is previous season data
      // Previous fixture exists between these teams
      const previousFixture = previousFixtureMap.get(key); // get the previous fixture
      const previousHomeTeamId = previousFixture.homeTeam._id.toString(); // get the previous home team id

      // Alternate the venue compared to last season
      if (previousHomeTeamId === fixture.homeTeam._id.toString()) { // if the previous home team is the same as the current home team
        // Swap home and away
        selectedOption = {
          homeTeam: fixture.awayTeam,
          awayTeam: fixture.homeTeam,
        };
      } else {
        // Keep home and away as is
        selectedOption = {
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
        };
      }

      matchupChanges.push({ // record the change made
        previousMatchup: `${getTeamNameById(teams, previousFixture.homeTeam._id)} vs ${getTeamNameById( 
          teams,
          previousFixture.awayTeam._id
        )}`,
        currentMatchup: `${selectedOption.homeTeam.teamName} vs ${selectedOption.awayTeam.teamName}`,
        note: 'Venue alternated.',
      });
    } else {
      // No previous season data, assign while balancing home/away counts
      const homeCountHomeTeam = homeCounts[homeTeamId]; // get the home count for the home team
      const homeCountAwayTeam = homeCounts[awayTeamId]; // get the home count for the away team
      const awayCountHomeTeam = awayCounts[homeTeamId]; // get the away count for the home team
      const awayCountAwayTeam = awayCounts[awayTeamId]; // get the away count for the away team

      const canHomeTeamBeHome = homeCountHomeTeam < 3 && awayCountAwayTeam < 3; // check if the home team can be home (only 3 home games allowed)
      const canAwayTeamBeHome = homeCountAwayTeam < 3 && homeCountHomeTeam < 3; // check if the away team can be home (only 3 home games allowed)

      if (canHomeTeamBeHome && (!canAwayTeamBeHome || homeCountHomeTeam <= homeCountAwayTeam)) { // if the home team can be home and the away team cannot be home or the home team has less home games than the away team
        selectedOption = {
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
        };
      } else if (canAwayTeamBeHome) { // if the away team can be home
        selectedOption = {
          homeTeam: fixture.awayTeam,
          awayTeam: fixture.homeTeam,
        };
      } else {
        // If both options exceed home/away counts, assign randomly
        if (Math.random() < 0.5) { 
          selectedOption = {
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
          };
        } else {
          selectedOption = {
            homeTeam: fixture.awayTeam,
            awayTeam: fixture.homeTeam,
          };
        }
      }

      matchupChanges.push({ // record the change made
        previousMatchup: 'No previous matchup',
        currentMatchup: `${selectedOption.homeTeam.teamName} vs ${selectedOption.awayTeam.teamName}`,
        note: 'Venue assigned to manage constraints.',
      });
    }

    // Update counts
    const selectedHomeTeamId = selectedOption.homeTeam._id.toString();
    const selectedAwayTeamId = selectedOption.awayTeam._id.toString();
    homeCounts[selectedHomeTeamId] += 1;
    awayCounts[selectedAwayTeamId] += 1;

    // Assign stadium and location
    const homeTeamStadium = selectedOption.homeTeam.stadium;
    if (!homeTeamStadium) { // if the stadium is not found
      console.warn(
        `Stadium not found for team ${selectedOption.homeTeam.teamName}. Assigning 'Unknown' as location.`
      );
      selectedOption.stadium = null; // assign null to stadium
      selectedOption.location = 'Unknown'; // assign unknown to location
    } else {
      selectedOption.stadium = homeTeamStadium;
      selectedOption.location = homeTeamStadium.stadiumCity;
    }

    optimizedFixtures.push(selectedOption);
  });

  // Ensure home and away counts are balanced
  balanceHomeAwayCounts(optimizedFixtures, homeCounts, awayCounts, teams, previousFixtureMap);

  console.log('Home and away assignments have been optimized with venues alternated.');
  return { optimizedFixtures, matchupChanges };
}

/**
 * Balance home and away counts to ensure each team has at least 2 home and 2 away games,
 * while respecting the venue alternation from the previous season.
 *
 * @param {Array} fixtures - List of fixtures.
 * @param {Object} homeCounts - Home game counts per team.
 * @param {Object} awayCounts - Away game counts per team.
 * @param {Array} teams - List of team objects.
 * @param {Map} previousFixtureMap - Map of previous season fixtures.
 */
function balanceHomeAwayCounts(fixtures, homeCounts, awayCounts, teams, previousFixtureMap) {
  console.log('Balancing home and away counts while respecting venue alternation...');
  let adjustmentsMade;

  do {
    adjustmentsMade = false;

    teams.forEach((team) => {
      const teamId = team._id.toString();
      if (homeCounts[teamId] < 2) {
        // Find a fixture where the team is away and can swap without violating venue alternation
        for (let fixture of fixtures) {
          const homeTeamId = fixture.homeTeam._id.toString();
          const awayTeamId = fixture.awayTeam._id.toString();
          const key = [homeTeamId, awayTeamId].sort().join('-');

          if (awayTeamId === teamId && homeCounts[homeTeamId] > 2) { // if the team is away and the home team has more than 2 home games
            // Check if swapping would violate venue alternation
            let canSwap = true;
            if (previousFixtureMap && previousFixtureMap.has(key)) { // if there is previous season data
              const previousFixture = previousFixtureMap.get(key); // get the previous fixture
              const previousHomeTeamId = previousFixture.homeTeam._id.toString(); 
              // After swapping, check if the new home team is the same as last season
              if (previousHomeTeamId === teamId) { // if the previous home team is the same as the current team
                canSwap = false;
              }
            }
            if (canSwap) {
              // Swap home and away
              if (homeCounts[teamId] + 1 <= 3 && awayCounts[homeTeamId] + 1 <= 3) { // if the team has less than 3 home games and the home team has less than 3 away games
                // Swap home and away
                [fixture.homeTeam, fixture.awayTeam] = [fixture.awayTeam, fixture.homeTeam]; 
                // Update counts
                homeCounts[teamId] += 1;
                awayCounts[teamId] -= 1;
                homeCounts[homeTeamId] -= 1;
                awayCounts[homeTeamId] += 1;
                adjustmentsMade = true;
              }

              // Update stadium and location (same as other method)
              const homeTeamStadium = fixture.homeTeam.stadium;
              if (!homeTeamStadium) {
                console.warn(
                  `Stadium not found for team ${fixture.homeTeam.teamName}. Assigning 'Unknown' as location.`
                );
                fixture.stadium = null;
                fixture.location = 'Unknown';
              } else {
                fixture.stadium = homeTeamStadium;
                fixture.location = homeTeamStadium.stadiumCity;
              }

              adjustmentsMade = true; // adjustments made
              break;
            }
          }
        }
      }
    });
  } while (adjustmentsMade); // keep doing this until no adjustments are made

  console.log('Home and away counts balanced.');
}

/**
 * Shuffle an array in place. Fisher-Yates algorithm.
 *
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Assign fixtures to rounds while allowing swapping between rounds to minimize travel.
 *
 * @param {Array} fixtures - List of fixtures with homeTeam and awayTeam.
 * @param {Array} teams - List of team objects.
 * @param {Object} distances - Precomputed distances between teams.
 * @returns {Object} - Object containing scheduledFixtures.
 */
function assignFixturesToRoundsOptimized(fixtures, teams, distances) {
  console.log('Assigning fixtures to rounds with optimization...');

  const totalRounds = 5; // For 6 teams
  const rounds = Array.from({ length: totalRounds }, () => []);
  const teamRoundMap = {};
  const teamIds = teams.map((team) => team._id.toString());

  // Initialize teamRoundMap
  teamIds.forEach((teamId) => {
    teamRoundMap[teamId] = new Set();
  });

  let unassignedFixtures = [];
  let resetAttempts = 0;
  const maxResetAttempts = 1000; // Maximum number of reset attempts

  while (resetAttempts < maxResetAttempts) {
    unassignedFixtures = shuffleArray([...fixtures]); // Shuffle fixtures each time
    // Clear previous assignments
    rounds.forEach((round) => round.splice(0, round.length)); // clear all rounds
    teamIds.forEach((teamId) => {
      teamRoundMap[teamId].clear(); 
    });

    let success = true;

    for (let fixture of unassignedFixtures) { // for each fixture
      let assigned = false; // Assume not assigned until proven otherwise

      // Try to assign the fixture to a round
      for (let round = 1; round <= totalRounds; round++) {
        const homeId = fixture.homeTeam._id.toString();
        const awayId = fixture.awayTeam._id.toString();

        if (!teamRoundMap[homeId].has(round) && !teamRoundMap[awayId].has(round)) { // if the team has not played in this round
          rounds[round - 1].push(fixture); // add the fixture to the round
          teamRoundMap[homeId].add(round);
          teamRoundMap[awayId].add(round);
          fixture.round = round; // assign the round to the fixture
          assigned = true; // assigned
          break;
        }
      }

      if (!assigned) { // if the fixture was not assigned
        // Could not assign fixture, need to reset and try again
        success = false;
        break;
      }
    }

    if (success) {
      console.log('All fixtures have been assigned to rounds.');
      const scheduledFixtures = rounds.flat(); // flatten the rounds so that it is a single array
      return { scheduledFixtures }; // return the scheduled fixtures and break the loop
    } else { // if not successful
      resetAttempts++; // increment the reset attempts
    }
  }

  console.warn('Max reset attempts reached while assigning fixtures to rounds.');
  const scheduledFixtures = rounds.flat(); // flatten the rounds so that it is a single array
  return { scheduledFixtures };
}

/**
 * Calculate the travel distances for each team based on the current fixture layout.
 *
 * @param {Array} fixtures - List of fixtures with dates scheduled.
 * @param {Object} distances - Precomputed distances between teams.
 * @param {Array} teams - List of team objects.
 * @returns {Object} - Object containing total travel distance per team and per match.
 */
function calculateTeamTravelDistances(fixtures, distances, teams) {
  const teamTravelDistances = {};
  const matchTravelDistances = [];
  const teamLocations = {}; // Current location of each team

  // Initialize team locations to their home stadiums
  teams.forEach((team) => {
    const teamId = team._id.toString();
    teamLocations[teamId] = {
      latitude: team.stadium.latitude,
      longitude: team.stadium.longitude,
    };
    teamTravelDistances[teamId] = 0; // Initialize travel distance to 0
  });

  // Sort fixtures by date and round
  fixtures.sort((a, b) => a.date - b.date || a.round - b.round);

  // Create a mapping from stadium coordinates to team names for easy lookup
  const coordToTeamName = {};
  teams.forEach((team) => {
    const stadium = team.stadium;
    if (stadium) {
        const key = `${stadium.latitude},${stadium.longitude}`; // create a key from the coordinates
        coordToTeamName[key] = team.teamName; // assign the team name to the key
    }
  });

  fixtures.forEach((fixture) => { // for each fixture
    const homeId = fixture.homeTeam._id.toString();
    const awayId = fixture.awayTeam._id.toString();

    // Home team stays at their stadium
    const homeLocation = {
      latitude: fixture.stadium.latitude,
      longitude: fixture.stadium.longitude,
    };

    // Calculate away team's travel from their current location to the match location
    const awayCurrentLocation = teamLocations[awayId]; // get the current location of the away team
    const travelToMatch = calculateDistanceBetweenCoordinates( // calculate the distance to the match
      awayCurrentLocation,
      homeLocation
    );

    // Update total travel distance for away team
    teamTravelDistances[awayId] += travelToMatch;

    // Record travel details
    const fromKey = `${awayCurrentLocation.latitude.toFixed(2)},${awayCurrentLocation.longitude.toFixed(2)}`;
    const toKey = `${homeLocation.latitude.toFixed(2)},${homeLocation.longitude.toFixed(2)}`;
    const fromTeamName = coordToTeamName[fromKey] || 'Unknown'; 
    const toTeamName = coordToTeamName[toKey] || 'Unknown';

    matchTravelDistances.push({ // record the travel distance
      round: fixture.round,
      teamName: fixture.awayTeam.teamName,
      fromTeamName: fromTeamName,
      from: awayCurrentLocation,
      toTeamName: toTeamName,
      to: homeLocation,
      opponent: fixture.homeTeam.teamName,
      distance: travelToMatch,
      date: fixture.date,
      note: null,
    });

    // Update away team's current location to match location (home stadium)
    teamLocations[awayId] = homeLocation;

    // For home team, check if they were away in the previous match
    if (fixture.round > 1) {
      const previousFixture = fixtures.find(
        (f) =>
          f.round === fixture.round - 1 && 
          (f.homeTeam._id.toString() === homeId || f.awayTeam._id.toString() === homeId) // if the home team was home in the previous fixture
      );
      if (previousFixture) { // if there is a previous fixture
        const wasAwayLastMatch = previousFixture.awayTeam._id.toString() === homeId; // check if the home team was away in the previous fixture
        if (wasAwayLastMatch) {
          // Home team needs to travel back home
          const previousOpponentId =
            previousFixture.homeTeam._id.toString() === homeId
              ? previousFixture.awayTeam._id.toString()
              : previousFixture.homeTeam._id.toString();
          const previousLocation = teamLocations[homeId]; // get the previous location of the home team
          const travelBackHome = calculateDistanceBetweenCoordinates( // calculate the distance back home
            previousLocation,
            homeLocation
          );
          teamTravelDistances[homeId] += travelBackHome; // update the travel distance with the distance back home

          // Record travel back home
          const prevFromKey = `${previousLocation.latitude.toFixed(2)},${previousLocation.longitude.toFixed(2)}`;
          const prevToKey = `${homeLocation.latitude.toFixed(2)},${homeLocation.longitude.toFixed(2)}`;
          const prevFromTeamName = coordToTeamName[prevFromKey] || 'Unknown';
          const prevToTeamName = coordToTeamName[prevToKey] || 'Unknown';

          matchTravelDistances.push({
            round: fixture.round - 1,
            teamName: fixture.homeTeam.teamName,
            fromTeamName: prevFromTeamName,
            from: previousLocation,
            toTeamName: prevToTeamName,
            to: homeLocation,
            opponent: getTeamNameById(teams, previousOpponentId),
            distance: travelBackHome,
            date: fixture.date,
            note: 'Return home',
          });

          // Update home team's current location to home stadium
          teamLocations[homeId] = homeLocation;
        }
      }
    }
  });

  // At the end of the season, if a team is not at home, bring them back home
  teams.forEach((team) => {
    const teamId = team._id.toString();
    const homeLocation = {
      latitude: team.stadium.latitude,
      longitude: team.stadium.longitude,
    };
    const currentLocation = teamLocations[teamId];

    if (
      currentLocation.latitude !== homeLocation.latitude || // if the team is not at home
      currentLocation.longitude !== homeLocation.longitude
    ) {
      const travelBackHome = calculateDistanceBetweenCoordinates(
        currentLocation,
        homeLocation
      );
      teamTravelDistances[teamId] += travelBackHome;

      // Record travel back home
      matchTravelDistances.push({
        round: fixtures[fixtures.length - 1].round,
        teamName: team.teamName,
        fromTeamName: coordToTeamName[`${currentLocation.latitude.toFixed(2)},${currentLocation.longitude.toFixed(2)}`] || 'Unknown',
        from: currentLocation,
        toTeamName: team.teamName,
        to: homeLocation,
        opponent: 'Home',
        distance: travelBackHome,
        date: null,
        note: 'Return home at season end',
      });

      teamLocations[teamId] = homeLocation;
    }
  });

  return { teamTravelDistances, matchTravelDistances };
}

/**
 * Calculate the (Haversine distance between two coordinates). Google Maps API is used to get the distance between two coordinates. //! DOUBLE CHECK THIS!!!!!!
 *
 * @param {Object} coord1 - Coordinates { latitude, longitude }.
 * @param {Object} coord2 - Coordinates { latitude, longitude }.
 * @returns {Number} - Distance in kilometers.
 */
function calculateDistanceBetweenCoordinates(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const lat1 = coord1.latitude * (Math.PI / 180); // convert to radians
  const lat2 = coord2.latitude * (Math.PI / 180); // convert to radians
  const deltaLat = lat2 - lat1; // get the difference in latitude
  const deltaLon = (coord2.longitude - coord1.longitude) * (Math.PI / 180); // get the difference in longitude

  const a = // a is the square of half the chord length between the points
    Math.sin(deltaLat / 2) ** 2 + // calculate a
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2; // calculate b which is the square of half the chord length between the points
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // calculate c which is the angular distance in radians

  return R * c; // return the distance
}

/**
 * Schedule fixtures with dates and times, considering sequential games and minimizing travel.
 *
 * @param {Array} fixtures - The list of fixtures with rounds assigned.
 * @param {Number} season - The season year.
 * @param {Object} distances - Precomputed distances between teams.
 * @returns {Array} - Fixtures with date and time scheduled.
 */
async function scheduleFixturesOptimized(fixtures, season, distances, restWeeks = []) {
  console.log('Scheduling fixtures with consideration for sequential games...');

  // Define possible match times
  const matchTimes = [
    // Saturday
    { day: 6, timeSlots: ['12:00', '14:00', '16:00'] }, //! more later
  ];

  const scheduledFixtures = [];
  let dateCursor = new Date(`${season}-02-01`); // Start from February 1st
  console.log(`Starting scheduling from date: ${dateCursor.toDateString()}`);

  // Group fixtures by rounds
  const rounds = {};
  for (let fixture of fixtures) {
    if (!rounds[fixture.round]) {
      rounds[fixture.round] = [];
    }
    rounds[fixture.round].push(fixture);
  }

  // Schedule each round
  for (let round = 1; round <= 5; round++) {
    const roundFixtures = rounds[round];
    let roundDateCursor = new Date(dateCursor);
    console.log(`\nScheduling Round ${round} fixtures:`);

    // Sort fixtures in the round based on away teams' previous match
    roundFixtures.sort((a, b) => {
      const aPrevDistance = getPreviousTravelDistance(a.awayTeam._id, scheduledFixtures, distances);
      const bPrevDistance = getPreviousTravelDistance(b.awayTeam._id, scheduledFixtures, distances);
      return aPrevDistance - bPrevDistance;
    });

    for (let fixture of roundFixtures) {
      let scheduled = false;
      while (!scheduled) {
        const dayOfWeek = roundDateCursor.getDay(); 
        const matchDay = matchTimes.find((mt) => mt.day === dayOfWeek); // find the match day based on the day of the week

        if (matchDay) {
          for (let time of matchDay.timeSlots) { // for each time slot
            const dateTimeString = `${roundDateCursor
              .toISOString()
              .split('T')[0]}T${time}:00`;
            const dateTime = new Date(dateTimeString); // create a date object

            // Check if this date and time is already taken
            const isSlotTaken = scheduledFixtures.some(
              (f) => f.date.getTime() === dateTime.getTime()
            );

            // Check if the teams are already scheduled in the same week
            const weekStart = getWeekStartDate(dateTime);
            const teamInWeek = scheduledFixtures.some((f) => {
              const fWeekStart = getWeekStartDate(f.date);
              return (
                fWeekStart.getTime() === weekStart.getTime() &&
                (f.homeTeam._id.toString() === fixture.homeTeam._id.toString() ||
                  f.awayTeam._id.toString() === fixture.awayTeam._id.toString()) // if the team is already scheduled in the same week
              );
            });

            if (!isSlotTaken && !teamInWeek) { // if the slot is not taken and the team is not scheduled in the same week
              // Assign date and time
              fixture.date = dateTime;
              scheduledFixtures.push(fixture);
              scheduled = true;
              console.log(
                `  Assigned: ${fixture.homeTeam.teamName} vs ${fixture.awayTeam.teamName} on ${dateTime}`
              );
              break;
            }
          }
        }

        if (!scheduled) {
          // Move to the next day
          roundDateCursor.setDate(roundDateCursor.getDate() + 1); // move to the next day
          console.log(
            `    No available slots on ${roundDateCursor.toDateString()}, moving to next day.`
          );
        }
      }
    }

    // Move dateCursor to the next week after the round
    dateCursor.setDate(dateCursor.getDate() + 7); 
    console.log(`  Moving to next week starting from ${dateCursor.toDateString()}`);
    // Check if a rest week is specified for this round; if so, skip an extra week.
    if (restWeeks.includes(round)) {
      dateCursor.setDate(dateCursor.getDate() + 7);
      console.log(`  Rest week inserted after Round ${round}. New start date: ${dateCursor.toDateString()}`);
    } else {
      console.log(`  Moving to next week starting from ${dateCursor.toDateString()}`);
    }
  }

  console.log('All fixtures have been scheduled with dates and times.');
  return scheduledFixtures;
}

/**
 * Get the previous travel distance for a team.
 *
 * @param {String} teamId - Team ID.
 * @param {Array} scheduledFixtures - List of scheduled fixtures.
 * @param {Object} distances - Precomputed distances.
 * @returns {Number} - Previous travel distance.
 */
function getPreviousTravelDistance(teamId, scheduledFixtures, distances) {
  const lastFixture = [...scheduledFixtures].reverse().find( // get the last fixture
    (f) => f.awayTeam._id.toString() === teamId || f.homeTeam._id.toString() === teamId // if the team is the away team or the home team
  );

  if (!lastFixture) { // if there is no last fixture
    return 0;
  }

  const opponentId =
    lastFixture.awayTeam._id.toString() === teamId
      ? lastFixture.homeTeam._id.toString()
      : lastFixture.awayTeam._id.toString();

  return distances[`${teamId}-${opponentId}`] || 0; // return the distance between the team and the opponent
}

/**
 * Precompute and cache the distances between all pairs of teams.
 *
 * @param {Array} teams - List of team objects.
 * @returns {Object} - Object containing distances and messages.
 */
async function precomputeDistances(teams) {
  console.log('Precomputing distances between all stadiums...');
  const distances = {}; // Key: 'teamAId-teamBId', Value: distance
  const distanceMessages = []; // Messages for each distance calculation

  // Get stadium locations
  const teamStadiums = {};
  for (let team of teams) {
    const stadium = team.stadium;
    if (!stadium) {
      console.warn(
        `Stadium not found for team ${team.teamName}. Assigning default coordinates (0,0).`
      );
      teamStadiums[team._id.toString()] = {
        latitude: 0,
        longitude: 0,
      };
    } else {
      teamStadiums[team._id.toString()] = {
        latitude: stadium.latitude,
        longitude: stadium.longitude,
      };
    }
  }

  // Compute distances between all pairs in parallel
  const distancePromises = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const teamA = teams[i]; // get the first team
      const teamB = teams[j]; // get the second team
      const teamAId = teamA._id.toString(); 
      const teamBId = teamB._id.toString();
      const locationA = teamStadiums[teamAId]; // get the location of the first team
      const locationB = teamStadiums[teamBId]; // get the location of the second team

      console.log(
        `Queuing distance calculation between ${teamA.teamName} and ${teamB.teamName}...`
      );
      distancePromises.push(
        getDistanceBetweenLocations(locationA, locationB).then((distance) => {
          distances[`${teamAId}-${teamBId}`] = distance; // assign the distance
          distances[`${teamBId}-${teamAId}`] = distance; // Symmetric
          const message = `Distance between ${teamA.teamName} and ${teamB.teamName}: ${distance.toFixed(
            2
          )} km`; // create a message
          distanceMessages.push(message);
          console.log(message);
        })
      );
    }
  }

  await Promise.all(distancePromises); // wait for all the promises to resolve
  console.log('All distances have been precomputed.');

  return { distances, distanceMessages };
}

/**
 * Get team name by ID.
 *
 * @param {Array} teams - List of team objects.
 * @param {String} teamId - Team ID.
 * @returns {String} - Team name.
 */
function getTeamNameById(teams, teamId) {
  const team = teams.find((t) => t._id.toString() === teamId.toString());
  return team ? team.teamName : 'Unknown Team';
}

/**
 * Get the start date of the week for a given date.
 *
 * @param {Date} date - The date to find the week's start.
 * @returns {Date} - The start date (Sunday) of the week.
 */
function getWeekStartDate(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay()); // Set to Sunday
  copy.setHours(0, 0, 0, 0); // Set to midnight
  return copy;
}

/**
 * Build summary for the fixtures.
 *
 * @param {Array} teams - List of teams.
 * @param {Array} fixtures - List of scheduled fixtures.
 * @param {Array} distanceMessages - Distance calculations messages.
 * @param {Object} teamTravelDistances - Total travel distances per team.
 * @param {Array} matchTravelDistances - Travel distances per match.
 * @param {Array} matchupChanges - Previous and current matchups.
 * @param {Number} totalTravelDistance - Total overall travel distance.
 * @returns {Array} - Summary lines.
 */
function buildSummary(
  teams,
  fixtures,
  distanceMessages,
  teamTravelDistances,
  matchTravelDistances,
  matchupChanges,
  totalTravelDistance
) {
  const summary = [];
  // summary.push('===== Fixture Scheduling Summary =====');
  // summary.push('- Total travel distance minimized for teams.');
  // summary.push('- Home and away games balanced for each team (at least 2 home and 2 away games).');
  // summary.push('- Alternating venue rule applied based on previous season.');
  // summary.push('- Each team plays once per week.');
  // summary.push('- Sequential away games scheduled when possible.');
  // summary.push('========================================\n');

  summary.push(`Total Overall Travel Distance: ${totalTravelDistance.toFixed(2)} km`);

  summary.push('\nPrevious and Current Season Matchups:');
  matchupChanges.forEach((mc) => {
    summary.push(
      `  Previous: ${mc.previousMatchup} ||| Current: ${mc.currentMatchup} { ${mc.note} }`
    );
  });

  summary.push('\nDistance Calculations:');
  summary.push(...distanceMessages); // add the distance messages

  summary.push('\nTravel Distance Breakdown per Match:');
  // Create a mapping from stadium coordinates to team names
  const coordToTeamName = {}; // create a mapping from coordinates to team names
  teams.forEach((team) => { // for each team
    const stadium = team.stadium;
    if (stadium) {
      const key = `${stadium.latitude.toFixed(2)},${stadium.longitude.toFixed(2)}`; // create a key from the coordinates
      coordToTeamName[key] = team.teamName;
    }
  });

  matchTravelDistances.forEach((md) => { // for each match travel distance
    const fromKey = md.from
      ? `${md.from.latitude.toFixed(2)},${md.from.longitude.toFixed(2)}` // get the from key
      : null;
    const toKey = md.to
      ? `${md.to.latitude.toFixed(2)},${md.to.longitude.toFixed(2)}` // get the to key
      : null;

    const fromTeamName = fromKey && coordToTeamName[fromKey] ? coordToTeamName[fromKey] : 'Unknown'; // get the from team name
    const toTeamName = toKey && coordToTeamName[toKey] ? coordToTeamName[toKey] : 'Unknown'; // get the to team name

    const note = md.note ? ` - ${md.note}` : ''; // get the note
    if (md.note === 'Return home') {
      // This is a return home trip after an away match
      summary.push(
        `  Round ${md.round}: ${md.teamName} travels from ${fromTeamName}[${md.from.latitude.toFixed(
          2
        )}, ${md.from.longitude.toFixed(2)}] to ${toTeamName}[${md.to.latitude.toFixed(
          2
        )}, ${md.to.longitude.toFixed(2)}] - ${md.distance.toFixed(
          2
        )} km${note}`
      );
    } else {
      summary.push(
        `  Round ${md.round}: ${md.teamName}: ${fromTeamName}[${md.from.latitude.toFixed(
          2
        )}, ${md.from.longitude.toFixed(2)}] to ${toTeamName}[${md.to.latitude.toFixed(
          2
        )}, ${md.to.longitude.toFixed(2)}] to play ${md.opponent} - ${md.distance.toFixed(
          2
        )} km${note}`
      );
    }
  });

  summary.push('\nTotal Travel Distances for Each Team:');
  teams.forEach((team) => {
    const teamId = team._id.toString();
    const totalDistance = teamTravelDistances[teamId] || 0;
    summary.push(`  ${team.teamName}: ${totalDistance.toFixed(2)} km`);
  });

  return summary;
}

/**
 * Calculate the driving distance between two locations using the Haversine formula with caching.
 *
 * @param {Object} origin - Origin coordinates { latitude, longitude }.
 * @param {Object} destination - Destination coordinates { latitude, longitude }.
 * @returns {Number} - Distance in kilometers.
 */
async function getDistanceBetweenLocations(origin, destination) {
  const cacheKey = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;
  const cachedDistance = distanceCache.get(cacheKey);
  if (cachedDistance !== undefined) {
    console.log(`Cache hit for distance between ${cacheKey}: ${cachedDistance.toFixed(2)} km`);
    return cachedDistance;
  }
  
  // Calculate distance using the Haversine formula
  const distanceInKilometers = calculateDistanceBetweenCoordinates(origin, destination);
  console.log(`Calculated distance between ${cacheKey} using Haversine formula: ${distanceInKilometers.toFixed(2)} km.`);
  
  // Cache the distance
  distanceCache.set(cacheKey, distanceInKilometers);
  return distanceInKilometers;
}

module.exports = {
  generateTravelOptimizedFixtures,
};
