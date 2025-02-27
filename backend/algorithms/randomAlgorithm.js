// backend/algorithms/randomAlgorithm.js
/**
 * @module backend/algorithms/randomAlgorithm
 * @description This module contains the Random algorithm for generating fixtures.
 * It generates all unique matchups, assigns home/away based on previous season data (or randomly),
 * and schedules fixtures using a round-robin approach. Now includes the option for inserting up to 3 rest weeks,
 * random weekend time slots (ensuring a minimum 2‑hour gap between games), and produces a detailed summary.
 * @api NONE
 * @version 1.1.0
 * @authors github.com/08mfp
 */

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');

/**
 * Shuffle an array in-place using the Fisher-Yates algorithm.
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
 * Generate a random date within allowed range.
 *
 * @param {Number} season - The season year.
 * @returns {String} - ISO string of the generated date.
 */
function generateRandomDate(season) {
  const start = new Date(`${season}-02-01T18:00:00`);
  const end = new Date(`${season}-03-30T20:00:00`);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

/**
 * Fetch previous season's fixtures to calculate home/away teams.
 *
 * @param {Array} teams - List of team objects.
 * @param {Number} currentSeason - The current season year.
 * @returns {Object} - A map with matchup keys and their previous home team (if available).
 */
async function fetchPreviousYearFixtures(teams, currentSeason) {
  const previousSeason = currentSeason - 1;
  const previousFixtures = await Fixture.find({ season: previousSeason });
  const matchupMap = {};
  previousFixtures.forEach((fixture) => {
    const homeId = fixture.homeTeam.toString();
    const awayId = fixture.awayTeam.toString();
    const key = [homeId, awayId].sort().join('-');
    matchupMap[key] = homeId;
  });
  return matchupMap;
}

/**
 * Assign home and away teams based on previous year's data.
 *
 * @param {String} teamAId - ID of Team A.
 * @param {String} teamBId - ID of Team B.
 * @param {Object} previousMatchupMap - Map of previous home teams and matchups.
 * @param {Object} teamObjects - Map of team IDs to team objects.
 * @returns {Object} - Object with assigned home and away teams.
 */
function assignHomeAway(teamAId, teamBId, previousMatchupMap, teamObjects) {
  const key = [teamAId, teamBId].sort().join('-');
  if (previousMatchupMap[key]) {
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
 * Generate all unique matchups (each team plays every other team once).
 *
 * @param {Array} teams - List of team objects.
 * @returns {Array} - List of matchup objects.
 */
function generateAllMatchups(teams) {
  const matchups = [];
  const numTeams = teams.length;
  for (let i = 0; i < numTeams; i++) {
    for (let j = i + 1; j < numTeams; j++) {
      matchups.push({
        teamAId: teams[i]._id.toString(),
        teamBId: teams[j]._id.toString(),
      });
    }
  }
  return matchups;
}

/**
 * Schedule fixtures for rounds.
 * Each round’s fixtures are all scheduled to play on the same weekend.
 * Three distinct time slots (from Saturday and Sunday) are chosen at random
 * ensuring a minimum 2‑hour gap between games.
 * Also builds a summary that lists each match week’s commencement and indicates when a rest week is inserted.
 *
 * @param {Array} rounds - Array of rounds, where each round is an array of 3 fixture objects.
 * @param {Number} season - The season year.
 * @param {Array} restWeeks - Array of round numbers after which a rest week should be inserted.
 * @returns {Object} - { scheduledFixtures, summaryLines }
 */
async function scheduleFixtures(rounds, season, restWeeks = []) {
  const availableTimes = ["14:00", "16:00", "18:00", "20:00"]; // Available times on Saturday and Sunday
  let scheduledFixtures = [];
  let summaryLines = [];
  let dateCursor = new Date(`${season}-02-01T00:00:00`);

  // For each round (for 6 teams, there will be 5 rounds)
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const roundFixtures = rounds[roundIndex];
    // Determine the upcoming Saturday from the current dateCursor.
    let d = dateCursor.getDay();
    let daysToSaturday = (6 - d + 7) % 7;
    let saturday = new Date(dateCursor);
    saturday.setDate(dateCursor.getDate() + daysToSaturday);

    // Build candidate time slots for the weekend (Saturday and Sunday).
    let candidateSlots = [];
    // Saturday slots.
    for (let time of availableTimes) {
      let dt = new Date(saturday.toISOString().split('T')[0] + 'T' + time + ':00');
      candidateSlots.push(dt);
    }
    // Sunday slots (Sunday is the day after Saturday).
    let sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    for (let time of availableTimes) {
      let dt = new Date(sunday.toISOString().split('T')[0] + 'T' + time + ':00');
      candidateSlots.push(dt);
    }
    // Shuffle candidateSlots and select 3 distinct slots.
    for (let i = candidateSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateSlots[i], candidateSlots[j]] = [candidateSlots[j], candidateSlots[i]];
    }
    const chosenSlots = candidateSlots.slice(0, 3);
    chosenSlots.sort((a, b) => a.getTime() - b.getTime());

    // Assign each of the 3 fixtures in this round a distinct time.
    for (let i = 0; i < roundFixtures.length; i++) {
      roundFixtures[i].date = chosenSlots[i];
    }
    // Use the earliest time as the round commencement.
    const roundCommencement = chosenSlots[0];
    const formattedDate = roundCommencement.toLocaleDateString("en-GB");

    // summaryLines.push(`Fixtures Have Been Generated using the Random Algorithm, matches and and timings have been selected at random`);
    summaryLines.push(`Match Week ${roundIndex + 1} commencing ${formattedDate}`);

    // Add the round's fixtures to the overall scheduled fixtures.
    scheduledFixtures = scheduledFixtures.concat(roundFixtures);

    // Update dateCursor to the Monday after the current weekend.
    let nextWeek = new Date(sunday);
    nextWeek.setDate(sunday.getDate() + 1);
    dateCursor = nextWeek;

    // If this round is marked for a rest week, insert one by skipping an extra week.
    if (restWeeks.includes(roundIndex + 1)) {
      summaryLines.push(`Rest Week inserted after Round ${roundIndex + 1}`);
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }
  summaryLines.push(
    "Disclaimer: All round matches are scheduled to play in the same weekend."
  );

  summaryLines.push(
    "If there are any issues (e.g. stadium renovations, natural disasters, etc.), the timings can be adjusted or postponed."
  );
  return { scheduledFixtures, summaryLines };
}

/**
 * Generate fixtures using a round-robin algorithm.
 * @param {Array} teams - List of exactly 6 team objects.
 * @param {Number} season - The season year.
 * @param {Array} restWeeks - Array of round numbers after which a rest week should be inserted.
 * @returns {Object} - An object containing { fixtures, summary }.
 */
async function generateRandomFixtures(teams, season, restWeeks = []) {
  try {
    if (teams.length !== 6) {
      throw new Error('Exactly 6 teams are required for the Random algorithm.');
    }
    const previousMatchupMap = await fetchPreviousYearFixtures(teams, season);
    const allMatchups = generateAllMatchups(teams);
    const teamObjects = teams.reduce((obj, team) => {
      obj[team._id.toString()] = team;
      return obj;
    }, {});
    const assignedMatchups = allMatchups.map((matchup) =>
      assignHomeAway(matchup.teamAId, matchup.teamBId, previousMatchupMap, teamObjects)
    );
    // Create rounds using the Circle Method.
    const totalRounds = teams.length - 1; // For 6 teams, there are 5 rounds.
    const rounds = Array.from({ length: totalRounds }, () => []);
    const fixedTeam = assignedMatchups[0].homeTeam;
    const otherTeams = teams
      .filter((team) => team._id.toString() !== fixedTeam._id.toString())
      .map((team) => team._id.toString());
    shuffleArray(otherTeams);
    for (let round = 0; round < totalRounds; round++) {
      const roundFixtures = [];
      const opponentId = otherTeams[otherTeams.length - 1];
      const matchupKey = [fixedTeam._id.toString(), opponentId].sort().join('-');
      let homeAwayAssignment = {};
      if (previousMatchupMap[matchupKey]) {
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
        stadium: homeAwayAssignment.homeTeam.stadium,
        location: '',
        season,
      });
      for (let i = 0; i < otherTeams.length / 2 - 1; i++) {
        const team1Id = otherTeams[i];
        const team2Id = otherTeams[otherTeams.length - 2 - i];
        const matchupKey = [team1Id, team2Id].sort().join('-');
        let homeAwayAssignmentPair = {};
        if (previousMatchupMap[matchupKey]) {
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
          location: '',
          season,
        });
      }
      rounds[round] = roundFixtures;
      otherTeams.unshift(otherTeams.pop());
    }
    // Schedule dates and times with rest weeks.
    const { scheduledFixtures, summaryLines } = await scheduleFixtures(rounds, season, restWeeks);
    // Populate stadium details.
    const populatedFixtures = await Promise.all(
      scheduledFixtures.map(async (fixture) => {
        const stadium = await Stadium.findById(fixture.stadium);
        return {
          ...fixture,
          stadium: stadium || { stadiumName: 'Unknown Stadium', stadiumCity: 'Unknown City' },
          location: stadium ? stadium.stadiumCity : 'Unknown City',
        };
      })
    );
    return { fixtures: populatedFixtures, summary: summaryLines };
  } catch (error) {
    console.error('Error in generateRandomFixtures:', error);
    throw error;
  }
}

module.exports = {
  generateRandomFixtures,
};
