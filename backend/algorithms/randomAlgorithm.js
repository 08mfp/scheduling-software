 // backend/algorithms/randomAlgorithm.js
/**
 * @module backend/algorithms/randomAlgorithm
 * @description This module contains the Random algorithm for generating fixtures.
 * @description It works by generating all unique matchups and then assigning home and away teams.
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

//? CODE IMPROVEMENT IDEAS:
//? 1. Give user option to incorporate rest weeks (e.g. after round 2 and 4)
//? 2. Add tests for all functions and algorithm overall
//? 3. after provisional fixtures are generated, allow user to manually edit fixtures (using provisional fixture functioinality). then send to final. 
//? ^MIGHT BE DIFFICULT AS IT WOULD VALIDATE CONSTRAINTS. MAYVE ALLOW TO EDIT DATES AND TIMES ONLY (WITHIN ROUND WEEKEND)
//? 4.  show on front end the summary of the fixtures generated (and have a checker for all constraints)

//* RESTRICT FROM FRONT END SO THT BACK END ONLY RECEIVES 6 TEAMS

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');

/**
 * Shuffle an array in-place using the Fisher-Yates algorithm. (https://www.geeksforgeeks.org/shuffle-a-given-array-using-fisher-yates-shuffle-algorithm/)
 *
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) { // Start from the last element
    const j = Math.floor(Math.random() * (i + 1)); // Pick a random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]]; // Swap array[i] and array[j]
  }
  return array;
}

/**
 * Generate a random date within allowed range.
 *
 * @param {Number} season - The season year.
 * @returns {String} - ISO string of the generated date.
 */
function generateRandomDate(season) {
  //Generate dates between February 1st and March 30th of the season
  const start = new Date(`${season}-02-01T18:00:00`); // 6:00 PM
  const end = new Date(`${season}-03-30T20:00:00`); // 8:00 PM
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); // Random date
  return date.toISOString();
}

/**
 * Fetch previous season's fixtures to calculate home/away teams.
 *
 * @param {Array} teams - List of team objects (with the team _id)
 * @param {Number} currentSeason - The current season year.
 * @returns {Object} - A map with matchup keys and their previous home team (if available).
 */
async function fetchPreviousYearFixtures(teams, currentSeason) {
  const previousSeason = currentSeason - 1;

  // Fetch all fixtures from the previous season
  const previousFixtures = await Fixture.find({ season: previousSeason });

  // Create a HAshmap to store previous home teams for each matchup
  const matchupMap = {};

  previousFixtures.forEach((fixture) => {
    const homeId = fixture.homeTeam.toString();
    const awayId = fixture.awayTeam.toString(); 
    const key = [homeId, awayId].sort().join('-'); // Sort team IDs to create a unique key
    matchupMap[key] = homeId; // Store previous home team ID in the map
  });

  return matchupMap;
}

/**
 * Assign home and away teams based on previous year's data.
 * If no previous data exists, assign randomly.
 *
 * @param {String} teamAId - ID of Team A.
 * @param {String} teamBId - ID of Team B.
 * @param {Object} previousMatchupMap - Map of previous home teams and matchups.
 * @param {Object} teamObjects - Map of team IDs to team objects.
 * @returns {Object} - Matchup with assigned home and away teams in fixtures.
 */
function assignHomeAway(teamAId, teamBId, previousMatchupMap, teamObjects) {
  const key = [teamAId, teamBId].sort().join('-'); // Sort team IDs to create a unique key

  if (previousMatchupMap[key]) {
    // if previous home team exists; alternate home and away
    const previousHomeId = previousMatchupMap[key];
    if (previousHomeId === teamAId) {
      return {
        homeTeam: teamObjects[teamBId],
        awayTeam: teamObjects[teamAId],
      };
    } else {
      return {
        homeTeam: teamObjects[teamAId],
        awayTeam: teamObjects[teamBId],
      };
    }
  } else {
    // No previous data; assign randomly based on 50/50
    if (Math.random() < 0.5) {
      return {
        homeTeam: teamObjects[teamAId],
        awayTeam: teamObjects[teamBId],
      };
    } else {
      return {
        homeTeam: teamObjects[teamBId],
        awayTeam: teamObjects[teamAId],
      };
    }
  }
}

/**
 * Generate all unique matchups (each team plays every other team once). This would be 15 matchups for 6 teams. (round-robin)
 *
 * @param {Array} teams - List of team objects.
 * @returns {Array} - List of matchup objects with team IDs.
 */
function generateAllMatchups(teams) {
  const matchups = [];
  const numTeams = teams.length;

  for (let i = 0; i < numTeams; i++) { // Generate all unique matchups
    for (let j = i + 1; j < numTeams; j++) { // Start from i+1 to avoid duplicates
      matchups.push({
        teamAId: teams[i]._id.toString(),
        teamBId: teams[j]._id.toString(),
      });
    }
  }

  return matchups;
}

/**
 * Generate fixtures using round Robin algorithm.
 *
 * @param {Array} teams - List of exactly 6 team objects. //!!Restrict from Front END
 * @param {Number} season - The season year.
 * @returns {Object} - An object containing fixtures and summary.
 */
async function generateRandomFixtures(teams, season) {
  try {
    // Validate team count
    if (teams.length !== 6) {
      throw new Error('Exactly 6 teams are required for the Random algorithm.');
    }

    // Step 1: Fetch previous year's fixtures to determine home/away assignments
    const previousMatchupMap = await fetchPreviousYearFixtures(teams, season);

    // Step 2: Generate all unique matchups
    const allMatchups = generateAllMatchups(teams);

    // Step 3: Assign home and away teams based on previous year or randomly
    const teamObjects = teams.reduce((obj, team) => {
      obj[team._id.toString()] = team;
      return obj;
    }, {});

    const assignedMatchups = allMatchups.map((matchup) =>
      assignHomeAway(matchup.teamAId, matchup.teamBId, previousMatchupMap, teamObjects)
    );

    // Step 4: Implement Round Robin Scheduling using the Circle Method
    const totalRounds = teams.length - 1; // 5 rounds
    const matchesPerRound = teams.length / 2; // 3 matches per round

    // Initialize rounds
    const rounds = Array.from({ length: totalRounds }, () => []);

    // List of team IDs excluding the fixed team
    const fixedTeam = assignedMatchups[0].homeTeam; // Choose the first team as fixed
    const otherTeams = teams
      .filter((team) => team._id.toString() !== fixedTeam._id.toString())
      .map((team) => team._id.toString());

    // Shuffle otherTeams to add randomness
    shuffleArray(otherTeams);

    for (let round = 0; round < totalRounds; round++) {
      const roundFixtures = [];

      // Home team is fixedTeam vs the team at the current position
      const opponentId = otherTeams[otherTeams.length - 1];
      const matchupKey = [fixedTeam._id.toString(), opponentId].sort().join('-');

      let homeAwayAssignment = {};

      if (previousMatchupMap[matchupKey]) {
        // Alternate home and away based on previous year's fixture
        if (previousMatchupMap[matchupKey] === fixedTeam._id.toString()) {
          homeAwayAssignment = {
            homeTeam: teamObjects[opponentId],
            awayTeam: fixedTeam,
          };
        } else {
          homeAwayAssignment = {
            homeTeam: fixedTeam,
            awayTeam: teamObjects[opponentId],
          };
        }
      } else {
        // Assign randomly
        if (Math.random() < 0.5) {
          homeAwayAssignment = {
            homeTeam: fixedTeam,
            awayTeam: teamObjects[opponentId],
          };
        } else {
          homeAwayAssignment = {
            homeTeam: teamObjects[opponentId],
            awayTeam: fixedTeam,
          };
        }
      }

      roundFixtures.push({
        round: round + 1,
        homeTeam: homeAwayAssignment.homeTeam,
        awayTeam: homeAwayAssignment.awayTeam,
        stadium: homeAwayAssignment.homeTeam.stadium, // Assuming stadium is already populated
        location: '', // To be filled later
        season,
      });

      // Pair the remaining teams
      for (let i = 0; i < otherTeams.length / 2 - 1; i++) {
        const team1Id = otherTeams[i];
        const team2Id = otherTeams[otherTeams.length - 2 - i];

        const matchupKey = [team1Id, team2Id].sort().join('-');

        let homeAwayAssignmentPair = {};

        if (previousMatchupMap[matchupKey]) {
          // Alternate home and away based on previous year's fixture
          if (previousMatchupMap[matchupKey] === team1Id) {
            homeAwayAssignmentPair = {
              homeTeam: teamObjects[team2Id],
              awayTeam: teamObjects[team1Id],
            };
          } else {
            homeAwayAssignmentPair = {
              homeTeam: teamObjects[team1Id],
              awayTeam: teamObjects[team2Id],
            };
          }
        } else {
          // Assign randomly
          if (Math.random() < 0.5) {
            homeAwayAssignmentPair = {
              homeTeam: teamObjects[team1Id],
              awayTeam: teamObjects[team2Id],
            };
          } else {
            homeAwayAssignmentPair = {
              homeTeam: teamObjects[team2Id],
              awayTeam: teamObjects[team1Id],
            };
          }
        }

        roundFixtures.push({
          round: round + 1,
          homeTeam: homeAwayAssignmentPair.homeTeam,
          awayTeam: homeAwayAssignmentPair.awayTeam,
          stadium: homeAwayAssignmentPair.homeTeam.stadium,
          location: '', // Add home city later
          season,
        });
      }

      rounds[round] = roundFixtures;

      // Rotate the teams for the next round
      otherTeams.unshift(otherTeams.pop());
    }

    // Assign dates and times for fixtures
    const scheduledFixtures = await scheduleFixtures(rounds.flat(), season); // Flatten rounds (2D array)

    // fill stadium details and set locations
    const populatedFixtures = await Promise.all(
      scheduledFixtures.map(async (fixture) => {
        const stadium = await Stadium.findById(fixture.stadium); 
        return {
          ...fixture,
          stadium: stadium || { stadiumName: 'Unknown Stadium', stadiumCity: 'Unknown City' }, // unkown if not found in sdatabase
          location: stadium ? stadium.stadiumCity : 'Unknown City',
        };
      })
    );

    //Build summary (This displaus on the front end)
    const summary = [
      'Fixtures generated using the Random (Round Robin) algorithm.',
      `${populatedFixtures.length} fixtures scheduled across ${totalRounds} rounds.`,
    ];

    return { fixtures: populatedFixtures, summary };
  } catch (error) {
    console.error('Error in generateRandomFixtures:', error);
    throw error; // Show error to the controller (does it show in front end?)
  }
}

/**
 * Schedule dates and times for fixtures based on available match times. //! TEMPORARY AND NEED BETTER TIMING ALGORITHM
 *
 * @param {Array} fixtures - List of fixtures with assigned rounds.
 * @param {Number} season - The season year.
 * @returns {Array} - Fixtures with assigned dates and times.
 */
async function scheduleFixtures(fixtures, season) {
  // possible match times
  const matchTimes = [
    // Friday
    { day: 5, timeSlots: ['18:00', '20:00'] },
    // Saturday
    { day: 6, timeSlots: ['12:00', '14:00', '16:00', '18:00', '20:00'] },
    // Sunday
    { day: 0, timeSlots: ['12:00', '14:00', '16:00', '18:00', '20:00'] },
  ];

  const scheduledFixtures = [];
  let dateCursor = new Date(`${season}-02-01T00:00:00`); // Start from February 1st of the season

  // For each round, schedule fixtures
  const fixturesByRound = fixtures.reduce((acc, fixture) => {
    if (!acc[fixture.round]) acc[fixture.round] = []; // Initialize round array (hashmap that stores fixtures by round)
    acc[fixture.round].push(fixture); // Add fixture to the round
    return acc; 
  }, {});

  const totalRounds = Object.keys(fixturesByRound).length; // Total rounds

  for (let round = 1; round <= totalRounds; round++) { 
    const roundFixtures = fixturesByRound[round]; 
    // Find the first available week that can accommodate the round //! COULD TWEAK HERE FOR REST WEEKS
    let weekCursor = new Date(dateCursor); // Clone dateCursor

    let roundScheduled = false;

    while (!roundScheduled) {
      const roundDate = new Date(weekCursor);
      // Find dates within the week that match the match days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) { // Check each day of the week
        const currentDate = new Date(roundDate);
        currentDate.setDate(roundDate.getDate() + dayOffset); 
        const dayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
        const matchDay = matchTimes.find((mt) => mt.day === dayOfWeek); // Find match day

        if (matchDay) {
          for (let time of matchDay.timeSlots) { // Check each time slot
            const dateTimeString = `${currentDate.toISOString().split('T')[0]}T${time}:00`; // Combine date and time
            const dateTime = new Date(dateTimeString); // Convert to date object

            // Check if this date and time is already taken
            const isSlotTaken = scheduledFixtures.some(
              (f) => f.date.getTime() === dateTime.getTime()
            );

            if (!isSlotTaken) {
              // Assign the curent date and time to a fixture
              for (let fixture of roundFixtures) {
                if (!fixture.date) {  // If date is not already set
                  fixture.date = dateTime; 
                  fixture.location = fixture.location || 'Unknown Location'; // Ensure location is set
                  scheduledFixtures.push(fixture);
                }
              }
              roundScheduled = true;
              break;
            }
          }

          if (roundScheduled) break;
        }
      }

      if (!roundScheduled) {
        // Move to the next week
        weekCursor.setDate(weekCursor.getDate() + 7); // Move to the next week
        if (weekCursor.getFullYear() > season) { // Check if the week is in the next season
          throw new Error('Unable to schedule fixtures within the season timeframe.');
        }
      }
    }

    // Move dateCursor to the start of the next week
    dateCursor.setDate(dateCursor.getDate() + 7);
  }

  return scheduledFixtures;
}

module.exports = {
  generateRandomFixtures,
};