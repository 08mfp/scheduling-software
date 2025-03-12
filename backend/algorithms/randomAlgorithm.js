/**
 * @module backend/algorithms/randomAlgorithm
 * @description Generates a random Six Nations schedule and returns a detailed summary,
 * including:
 * - Previous year home advantage info vs. new year assignment
 * - Round-by-round schedule
 * - Per-team breakdown ("England: R1 - Home vs Ireland, ...")
 * - Randomness in fixture assignment and date/time
 * @version 2.2.0
 */

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');

function logStep(msg) {
  console.log(`[RandomAlgorithm] ${msg}`);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchPreviousYearFixtures(teams, currentSeason) {
  logStep(`Fetching previous year's fixtures for season=${currentSeason - 1}...`);
  const prevSeason = currentSeason - 1;
  const prevFixtures = await Fixture.find({ season: prevSeason });
  const matchupMap = {};
  prevFixtures.forEach((fx) => {
    const homeId = fx.homeTeam.toString();
    const awayId = fx.awayTeam.toString();
    const key = [homeId, awayId].sort().join('-');
    matchupMap[key] = homeId;
  });
  return matchupMap;
}

function generateAllMatchups(teams) {
  const matchups = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push({
        teamAId: teams[i]._id.toString(),
        teamBId: teams[j]._id.toString(),
      });
    }
  }
  return matchups;
}

function assignHomeAway(teamAId, teamBId, prevMap, teamMap, assignmentInfo) {
  const key = [teamAId, teamBId].sort().join('-');
  const teamAName = teamMap[teamAId].teamName;
  const teamBName = teamMap[teamBId].teamName;

  let prevHomeName = 'N/A';
  if (prevMap[key]) {
    prevHomeName = teamMap[prevMap[key]].teamName;
  }

  let assignmentLine = '';

  if (prevMap[key]) {
    if (prevMap[key] === teamAId) {
      assignmentLine = `Prev year home = ${prevHomeName}, NOW => ${teamBName}(H) vs ${teamAName}(A)`;
      assignmentInfo.push(assignmentLine);
      return {
        homeTeam: teamMap[teamBId],
        awayTeam: teamMap[teamAId],
      };
    } else {
      assignmentLine = `Prev year home = ${prevHomeName}, NOW => ${teamAName}(H) vs ${teamBName}(A)`;
      assignmentInfo.push(assignmentLine);
      return {
        homeTeam: teamMap[teamAId],
        awayTeam: teamMap[teamBId],
      };
    }
  } else {
    if (Math.random() < 0.5) {
      assignmentLine = `No prev year data, random => ${teamAName}(H) vs ${teamBName}(A)`;
      assignmentInfo.push(assignmentLine);
      return {
        homeTeam: teamMap[teamAId],
        awayTeam: teamMap[teamBId],
      };
    } else {
      assignmentLine = `No prev year data, random => ${teamBName}(H) vs ${teamAName}(A)`;
      assignmentInfo.push(assignmentLine);
      return {
        homeTeam: teamMap[teamBId],
        awayTeam: teamMap[teamAId],
      };
    }
  }
}

function buildAssignedFixtures(matchups, prevMap, teamMap, season, assignmentInfo) {
  return matchups.map((m) => {
    const { homeTeam, awayTeam } = assignHomeAway(
      m.teamAId,
      m.teamBId,
      prevMap,
      teamMap,
      assignmentInfo
    );
    return {
      round: 0,  
      date: null,
      homeTeam,
      awayTeam,
      stadium: homeTeam.stadium,
      location: '',
      season,
    };
  });
}

function randomlyAssignToRounds(fixtures, maxAttempts = 50) {
  const bestRounds = Array.from({ length: 5 }, () => []);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logStep(`randomlyAssignToRounds - Attempt #${attempt}...`);
    const rounds = Array.from({ length: 5 }, () => []);

    const shuffled = shuffleArray([...fixtures]);

    let success = true;
    for (let fx of shuffled) {
      const validRounds = [];
      for (let r = 0; r < 5; r++) {
        if (rounds[r].length < 3) {
          const conflict = rounds[r].some(
            (existingFx) =>
              existingFx.homeTeam._id.toString() === fx.homeTeam._id.toString() ||
              existingFx.homeTeam._id.toString() === fx.awayTeam._id.toString() ||
              existingFx.awayTeam._id.toString() === fx.homeTeam._id.toString() ||
              existingFx.awayTeam._id.toString() === fx.awayTeam._id.toString()
          );
          if (!conflict) {
            validRounds.push(r);
          }
        }
      }

      if (validRounds.length === 0) {
        success = false;
        break;
      }

      const chosenRound = validRounds[Math.floor(Math.random() * validRounds.length)];
      rounds[chosenRound].push(fx);
    }

    if (success) {
      return rounds;
    }
  }

  throw new Error(`Unable to find a valid round assignment after ${maxAttempts} attempts.`);
}

function generateRoundTimes(roundIndex, dateCursor) {
  const roundNum = roundIndex + 1;
  const d = dateCursor.getDay();
  const offset = (6 - d + 7) % 7;
  const saturday = new Date(dateCursor);
  saturday.setDate(saturday.getDate() + offset);

  if (roundNum === 5) {
    const times = ['14:00', '16:00', '18:00'];
    return times.map((t) => {
      const dt = new Date(saturday.toISOString().split('T')[0] + 'T' + t + ':00');
      return dt;
    });
  }

  const satTimes = ['14:00', '16:00'];
  const sunTimes = ['14:00', '16:00'];
  let fridaySlot = null;

  if (roundNum === 1 || roundNum === 3) {
    if (Math.random() < 0.3) {
      const friday = new Date(saturday);
      friday.setDate(saturday.getDate() - 1);
      fridaySlot = new Date(friday.toISOString().split('T')[0] + 'T' + '20:00:00');
    }
  }

  const satObjs = satTimes.map((t) =>
    new Date(saturday.toISOString().split('T')[0] + 'T' + t + ':00')
  );
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  const sunObjs = sunTimes.map((t) =>
    new Date(sunday.toISOString().split('T')[0] + 'T' + t + ':00')
  );

  let candidateSlots = fridaySlot
    ? [fridaySlot, ...satObjs, ...sunObjs]
    : [...satObjs, ...sunObjs];

  shuffleArray(candidateSlots);
  let chosen = candidateSlots.slice(0, 3);
  if (chosen.every((dt) => dt.getDay() === 0)) {
    candidateSlots.sort((a, b) => a.getTime() - b.getTime());
    chosen = [candidateSlots[0], candidateSlots[1], candidateSlots[2]];
  }

  chosen.sort((a, b) => a.getTime() - b.getTime());
  return chosen;
}

async function scheduleFixtures(rounds, season, userRestWeeks = []) {
  let restWeeks = userRestWeeks && userRestWeeks.length ? userRestWeeks : [2, 3];
  logStep(`Scheduling with restWeeks = [${restWeeks}]`);

  let dateCursor = new Date(`${season}-02-01T09:00:00`);
  let scheduledFixtures = [];
  let summaryLines = [];

  for (let r = 0; r < rounds.length; r++) {
    const roundNum = r + 1;
    const roundFixtures = rounds[r];

    const chosenSlots = generateRoundTimes(r, dateCursor);
    logStep(`Round ${roundNum}: time slots => ${chosenSlots.map((x) => x.toISOString())}`);

    for (let i = 0; i < roundFixtures.length; i++) {
      roundFixtures[i].round = roundNum;
      roundFixtures[i].date = chosenSlots[i];
    }

    const earliest = chosenSlots[0];
    const roundCommencement = earliest.toLocaleString('en-GB', { timeZone: 'UTC' });
    summaryLines.push(`Round ${roundNum} commences => ${roundCommencement}`);

    scheduledFixtures.push(...roundFixtures);

    let sunday = new Date(chosenSlots[chosenSlots.length - 1]);
    while (sunday.getDay() !== 0) {
      sunday.setDate(sunday.getDate() + 1);
    }
    let monday = new Date(sunday);
    monday.setDate(sunday.getDate() + 1);
    dateCursor = monday;

    if (restWeeks.includes(roundNum) && roundNum < 5) {
      logStep(`Rest week after Round ${roundNum}`);
      summaryLines.push(`Rest Week inserted after Round ${roundNum}`);
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }

  summaryLines.push('Scheduling complete. Round 5 uses Super Saturday format.');
  summaryLines.push('Randomness: Friday chance ~30% for R1 or R3, random fixture assignment, etc.');

  const populated = [];
  for (let fx of scheduledFixtures) {
    const stadiumDoc = await Stadium.findById(fx.stadium);
    populated.push({
      ...fx,
      stadium: stadiumDoc || { stadiumName: 'Unknown Stadium', stadiumCity: 'Unknown City' },
      location: stadiumDoc ? stadiumDoc.stadiumCity : 'Unknown City',
    });
  }

  return { scheduledFixtures: populated, summaryLines };
}

function buildTeamSummary(fixtures) {
  const teamSummaryMap = {};

  for (let fx of fixtures) {
    const homeName = fx.homeTeam.teamName;
    const awayName = fx.awayTeam.teamName;
    const rnd = fx.round;

    if (!teamSummaryMap[homeName]) teamSummaryMap[homeName] = [];
    teamSummaryMap[homeName].push({
      round: rnd,
      homeAway: 'Home',
      opponent: awayName,
    });

    if (!teamSummaryMap[awayName]) teamSummaryMap[awayName] = [];
    teamSummaryMap[awayName].push({
      round: rnd,
      homeAway: 'Away',
      opponent: homeName,
    });
  }

  const lines = [];
  Object.keys(teamSummaryMap).forEach((teamName) => {
    teamSummaryMap[teamName].sort((a, b) => a.round - b.round);

    const fixtureDetails = teamSummaryMap[teamName].map((entry, index, arr) => {
      const suffix = index < arr.length - 1 ? ',' : '';
      return `R${entry.round} - ${entry.homeAway} vs ${entry.opponent}${suffix}`;
    });

    const detailText = fixtureDetails.join('\n ');

    lines.push(`${teamName}:\n ${detailText}`);
  });

  return lines;
}

async function generateRandomFixtures(teams, season, restWeeks = []) {
  try {
    logStep(`=== START generateRandomFixtures for season=${season} ===`);
    if (teams.length !== 6) {
      throw new Error('Exactly 6 teams are required for the Random algorithm.');
    }

    const prevMap = await fetchPreviousYearFixtures(teams, season);

    const assignmentInfo = [];

    const teamMap = {};
    teams.forEach((t) => (teamMap[t._id.toString()] = t));

    const rawMatchups = generateAllMatchups(teams);

    const assignedFixtures = buildAssignedFixtures(
      rawMatchups,
      prevMap,
      teamMap,
      season,
      assignmentInfo
    );

    const rounds = randomlyAssignToRounds(assignedFixtures, 60);
    logStep(`Successfully assigned 15 fixtures into 5 random rounds.`);

    const { scheduledFixtures, summaryLines } = await scheduleFixtures(
      rounds,
      season,
      restWeeks
    );

    const teamSummaryLines = buildTeamSummary(scheduledFixtures);

    const finalSummary = [];
    finalSummary.push('--- HOME/AWAY ASSIGNMENT DETAILS ---');
    assignmentInfo.forEach((line) => finalSummary.push(line));
    finalSummary.push(' ');
    finalSummary.push('--- ROUND SCHEDULING DETAILS ---');
    summaryLines.forEach((line) => finalSummary.push(line));
    finalSummary.push(' ');
    finalSummary.push('--- PER-TEAM FIXTURE SUMMARY ---');
    teamSummaryLines.forEach((line) => finalSummary.push(line));

    logStep('=== END generateRandomFixtures ===');
    return { fixtures: scheduledFixtures, summary: finalSummary };
  } catch (err) {
    console.error('[RandomAlgorithm] generateRandomFixtures error:', err);
    throw err;
  }
}

module.exports = {
  generateRandomFixtures,
};