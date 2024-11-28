 // backend/algorithms/round5Extravaganza.js
/**
 * @module backend/algorithms/round5Extravaganza
 * @description This module contains the algorithm for generating fixtures in a way where the top 2 teams play each other in the final game of the final round.
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
//! fix date and timing logic 

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
 * Generate fixtures using the "Round 5 Extravaganza" algorithm. (best 2 teams play each other in final round)
 *
 * @param {Array} teams - List of exactly 6 team objects.
 * @param {Number} season - The season year.
 * @returns {Object} - An object containing fixtures and summary.
 */
async function generateRound5ExtravaganzaFixtures(teams, season) {
  // Validation: Ensure there are exactly 6 teams (front end should restrict this)
  if (teams.length !== 6) {
    throw new Error('The algorithm requires exactly 6 teams.');
  }

  // Step 1: Sort teams by their ranking (ascending order)
  teams.sort((a, b) => a.teamRanking - b.teamRanking);

  const summary = []; // used for front end to display summary of fixtures

  // Step 2: Separate top 2 and bottom 4 teams
  const topTeams = teams.slice(0, 2); // Teams ranked 1 and 2
  const bottomTeams = teams.slice(2); // Teams ranked 3 to 6

  // Step 3: Generate all possible Round 5 pairings for bottom 4 teams
  const round5Pairings = generateRound5Pairings(bottomTeams);

  // Step 4: Attempt scheduling up to 3 times with different Round 5 pairings
  for (let attempt = 1; attempt <= round5Pairings.length; attempt++) {
    try {
      const currentPairing = round5Pairings[attempt - 1]; // Current pairing for this attempt

      // Define Round 5 fixtures
      const round5Fixtures = [
        { teamA: currentPairing[0].teamA, teamB: currentPairing[0].teamB, round: 5 }, // First pairing
        { teamA: currentPairing[1].teamA, teamB: currentPairing[1].teamB, round: 5 }, // Second pairing
        { teamA: topTeams[0], teamB: topTeams[1], round: 5 }, // Highest vs Second Highest
      ];

      // Step 5: Generate all possible matchups (15 for 6 teams)
      const allMatchups = generateAllMatchups(teams);

      // Step 6: Exclude Round 5 matchups
      const excludedMatchups = round5Fixtures.map(fixture => ({
        teamA: fixture.teamA, 
        teamB: fixture.teamB,
      }));

      const remainingMatchups = excludeMatchups(allMatchups, excludedMatchups); // 12 matchups (round 1-4)

      // Step 7: Assign remaining 12 matchups to Rounds 1-4 using backtracking
      const assignedRounds = assignMatchupsToRounds(remainingMatchups, 4, 3);

      if (!assignedRounds.success) {
        throw new Error(`Cannot assign exactly 3 matches to Round ${assignedRounds.failedRound}.`); 
      }

      const initialSchedule = assignedRounds.schedule; 

      // Step 8: Combine Rounds 1-4 with Round 5 fixtures
      const completeSchedule = [...initialSchedule, ...round5Fixtures];

      // Step 9: Validate that each team plays every other team exactly once. Double check if this fails and new one is generated
      validateUniqueFixtures(completeSchedule);

      // Step 10: Assign home and away teams based on previous season and balance
      await assignHomeAway(completeSchedule, season, teams);

      // Step 11: Schedule dates and times for all fixtures (//!right now its random)
      const scheduledFixtures = await scheduleFixtures(completeSchedule, season);

      // Step 12: Format final fixtures list
      const finalFixtures = scheduledFixtures.map((fixture) => ({
        round: fixture.round,
        date: fixture.date,
        homeTeam: fixture.homeTeam._id,
        awayTeam: fixture.awayTeam._id,
        stadium: fixture.stadium._id,
        location: fixture.location,
        season,
      }));

      // Step 13: Build dynamic summary (for front end)
      buildSummary(teams, scheduledFixtures, summary);

      return { fixtures: finalFixtures, summary };
    } catch (error) {
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      // Continue to next attempt
    }
  }

  // If all attempts fail, throw an error
  throw new Error('Failed to generate a feasible fixture schedule after 3 attempts.'); // usually unlikely to fail
}

/**
 * Generate all possible unique matchups for the teams. //? C(6,2) = 15 
 * uses the algorithm C(n, k) = n! / (k! * (n - k)!) (i think)
 * fisher-yates shuffle algorithm
 *
 * @param {Array} teams - List of team objects.
 * @returns {Array} - List of all possible matchups.
 */
function generateAllMatchups(teams) {
  const numTeams = teams.length;
  const allMatchups = [];

  for (let i = 0; i < numTeams; i++) { 
    for (let j = i + 1; j < numTeams; j++) { 
      allMatchups.push({
        teamA: teams[i], 
        teamB: teams[j],
      });
    }
  }

  return allMatchups;
}

/**
 * Exclude specific matchups from the list of all matchups. (for round 5)
 *
 * @param {Array} allMatchups - List of all possible matchups.
 * @param {Array} excludedMatchups - List of matchups to exclude.
 * @returns {Array} - Remaining matchups after exclusion.
 */
function excludeMatchups(allMatchups, excludedMatchups) {
  const excludedSet = new Set(); // Set for O(1) lookup
  excludedMatchups.forEach((m) => { 
    const key1 = `${m.teamA._id.toString()}-${m.teamB._id.toString()}`;
    const key2 = `${m.teamB._id.toString()}-${m.teamA._id.toString()}`; // both ways to avoid duplicates and for home./away
    excludedSet.add(key1);
    excludedSet.add(key2); 
  });

  return allMatchups.filter(
    (m) =>
      !excludedSet.has(`${m.teamA._id.toString()}-${m.teamB._id.toString()}`) &&
      !excludedSet.has(`${m.teamB._id.toString()}-${m.teamA._id.toString()}`) // both ways to avoid duplicates and check against home/away alternates
  );
}

/**
 * Assign matchups to specified number of rounds using backtracking.
 *
 * @param {Array} matchups - List of remaining matchups to assign.
 * @param {Number} totalRounds - Total number of rounds to assign.
 * @param {Number} matchesPerRound - Number of matches per round.
 * @returns {Object} - Assignment result/rview containing success status, schedule, and failed round/s if any.
 */
function assignMatchupsToRounds(matchups, totalRounds, matchesPerRound) {
  // Initialize rounds
  const rounds = Array.from({ length: totalRounds }, () => []);

  // Helper function for backtracking
  function backtrack(index) {
    if (index === matchups.length) {
      // All matchups assigned
      return true;
    }

    const matchup = matchups[index]; // Current matchup to assign
    for (let round = 0; round < totalRounds; round++) {
      if (rounds[round].length < matchesPerRound) {
        // Check if teams are already playing in this round
        const teamsInRound = new Set();
        rounds[round].forEach((m) => { 
          teamsInRound.add(m.teamA._id.toString()); 
          teamsInRound.add(m.teamB._id.toString());
        });

        if (
          !teamsInRound.has(matchup.teamA._id.toString()) && 
          !teamsInRound.has(matchup.teamB._id.toString()) // both teams not in this round
        ) {
          // Assign matchup to this round
          rounds[round].push({
            round: round + 1,
            teamA: matchup.teamA,
            teamB: matchup.teamB,
          });

          // Recurse function to assign next matchup
          if (backtrack(index + 1)) {
            return true;
          }

          // Backtrack
          rounds[round].pop();
        }
      }
    }

    // Unable to assign matchup (maybe no feasible solutins)
    return false;
  }

  const success = backtrack(0); // Start backtracking from first matchup
  if (success) { // if successful 
    // Flatten rounds into schedule
    const schedule = rounds.flat(); 
    return { success: true, schedule }; // return schedule
  } else {
    // Find which round is causing the issue
    for (let round = 0; round < totalRounds; round++) {
      if (rounds[round].length < matchesPerRound) { // if round has less than 3 matches
        return { success: false, failedRound: round + 1 }; // return failed round
      }
    }
    // Generic failure
    return { success: false, failedRound: 'Unknown' };
  }
}

/**
 * Assign home and away teams/stadium based on previous year's fixtures and balance home/away counts.
 *
 * @param {Array} fixtures - The list of fixtures with rounds assigned.
 * @param {Number} season - The season year.
 * @param {Array} teams - The list of selected teams.
 */
async function assignHomeAway(fixtures, season, teams) {
  // Initialize home and away counts
  const homeCounts = {};
  const awayCounts = {};
  teams.forEach(team => {
    homeCounts[team._id.toString()] = 0;
    awayCounts[team._id.toString()] = 0;
  });

  // First pass: Assign based on previous season
  for (let fixture of fixtures) {
    const previousSeason = season - 1;

    // Try to find the fixture from the previous season
    const previousFixture = await Fixture.findOne({
      season: previousSeason,
      $or: [
        { homeTeam: fixture.teamA._id, awayTeam: fixture.teamB._id }, // check if this fixture was played last year
        { homeTeam: fixture.teamB._id, awayTeam: fixture.teamA._id }, // check if this fixture was played last year (reverse attempt for both ways)
      ],
    });

    if (previousFixture) {
      // If TeamA was at home last year, they are away this year
      if (previousFixture.homeTeam.equals(fixture.teamA._id)) {
        fixture.homeTeam = fixture.teamB;
        fixture.awayTeam = fixture.teamA;
      } else { // if teamB was at home last year, they are away this year
        fixture.homeTeam = fixture.teamA;
        fixture.awayTeam = fixture.teamB;
      }
    } else {
      // If no previous fixture, assign home team arbitrarily (TeamA as home). In concept we should not reach this point as all fixtures should have been played last year.
      fixture.homeTeam = fixture.teamA;
      fixture.awayTeam = fixture.teamB;
    }

    // Update home and away counts
    homeCounts[fixture.homeTeam._id.toString()] += 1;
    awayCounts[fixture.awayTeam._id.toString()] += 1;

    // Assign stadium and location based on home team
    const stadium = await Stadium.findById(fixture.homeTeam.stadium);
    fixture.stadium = stadium;
    fixture.location = stadium.stadiumCity;
  }

  // Second pass: Ensure each team has at least 2 home and 2 away games
  let adjustmentsMade; // flag to check if adjustments were made
  do {
    adjustmentsMade = false;
    for (let team of teams) {
      const id = team._id.toString(); 

      // Check home games
      if (homeCounts[id] < 2) {
        // Attempt to find a fixture where this team is away and can be swapped
        const swapFixture = fixtures.find(f => 
          f.awayTeam._id.toString() === id && // if this team is away
          homeCounts[f.homeTeam._id.toString()] > 2 && // if the home team has more than 2 home games
          awayCounts[f.awayTeam._id.toString()] > 2 // if the away team has more than 2 away games
        );

        if (swapFixture) { // if a fixture is found
          // Swap home and away
          [swapFixture.homeTeam, swapFixture.awayTeam] = [swapFixture.awayTeam, swapFixture.homeTeam];
          
          // Update counts
          homeCounts[swapFixture.homeTeam._id.toString()] += 1;
          homeCounts[swapFixture.awayTeam._id.toString()] -= 1;
          awayCounts[swapFixture.homeTeam._id.toString()] -= 1;
          awayCounts[swapFixture.awayTeam._id.toString()] += 1;

          // Update stadium and location
          const stadium = await Stadium.findById(swapFixture.homeTeam.stadium);
          swapFixture.stadium = stadium;
          swapFixture.location = stadium.stadiumCity;

          adjustmentsMade = true;
        }
      }

      // Check away games
      if (awayCounts[id] < 2) { // if less than 2 away games
        // Attempt to find a fixture where this team is home and can be swapped
        const swapFixture = fixtures.find(f => 
          f.homeTeam._id.toString() === id &&
          homeCounts[f.homeTeam._id.toString()] > 2 && // if the home team has more than 2 home games
          awayCounts[f.awayTeam._id.toString()] > 2 // if the away team has more than 2 away games
        );

        if (swapFixture) {
          // Swap home and away
          [swapFixture.homeTeam, swapFixture.awayTeam] = [swapFixture.awayTeam, swapFixture.homeTeam];
          
          // Update counts
          homeCounts[swapFixture.homeTeam._id.toString()] += 1;
          homeCounts[swapFixture.awayTeam._id.toString()] -= 1;
          awayCounts[swapFixture.homeTeam._id.toString()] -= 1;
          awayCounts[swapFixture.awayTeam._id.toString()] += 1;

          // Update stadium and location
          const stadium = await Stadium.findById(swapFixture.homeTeam.stadium);
          swapFixture.stadium = stadium;
          swapFixture.location = stadium.stadiumCity;

          adjustmentsMade = true;
        }
      }
    }
  } while (adjustmentsMade);

  // Final validation to make sure that constraints are met
  teams.forEach(team => {
    const id = team._id.toString();
    if (homeCounts[id] < 2) {
      throw new Error(`Team ${team.teamName} has less than 2 home games.`);
    }
    if (awayCounts[id] < 2) {
      throw new Error(`Team ${team.teamName} has less than 2 away games.`);
    }
  });
}

/**
 * Schedule fixtures with dates and times according to the constraints.
 *
 * @param {Array} fixtures - The list of fixtures with rounds assigned.
 * @param {Number} season - The season year.
 * @returns {Array} - Fixtures with date and time scheduled.
 */
async function scheduleFixtures(fixtures, season) {
  // the possible match times
  const matchTimes = [
    // Friday
    { day: 5, timeSlots: ['18:00', '20:00'] }, //! SWIRCH to 3 hours later
    // Saturday
    { day: 6, timeSlots: ['12:00', '14:00', '16:00', '18:00', '20:00'] },
    // Sunday
    { day: 0, timeSlots: ['12:00', '14:00', '16:00', '18:00', '20:00'] },
  ];

  const scheduledFixtures = [];
  let dateCursor = new Date(`${season}-02-01`); // Start from February 1st

  for (let round = 1; round <= 5; round++) {
    const roundFixtures = fixtures.filter((fixture) => fixture.round === round);
    let roundDateCursor = new Date(dateCursor); // Copy dateCursor for this round

    for (let fixture of roundFixtures) { 
      let scheduled = false;
      while (!scheduled) {
        const dayOfWeek = roundDateCursor.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const matchDay = matchTimes.find((mt) => mt.day === dayOfWeek); // find the match day

        if (matchDay) { // if match day is found
          for (let time of matchDay.timeSlots) {
            const dateTimeString = `${roundDateCursor.toISOString().split('T')[0]}T${time}:00`; // format date and time (ISO)
            const dateTime = new Date(dateTimeString); // create date object

            // Check if this date and time is already taken
            const isSlotTaken = scheduledFixtures.some(
              (f) => f.date.getTime() === dateTime.getTime() 
            );

            // Check if the teams are already scheduled in the same week
            const weekStart = getWeekStartDate(dateTime); // get the start of the week
            const teamInWeek = scheduledFixtures.some((f) => { // check if the team is already scheduled in the same week
              const fWeekStart = getWeekStartDate(f.date); 
              return (
                fWeekStart.getTime() === weekStart.getTime() && // if the week is the same
                (f.homeTeam.equals(fixture.homeTeam._id) || // if the home team is the same
                  f.awayTeam.equals(fixture.awayTeam._id)) // if the away team is the same
              );
            });

            if (!isSlotTaken && !teamInWeek) { // if the slot is not taken and the team is not scheduled in the same week
              // Assign date and time
              fixture.date = dateTime;

              scheduledFixtures.push(fixture);
              scheduled = true;
              break;
            }
          }
        }

        if (!scheduled) {
          // Move to the next day
          roundDateCursor.setDate(roundDateCursor.getDate() + 1);
        }
      }
    }

    // Move dateCursor to the next week. This is done after each round.
    dateCursor.setDate(dateCursor.getDate() + 7);
  }

  return scheduledFixtures;
}

/**
 * Get the start date of the week for a given date.
 *
 * @param {Date} date - The date to find the week's start.
 * @returns {Date} - The start date (Sunday) of the week.
 */
function getWeekStartDate(date) {
  const copy = new Date(date); // Copy the date to avoid mutation
  copy.setDate(copy.getDate() - copy.getDay()); 
  copy.setHours(0, 0, 0, 0); 
  return copy;
}

/**
 * Build dynamic summary for the fixtures. (for front end)
 *
 * @param {Array} teams - List of teams.
 * @param {Array} fixtures - List of fixtures.
 * @param {Array} summary - Summary array to add/create
 */
function buildSummary(teams, fixtures, summary) {
  summary.push('Fixtures have been scheduled considering the following factors:');
  summary.push('- Teams are ranked as follows:');

  // List team rankings
  teams.forEach((team) => {
    summary.push(`  - ${team.teamName} (Rank ${team.teamRanking})`);
  });

  // Say that it is a round-robin.
  summary.push('\nEach team plays every other team exactly once, following a round-robin format.');

  // Identify key matchups in the final round
  const finalRoundFixtures = fixtures.filter((f) => f.round === 5);

  summary.push('\nKey matchups scheduled for the final round:');
  finalRoundFixtures.forEach((fixture, index) => {
    summary.push(
      `- Fixture ${index + 1}: ${fixture.homeTeam.teamName} (Rank ${fixture.homeTeam.teamRanking}) vs ${fixture.awayTeam.teamName} (Rank ${fixture.awayTeam.teamRanking})` // add the fixture details
    );
  });

  // Additional considerations for summary
  summary.push('\nConstraints:');
  summary.push('- Home and away matches have been balanced from previous year to ensure fairness.');
  summary.push('- Each team plays only once per week.');
  summary.push('- Match timings comply with scheduling constraints.');
  summary.push('- Final weekend fixtures prioritize top-ranked teams.');
}

/**
 * Generate all possible Round 5 pairings for the bottom 4 teams.
 *
 * @param {Array} bottomTeams - List of bottom 4 team objects.
 * @returns {Array} - Array of possible pairings arrays.
 */
function generateRound5Pairings(bottomTeams) {
  // bottomTeams: array of 4 team objects, sorted by ranking.
  // Possible pairings:
  // 1. (0 vs 1) and (2 vs 3)
  // 2. (0 vs 2) and (1 vs 3)
  // 3. (0 vs 3) and (1 vs 2)
  return [
    [
      { teamA: bottomTeams[0], teamB: bottomTeams[1] },
      { teamA: bottomTeams[2], teamB: bottomTeams[3] },
    ],
    [
      { teamA: bottomTeams[0], teamB: bottomTeams[2] },
      { teamA: bottomTeams[1], teamB: bottomTeams[3] },
    ],
    [
      { teamA: bottomTeams[0], teamB: bottomTeams[3] },
      { teamA: bottomTeams[1], teamB: bottomTeams[2] },
    ],
  ];
}

/**
 * Validate that each team plays every other team exactly once.
 *
 * @param {Array} schedule - The complete schedule of fixtures.
 */
function validateUniqueFixtures(schedule) {
  const matchupSet = new Set();

  schedule.forEach((fixture) => {
    const teamAId = fixture.teamA._id.toString();
    const teamBId = fixture.teamB._id.toString();
    const matchupKey = [teamAId, teamBId].sort().join('-'); // Sort to avoid duplicates

    if (matchupSet.has(matchupKey)) {
      throw new Error(
        `Duplicate fixture detected: ${fixture.teamA.teamName} vs ${fixture.teamB.teamName} in Round ${fixture.round}`
      );
    } else {
      matchupSet.add(matchupKey); // Add to set
    }
  });

  // Additional validation: Ensure all matchups are covered
  const expectedTotalMatchups = 15; // For 6 teams, C(6,2) = 15
  const uniqueMatchups = matchupSet.size;
  if (uniqueMatchups !== expectedTotalMatchups) {
    throw new Error(
      `Incomplete schedule: Expected ${expectedTotalMatchups} unique matchups, but found ${uniqueMatchups}.`
    );
  }
}

module.exports = {
  generateRound5ExtravaganzaFixtures,
};
