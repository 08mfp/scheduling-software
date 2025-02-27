// backend/algorithms/round5Extravaganza.js
/**
 * @module backend/algorithms/round5Extravaganza
 * @description This module contains the algorithm for generating fixtures in a way where the top 2 teams play each other in the final game of the final round.
 * It generates all unique matchups, assigns home/away teams based on previous season data, and schedules fixtures using a round-robin format.
 * Now includes the option to incorporate rest weeks, improved weekend scheduling with random time slots (ensuring a minimum 2‑hour gap between games),
 * and produces a detailed summary that includes previous season matchup feedback.
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
 * Generate all unique matchups for the teams.
 * For 6 teams, there should be 15 matchups.
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
 * Exclude specific matchups (e.g. those in Round 5) from the list of all matchups.
 *
 * @param {Array} allMatchups - List of all possible matchups.
 * @param {Array} excludedMatchups - List of matchups to exclude.
 * @returns {Array} - The remaining matchups.
 */
function excludeMatchups(allMatchups, excludedMatchups) {
  const excludedSet = new Set();
  excludedMatchups.forEach((m) => {
    const key1 = `${m.teamA._id.toString()}-${m.teamB._id.toString()}`;
    const key2 = `${m.teamB._id.toString()}-${m.teamA._id.toString()}`;
    excludedSet.add(key1);
    excludedSet.add(key2);
  });
  return allMatchups.filter((m) => {
    const key = `${m.teamA._id.toString()}-${m.teamB._id.toString()}`;
    return !excludedSet.has(key);
  });
}

/**
 * Assign the remaining matchups (12 in total) to Rounds 1-4 using backtracking.
 *
 * @param {Array} matchups - List of matchups to assign.
 * @param {Number} totalRounds - Total number of rounds to assign.
 * @param {Number} matchesPerRound - Number of matches per round.
 * @returns {Object} - Object with a success flag and the resulting schedule (or the failed round).
 */
function assignMatchupsToRounds(matchups, totalRounds, matchesPerRound) {
  const rounds = Array.from({ length: totalRounds }, () => []);
  function backtrack(index) {
    if (index === matchups.length) return true;
    const matchup = matchups[index];
    for (let round = 0; round < totalRounds; round++) {
      if (rounds[round].length < matchesPerRound) {
        const teamsInRound = new Set();
        rounds[round].forEach((m) => {
          teamsInRound.add(m.teamA._id.toString());
          teamsInRound.add(m.teamB._id.toString());
        });
        if (
          !teamsInRound.has(matchup.teamA._id.toString()) &&
          !teamsInRound.has(matchup.teamB._id.toString())
        ) {
          rounds[round].push({
            round: round + 1,
            teamA: matchup.teamA,
            teamB: matchup.teamB,
          });
          if (backtrack(index + 1)) return true;
          rounds[round].pop();
        }
      }
    }
    return false;
  }
  const success = backtrack(0);
  if (success) {
    return { success: true, schedule: rounds.flat() };
  } else {
    for (let round = 0; round < totalRounds; round++) {
      if (rounds[round].length < matchesPerRound) {
        return { success: false, failedRound: round + 1 };
      }
    }
    return { success: false, failedRound: 'Unknown' };
  }
}

/**
 * Asynchronously assign home and away teams (and stadiums) for each fixture.
 * This function checks last season’s fixture to alternate home/away assignments.
 * It also attempts to balance each team so that they have at least 2 home and 2 away games.
 *
 * @param {Array} fixtures - Array of fixture objects.
 * @param {Number} season - The season year.
 * @param {Array} teams - List of team objects.
 * @returns {Array} - An array of matchup change messages explaining previous season adjustments.
 */
async function assignHomeAway(fixtures, season, teams) {
  const matchupChanges = [];
  const homeCounts = {};
  const awayCounts = {};
  teams.forEach((team) => {
    homeCounts[team._id.toString()] = 0;
    awayCounts[team._id.toString()] = 0;
  });

  for (let fixture of fixtures) {
    const previousSeason = season - 1;
    const previousFixture = await Fixture.findOne({
      season: previousSeason,
      $or: [
        { homeTeam: fixture.teamA._id, awayTeam: fixture.teamB._id },
        { homeTeam: fixture.teamB._id, awayTeam: fixture.teamA._id },
      ],
    });
    if (previousFixture) {
      // Alternate the venue compared to last season.
      if (previousFixture.homeTeam.equals(fixture.teamA._id)) {
        // Last season, teamA was home. So swap for this fixture.
        fixture.homeTeam = fixture.teamB;
        fixture.awayTeam = fixture.teamA;
        matchupChanges.push(
          `For ${fixture.teamA.teamName} vs ${fixture.teamB.teamName}: previous season, ${fixture.teamA.teamName} was home; Now ${fixture.teamB.teamName} is home.`
        );
      } else {
        // Last season, teamB was home. Keep assignment as is.
        fixture.homeTeam = fixture.teamA;
        fixture.awayTeam = fixture.teamB;
        matchupChanges.push(
          `For ${fixture.teamA.teamName} vs ${fixture.teamB.teamName}: previous season, ${fixture.teamB.teamName} was home; keeping ${fixture.teamA.teamName} as home.`
        );
      }
    } else {
      // No previous data; default assignment.
      fixture.homeTeam = fixture.teamA;
      fixture.awayTeam = fixture.teamB;
    }
    homeCounts[fixture.homeTeam._id.toString()] += 1;
    awayCounts[fixture.awayTeam._id.toString()] += 1;
    const stadium = await Stadium.findById(fixture.homeTeam.stadium);
    fixture.stadium = stadium;
    fixture.location = stadium ? stadium.stadiumCity : 'Unknown City';
  }

  // Second pass: Adjust if any team has fewer than 2 home or away games.
  let adjustmentsMade;
  do {
    adjustmentsMade = false;
    for (let team of teams) {
      const id = team._id.toString();
      if (homeCounts[id] < 2) {
        const swapFixture = fixtures.find(
          (f) =>
            f.awayTeam._id.toString() === id &&
            homeCounts[f.homeTeam._id.toString()] > 2 &&
            awayCounts[f.awayTeam._id.toString()] > 2
        );
        if (swapFixture) {
          [swapFixture.homeTeam, swapFixture.awayTeam] = [swapFixture.awayTeam, swapFixture.homeTeam];
          homeCounts[swapFixture.homeTeam._id.toString()] += 1;
          homeCounts[swapFixture.awayTeam._id.toString()] -= 1;
          awayCounts[swapFixture.homeTeam._id.toString()] -= 1;
          awayCounts[swapFixture.awayTeam._id.toString()] += 1;
          const stadium = await Stadium.findById(swapFixture.homeTeam.stadium);
          swapFixture.stadium = stadium;
          swapFixture.location = stadium ? stadium.stadiumCity : 'Unknown City';
          matchupChanges.push(
            `Adjusted fixture ${swapFixture.homeTeam.teamName} vs ${swapFixture.awayTeam.teamName} to balance home/away counts for team ${getTeamNameById(teams, id)}.`
          );
          adjustmentsMade = true;
        }
      }
      if (awayCounts[id] < 2) {
        const swapFixture = fixtures.find(
          (f) =>
            f.homeTeam._id.toString() === id &&
            homeCounts[f.homeTeam._id.toString()] > 2 &&
            awayCounts[f.awayTeam._id.toString()] > 2
        );
        if (swapFixture) {
          [swapFixture.homeTeam, swapFixture.awayTeam] = [swapFixture.awayTeam, swapFixture.homeTeam];
          homeCounts[swapFixture.homeTeam._id.toString()] += 1;
          homeCounts[swapFixture.awayTeam._id.toString()] -= 1;
          awayCounts[swapFixture.homeTeam._id.toString()] -= 1;
          awayCounts[swapFixture.awayTeam._id.toString()] += 1;
          const stadium = await Stadium.findById(swapFixture.homeTeam.stadium);
          swapFixture.stadium = stadium;
          swapFixture.location = stadium ? stadium.stadiumCity : 'Unknown City';
          matchupChanges.push(
            `Adjusted fixture ${swapFixture.homeTeam.teamName} vs ${swapFixture.awayTeam.teamName} to balance home/away counts for team ${getTeamNameById(teams, id)}.`
          );
          adjustmentsMade = true;
        }
      }
    }
  } while (adjustmentsMade);

  teams.forEach((team) => {
    const id = team._id.toString();
    if (homeCounts[id] < 2) {
      throw new Error(`Team ${team.teamName} has less than 2 home games.`);
    }
    if (awayCounts[id] < 2) {
      throw new Error(`Team ${team.teamName} has less than 2 away games.`);
    }
  });

  return matchupChanges;
}

/**
 * Schedule fixtures with dates and times.
 * Fixtures in the same round are scheduled on the same weekend.
 * Available time slots (on Friday, Saturday, and Sunday) are used, ensuring no overlapping games
 * and a minimum 2‑hour gap between matches.
 * After scheduling each round, the date cursor advances by one week—and if the current round is in the
 * restWeeks array, an extra week is skipped.
 *
 * @param {Array} fixtures - Array of fixture objects with round numbers.
 * @param {Number} season - The season year.
 * @param {Array} restWeeks - (Optional) Array of round numbers after which a rest week is inserted.
 * @returns {Array} - The fixtures with scheduled dates/times.
 */
async function scheduleFixtures(fixtures, season, restWeeks = []) {
  const matchTimes = [
    { day: 5, timeSlots: ['18:00', '20:00'] },
    { day: 6, timeSlots: ['12:00', '14:00', '16:00', '18:00', '20:00'] },
    { day: 0, timeSlots: ['12:00', '14:00', '16:00', '18:00', '20:00'] },
  ];
  const scheduledFixtures = [];
  let dateCursor = new Date(`${season}-02-01`);

  // Determine all rounds from the fixtures (should be rounds 1-5)
  const rounds = [];
  fixtures.forEach((f) => {
    if (!rounds.includes(f.round)) rounds.push(f.round);
  });
  rounds.sort((a, b) => a - b);

  for (let round of rounds) {
    const roundFixtures = fixtures.filter((f) => f.round === round);
    let roundDateCursor = new Date(dateCursor);
    for (let fixture of roundFixtures) {
      let scheduled = false;
      while (!scheduled) {
        const dayOfWeek = roundDateCursor.getDay();
        const matchDay = matchTimes.find((mt) => mt.day === dayOfWeek);
        if (matchDay) {
          for (let time of matchDay.timeSlots) {
            const dateTimeString = `${roundDateCursor.toISOString().split('T')[0]}T${time}:00`;
            const dateTime = new Date(dateTimeString);
            const isSlotTaken = scheduledFixtures.some(
              (f) => f.date.getTime() === dateTime.getTime()
            );
            const weekStart = getWeekStartDate(dateTime);
            const teamInWeek = scheduledFixtures.some((f) => {
              const fWeekStart = getWeekStartDate(f.date);
              return (
                fWeekStart.getTime() === weekStart.getTime() &&
                (f.homeTeam.equals(fixture.homeTeam._id) ||
                  f.awayTeam.equals(fixture.awayTeam._id))
              );
            });
            if (!isSlotTaken && !teamInWeek) {
              fixture.date = dateTime;
              scheduledFixtures.push(fixture);
              scheduled = true;
              break;
            }
          }
        }
        if (!scheduled) {
          roundDateCursor.setDate(roundDateCursor.getDate() + 1);
        }
      }
    }
    // Advance dateCursor to the next week.
    dateCursor.setDate(dateCursor.getDate() + 7);
    // If a rest week is specified after this round, skip an extra week.
    if (restWeeks.includes(round)) {
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }
  return scheduledFixtures;
}

/**
 * Get the start date (Sunday) of the week for a given date.
 *
 * @param {Date} date - The date.
 * @returns {Date} - The start of that week.
 */
function getWeekStartDate(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
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
 * Build a dynamic summary of the fixture schedule.
 * This includes the team rankings, match week commencement dates, any rest weeks inserted,
 * and previous season matchup adjustments.
 *
 * @param {Array} teams - List of team objects.
 * @param {Array} fixtures - Array of scheduled fixture objects.
 * @param {Array} summary - Array to which summary lines will be added.
 * @param {Array} restWeeks - Array of round numbers after which a rest week is inserted.
 * @param {Array} matchupChanges - Array of messages detailing previous season adjustments.
 */
function buildSummary(teams, fixtures, summary, restWeeks = [], matchupChanges = []) {
  // summary.push('Provisional Fixture Schedule Summary');
  // summary.push(`Each team plays 5 matches in total—ensuring a balanced schedule of either 3 home and 2 away games or 2 home and 3 away games}`);
  // summary.push('Every team meets each other exactly once, with all 15 unique matchups generated and validated');
  // summary.push('Fixtures are scheduled such that each team plays only once per weekend (each round represents one weekend)');
  // summary.push('The schedule is organized by rounds—each round (weekend) contains 3 fixtures, ensuring every team plays every weekend');
  // summary.push('In Round 5, the top two teams face off in the final fixture—the best game of the season—while the second-best matchup is scheduled as the penultimate game');
  // summary.push('Match timings are strictly enforced: all fixtures are played on the same weekend per round, no two games occur at the same time, and a minimum 2-hour gap is maintained between matches');
  // summary.push('Rest weeks have been inserted after the designated rounds to allow for team recovery');
  summary.push('Fixtures have been scheduled with the following details:');
  summary.push('');
  summary.push('Team Rankings:');
  teams.forEach((team) => {
    summary.push(` - ${team.teamName} (Rank ${team.teamRanking})`);
  });
  // summary.push('\nA round-robin format ensures each team plays every other team exactly once.');
  
  if (matchupChanges.length > 0) {
    summary.push('\nPrevious Season Matchup Adjustments:');
    matchupChanges.forEach((msg) => {
      summary.push(` - ${msg}`);
    });
  }
  
  const rounds = [];
  fixtures.forEach((f) => {
    if (!rounds.includes(f.round)) rounds.push(f.round);
  });
  rounds.sort((a, b) => a - b);
  rounds.forEach((round) => {
    const roundFixtures = fixtures.filter((f) => f.round === round);
    const firstFixtureDate = new Date(Math.min(...roundFixtures.map((f) => f.date.getTime())));
    summary.push('');
    summary.push(`Match Week ${round} commencing ${firstFixtureDate.toLocaleDateString("en-GB")}`);
    if (restWeeks.includes(round)) {
      summary.push(`Rest Week inserted after Round ${round}`);
    }
  });
  summary.push(
    '\nNote: All matches are scheduled to take place within the same weekend. '
  );
  summary.push(
    'In case of any unforeseen events (e.g., stadium renovations or natural disasters), timings can be adjusted.'
  );
  summary.push(
    'Match timings ensure no overlapping games and a minimum 2-hour gap between matches.'
  );
}

/**
 * Generate fixtures using the "Round 5 Extravaganza" algorithm.
 * In this format, the top 2 teams play each other in the final game of Round 5.
 *
 * @param {Array} teams - List of exactly 6 team objects.
 * @param {Number} season - The season year.
 * @param {Array} restWeeks - (Optional) Array of round numbers after which a rest week is inserted.
 * @returns {Object} - An object containing the final fixtures and a summary.
 */
async function generateRound5ExtravaganzaFixtures(teams, season, restWeeks = []) {
  if (teams.length !== 6) {
    throw new Error('The algorithm requires exactly 6 teams.');
  }

  // Step 1: Sort teams by ranking (ascending)
  teams.sort((a, b) => a.teamRanking - b.teamRanking);
  const summary = [];

  // Step 2: Separate top 2 and bottom 4 teams.
  const topTeams = teams.slice(0, 2);
  const bottomTeams = teams.slice(2);

  // Step 3: Generate all possible Round 5 pairings for bottom 4 teams.
  const round5Pairings = generateRound5Pairings(bottomTeams);

  // Step 4: Attempt scheduling using each available pairing option.
  for (let attempt = 1; attempt <= round5Pairings.length; attempt++) {
    try {
      const currentPairing = round5Pairings[attempt - 1];

      // Define Round 5 fixtures.
      const round5Fixtures = [
        { teamA: currentPairing[0].teamA, teamB: currentPairing[0].teamB, round: 5 },
        { teamA: currentPairing[1].teamA, teamB: currentPairing[1].teamB, round: 5 },
        { teamA: topTeams[0], teamB: topTeams[1], round: 5 },
      ];

      // Step 5: Generate all matchups (15 total for 6 teams).
      const allMatchups = generateAllMatchups(teams);

      // Step 6: Exclude the Round 5 matchups.
      const excludedMatchups = round5Fixtures.map((fixture) => ({
        teamA: fixture.teamA,
        teamB: fixture.teamB,
      }));
      const remainingMatchups = excludeMatchups(allMatchups, excludedMatchups);

      // Step 7: Assign the remaining 12 matchups to Rounds 1-4 using backtracking.
      const assignedRounds = assignMatchupsToRounds(remainingMatchups, 4, 3);
      if (!assignedRounds.success) {
        throw new Error(`Cannot assign exactly 3 matches to Round ${assignedRounds.failedRound}.`);
      }
      const initialSchedule = assignedRounds.schedule;

      // Step 8: Combine Rounds 1-4 with Round 5 fixtures.
      const completeSchedule = [...initialSchedule, ...round5Fixtures];

      // Step 9: Validate that each team meets every other team exactly once.
      validateUniqueFixtures(completeSchedule);

      // Step 10: Assign home and away teams based on previous season data.
      const matchupChanges = await assignHomeAway(completeSchedule, season, teams);

      // Step 11: Schedule dates and times (incorporating any rest weeks).
      const scheduledFixtures = await scheduleFixtures(completeSchedule, season, restWeeks);

      // Step 12: Format final fixtures for saving (IDs only).
      const finalFixtures = scheduledFixtures.map((fixture) => ({
        round: fixture.round,
        date: fixture.date,
        homeTeam: fixture.homeTeam._id,
        awayTeam: fixture.awayTeam._id,
        stadium: fixture.stadium._id,
        location: fixture.location,
        season,
      }));

      // Step 13: Build the summary, including previous season matchup adjustments.
      buildSummary(teams, scheduledFixtures, summary, restWeeks, matchupChanges);

      return { fixtures: finalFixtures, summary };
    } catch (error) {
      console.warn(`Attempt ${attempt} failed: ${error.message}`);
      // Try the next pairing option.
    }
  }
  throw new Error('Failed to generate a feasible fixture schedule after all pairing attempts.');
}

/**
 * Generate all possible Round 5 pairings for the bottom 4 teams.
 *
 * @param {Array} bottomTeams - List of 4 team objects.
 * @returns {Array} - Array of possible pairing arrays.
 */
function generateRound5Pairings(bottomTeams) {
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
 * Validate that every team plays every other team exactly once.
 *
 * @param {Array} schedule - The complete fixture schedule.
 */
function validateUniqueFixtures(schedule) {
  const matchupSet = new Set();
  schedule.forEach((fixture) => {
    const teamAId = fixture.teamA._id.toString();
    const teamBId = fixture.teamB._id.toString();
    const matchupKey = [teamAId, teamBId].sort().join('-');
    if (matchupSet.has(matchupKey)) {
      throw new Error(
        `Duplicate fixture detected: ${fixture.teamA.teamName} vs ${fixture.teamB.teamName} in Round ${fixture.round}`
      );
    } else {
      matchupSet.add(matchupKey);
    }
  });
  const expectedTotalMatchups = 15;
  if (matchupSet.size !== expectedTotalMatchups) {
    throw new Error(
      `Incomplete schedule: Expected ${expectedTotalMatchups} unique matchups, but found ${matchupSet.size}.`
    );
  }
}

module.exports = {
  generateRound5ExtravaganzaFixtures,
};
