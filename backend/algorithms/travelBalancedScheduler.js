/**
 * @module backend/algorithms/travelStdDevScheduler
 * @description
 * A single-weekend-per-round scheduler that:
 *   - Minimizes stdDev of travel distance (with ± threshold check around median).
 *   - Flips home/away if last year's home was the same.
 *   - Ensures each team plays exactly once per round (no duplicates).
 *   - Has rest weeks (no matches) after certain rounds (e.g. R2, R4).
 *   - Schedules each round's 3 matches on a single Saturday, final "Super Saturday" for Round 5.
 *   - Uses a local search that checks constraints to avoid duplications in the same round.
 */

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const NodeCache = require('node-cache');
require('dotenv').config();

const distanceCache = new NodeCache({ stdTTL: 86400 });

const DISTANCE_THRESHOLD = 500;

async function generateStandardDeviationBalancedFixtures(teams, season, restWeeks = []) {
  console.log('===== Starting StdDev-Balanced Fixture Generation =====');

  if (teams.length !== 6) {
    throw new Error('This scheduler is built for exactly 6 teams.');
  }

  if (!restWeeks || restWeeks.length === 0) {
    restWeeks = [2, 4];
  }

  const previousSeasonFixtures = await Fixture.find({ season: season - 1 })
    .populate('homeTeam', '_id')
    .populate('awayTeam', '_id')
    .lean();

  const previousFixtureMap = new Map();
  for (const fix of previousSeasonFixtures) {
    const hId = fix.homeTeam._id.toString();
    const aId = fix.awayTeam._id.toString();
    const key = [hId, aId].sort().join('-');
    previousFixtureMap.set(key, fix);
  }

  const { distances, distanceMessages } = await precomputeDistances(teams);

  const maxAttempts = 100000; //! changed from 10
  let bestValidResult = null;
  let bestValidStdDev = Infinity;
  let bestOverallResult = null;
  let bestOverallStdDev = Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n=== Attempt ${attempt} ===`);

    let result;
    if (previousFixtureMap.size > 0) {
      result = await generateFixturesWithPreviousData(
        teams,
        season,
        previousFixtureMap,
        distances,
        distanceMessages,
        restWeeks
      );
    } else {
      result = await generateFixturesWithoutPreviousData(
        teams,
        season,
        distances,
        distanceMessages,
        restWeeks
      );
    }

    const stats = computeStats(result.teamTravelDistances);
    const stdDev = stats.stdDev;
    const withinThreshold = checkWithinMedianThreshold(
      result.teamTravelDistances,
      stats.median,
      DISTANCE_THRESHOLD
    );

    console.log(
      `StdDev = ${stdDev.toFixed(2)}; median = ${stats.median.toFixed(2)}; thresholdOK = ${withinThreshold}`
    );

    if (stdDev < bestOverallStdDev) {
      bestOverallStdDev = stdDev;
      bestOverallResult = result;
      console.log(`New best overall stdDev found on attempt ${attempt}.`);
    }

    if (withinThreshold && stdDev < bestValidStdDev) {
      bestValidStdDev = stdDev;
      bestValidResult = result;
      console.log(`New best threshold-valid stdDev found on attempt ${attempt}.`);
    }
  }

  let finalResult;
  if (bestValidResult) {
    finalResult = bestValidResult;
    console.log(
      `\n===== Final: threshold-valid arrangement with stdDev=${bestValidStdDev.toFixed(2)} =====\n`
    );
  } else {
    finalResult = bestOverallResult;
    console.log(
      `\n===== No threshold-valid arrangement => fallback to best overall stdDev=${bestOverallStdDev.toFixed(2)} =====\n`
    );
  }

  return finalResult;
}

async function generateFixturesWithPreviousData(
  teams,
  season,
  previousFixtureMap,
  distances,
  distanceMessages,
  restWeeks
) {
  console.log('Generating with previous-season data...');


  const initialFixtures = generateRoundRobinMatchups(teams);

  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    previousFixtureMap,
    teams
  );

  let { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams);

  scheduledFixtures = localSearchRoundSwap(scheduledFixtures, teams, distances);

  const finalScheduled = await scheduleFixturesByRound(scheduledFixtures, season, distances, restWeeks);

  const { teamTravelDistances, matchTravelDistances } = calculateTeamTravelDistances(
    finalScheduled,
    distances,
    teams,
    restWeeks
  );
  const total = Object.values(teamTravelDistances).reduce((a, b) => a + b, 0);

  const summary = buildSummary(
    teams,
    finalScheduled,
    distanceMessages,
    teamTravelDistances,
    matchTravelDistances,
    matchupChanges,
    total,
    restWeeks,
    'StdDev Balanced (with previous data)'
  );

  const formattedFixtures = finalScheduled.map((fix) => ({
    round: fix.round,
    date: fix.date,
    homeTeam: fix.homeTeam._id,
    awayTeam: fix.awayTeam._id,
    stadium: fix.stadium ? fix.stadium._id : null,
    location: fix.location,
    season,
  }));

  return {
    fixtures: formattedFixtures,
    summary,
    totalTravelDistances: total,
    teamTravelDistances,
    matchTravelDistances,
  };
}

async function generateFixturesWithoutPreviousData(
  teams,
  season,
  distances,
  distanceMessages,
  restWeeks
) {
  console.log('Generating with NO previous-season data...');

  const initialFixtures = generateRoundRobinMatchups(teams);

  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    null,
    teams
  );

  let { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams);

  scheduledFixtures = localSearchRoundSwap(scheduledFixtures, teams, distances);

  const finalScheduled = await scheduleFixturesByRound(scheduledFixtures, season, distances, restWeeks);

  const { teamTravelDistances, matchTravelDistances } = calculateTeamTravelDistances(
    finalScheduled,
    distances,
    teams,
    restWeeks
  );
  const total = Object.values(teamTravelDistances).reduce((a, b) => a + b, 0);

  const summary = buildSummary(
    teams,
    finalScheduled,
    distanceMessages,
    teamTravelDistances,
    matchTravelDistances,
    matchupChanges,
    total,
    restWeeks,
    'StdDev Balanced (no previous data)'
  );

  const formattedFixtures = finalScheduled.map((fix) => ({
    round: fix.round,
    date: fix.date,
    homeTeam: fix.homeTeam._id,
    awayTeam: fix.awayTeam._id,
    stadium: fix.stadium ? fix.stadium._id : null,
    location: fix.location,
    season,
  }));

  return {
    fixtures: formattedFixtures,
    summary,
    totalTravelDistances: total,
    teamTravelDistances,
    matchTravelDistances,
  };
}

function generateRoundRobinMatchups(teams) {
  const numTeams = teams.length;
  const totalRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  const list = teams.slice(1);
  const rounds = [];
  for (let r = 0; r < totalRounds; r++) {
    const fixtures = [];
    for (let i = 0; i < halfSize; i++) {
      const home = i === 0 ? teams[0] : list[i - 1];
      const away = list[list.length - i - 1];
      fixtures.push({ homeTeam: home, awayTeam: away });
    }
    rounds.push(fixtures);
    list.unshift(list.pop());
  }

  const allFixtures = [];
  rounds.forEach((roundFixtures, roundIndex) => {
    roundFixtures.forEach((f) => {
      allFixtures.push({
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        round: roundIndex + 1,
      });
    });
  });
  return allFixtures;
}

function assignFixturesToRoundsOptimized(fixtures, teams) {
  const totalRounds = 5;
  const rounds = Array.from({ length: totalRounds }, () => []);
  const teamRoundMap = {};
  teams.forEach((t) => (teamRoundMap[t._id.toString()] = new Set()));

  const all = shuffleArray([...fixtures]);
  const maxReset = 1000;
  let resetCount = 0;

  while (resetCount < maxReset) {
    rounds.forEach((r) => r.splice(0, r.length));
    Object.values(teamRoundMap).forEach((s) => s.clear());

    let success = true;
    for (let fix of all) {
      let placed = false;
      for (let r = 1; r <= totalRounds; r++) {
        const hId = fix.homeTeam._id.toString();
        const aId = fix.awayTeam._id.toString();
        if (!teamRoundMap[hId].has(r) && !teamRoundMap[aId].has(r)) {
          fix.round = r;
          rounds[r - 1].push(fix);
          teamRoundMap[hId].add(r);
          teamRoundMap[aId].add(r);
          placed = true;
          break;
        }
      }
      if (!placed) {
        success = false;
        break;
      }
    }
    if (success) {
      return { scheduledFixtures: rounds.flat() };
    } else {
      resetCount++;
      shuffleArray(all);
    }
  }
  console.warn('assignFixturesToRoundsOptimized: max reset attempts reached');
  return { scheduledFixtures: rounds.flat() };
}

function optimizeHomeAwayAssignments(fixtures, previousFixtureMap, teams) {
  const matchupChanges = [];
  fixtures = shuffleArray(fixtures);

  const homeCounts = {};
  const awayCounts = {};
  teams.forEach((t) => {
    homeCounts[t._id.toString()] = 0;
    awayCounts[t._id.toString()] = 0;
  });

  const optimized = [];

  for (let fix of fixtures) {
    const hId = fix.homeTeam._id.toString();
    const aId = fix.awayTeam._id.toString();
    const key = [hId, aId].sort().join('-');

    let chosen;
    let note = '';
    let prevDescription = 'No previous matchup';

    if (previousFixtureMap && previousFixtureMap.has(key)) {
      const prevFix = previousFixtureMap.get(key);
      const prevHomeId = prevFix.homeTeam._id.toString();

      const prevHomeName = getTeamNameById(teams, prevFix.homeTeam._id);
      const prevAwayName = getTeamNameById(teams, prevFix.awayTeam._id);
      prevDescription = `Last Season: ${prevHomeName} vs ${prevAwayName}`;

      if (prevHomeId === hId) {
        chosen = { homeTeam: fix.awayTeam, awayTeam: fix.homeTeam };
        note = 'Flipped from last year';
      } else {
        chosen = { homeTeam: fix.homeTeam, awayTeam: fix.awayTeam };
        note = 'Maintained (already alternated) from last year';
      }
    } else {
      chosen = decideHomeAwayNoPrevious(fix, homeCounts, awayCounts);
      note =
        chosen.homeTeam._id.toString() === fix.homeTeam._id.toString()
          ? 'Assigned (original) to manage constraints'
          : 'Assigned (flipped) to manage constraints';
    }

    const hid2 = chosen.homeTeam._id.toString();
    const aid2 = chosen.awayTeam._id.toString();
    homeCounts[hid2]++;
    awayCounts[aid2]++;

    const st = chosen.homeTeam.stadium;
    if (st) {
      chosen.stadium = st;
      chosen.location = st.stadiumCity;
    } else {
      chosen.stadium = null;
      chosen.location = 'Unknown';
    }

    matchupChanges.push({
      previousMatchup: prevDescription,
      currentMatchup: `${chosen.homeTeam.teamName} vs ${chosen.awayTeam.teamName}`,
      note,
    });

    optimized.push(chosen);
  }

  balanceHomeAwayCounts(optimized, homeCounts, awayCounts, teams, previousFixtureMap);

  return { optimizedFixtures: optimized, matchupChanges };
}

function decideHomeAwayNoPrevious(fixture, homeCounts, awayCounts) {
  const hId = fixture.homeTeam._id.toString();
  const aId = fixture.awayTeam._id.toString();
  const homeCountH = homeCounts[hId];
  const homeCountA = homeCounts[aId];

  if (homeCountH < 3 && (homeCountA >= 3 || homeCountH <= homeCountA)) {
    return { homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam };
  } else {
    return { homeTeam: fixture.awayTeam, awayTeam: fixture.homeTeam };
  }
}

function balanceHomeAwayCounts(fixtures, homeCounts, awayCounts, teams, previousFixtureMap) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of teams) {
      const tid = t._id.toString();
      if (homeCounts[tid] < 2) {
        for (const fix of fixtures) {
          if (fix.awayTeam._id.toString() === tid) {
            const homeId = fix.homeTeam._id.toString();
            if (homeCounts[homeId] > 2 && awayCounts[tid] > 2) {
              if (canFlipFixture(fix, teams, previousFixtureMap)) {
                homeCounts[homeId]--;
                awayCounts[tid]--;
                homeCounts[tid]++;
                awayCounts[homeId]++;
                flipFixtureHomeAway(fix);
                changed = true;
                break;
              }
            }
          }
        }
      }
      // if team has <2 away then flipping
      if (awayCounts[tid] < 2) {
        for (const fix of fixtures) {
          if (fix.homeTeam._id.toString() === tid) {
            const awayId = fix.awayTeam._id.toString();
            if (homeCounts[tid] > 2 && awayCounts[awayId] > 2) {
              if (canFlipFixture(fix, teams, previousFixtureMap)) {
                homeCounts[tid]--;
                awayCounts[awayId]--;
                homeCounts[awayId]++;
                awayCounts[tid]++;
                flipFixtureHomeAway(fix);
                changed = true;
                break;
              }
            }
          }
        }
      }
    }
  }
}

function flipFixtureHomeAway(fix) {
  const oldHome = fix.homeTeam;
  fix.homeTeam = fix.awayTeam;
  fix.awayTeam = oldHome;
  const st = fix.homeTeam.stadium;
  fix.stadium = st || null;
  fix.location = st ? st.stadiumCity : 'Unknown';
}

function canFlipFixture(fix, teams, previousFixtureMap) {
  const oldHomeId = fix.homeTeam._id.toString();
  const oldAwayId = fix.awayTeam._id.toString();
  const key = [oldHomeId, oldAwayId].sort().join('-');
  if (!previousFixtureMap || !previousFixtureMap.has(key)) return true;

  const prev = previousFixtureMap.get(key);
  const prevHomeId = prev.homeTeam._id.toString();
  if (prevHomeId === oldAwayId) {
    return false;
  }
  return true;
}

function localSearchRoundSwap(scheduledFixtures, teams, distances) {
  let bestArrangement = [...scheduledFixtures];
  let bestTravelMap = quickCalculateTravelByTeam(bestArrangement, teams, distances);
  let bestStdDev = computeStats(bestTravelMap).stdDev;

  const maxSwaps = 50;
  let improved = true;
  let tries = 0;

  while (improved && tries < maxSwaps) {
    improved = false;
    tries++;

    const i1 = Math.floor(Math.random() * bestArrangement.length);
    const i2 = Math.floor(Math.random() * bestArrangement.length);
    if (i1 === i2) continue;

    const f1 = bestArrangement[i1];
    const f2 = bestArrangement[i2];
    if (f1.round === f2.round) continue;

    const oldR1 = f1.round;
    const oldR2 = f2.round;
    f1.round = oldR2;
    f2.round = oldR1;

    if (!areRoundAssignmentsValid(bestArrangement, teams)) {
      f1.round = oldR1;
      f2.round = oldR2;
      continue;
    }

    const newTravelMap = quickCalculateTravelByTeam(bestArrangement, teams, distances);
    const newStdDev = computeStats(newTravelMap).stdDev;
    if (newStdDev < bestStdDev) {
      bestStdDev = newStdDev;
      bestTravelMap = newTravelMap;
      improved = true;
    } else {
      f1.round = oldR1;
      f2.round = oldR2;
    }
  }

  return bestArrangement;
}

function areRoundAssignmentsValid(arr, teams) {
  const roundMap = {};
  for (let fix of arr) {
    const r = fix.round;
    if (!roundMap[r]) roundMap[r] = new Set();
    const hId = fix.homeTeam._id.toString();
    const aId = fix.awayTeam._id.toString();
    if (roundMap[r].has(hId) || roundMap[r].has(aId)) {
      return false;
    }
    roundMap[r].add(hId);
    roundMap[r].add(aId);
  }
  return true;
}

function quickCalculateTravelByTeam(fixtures, teams, distances) {
  const byRound = {};
  for (let fix of fixtures) {
    if (!byRound[fix.round]) byRound[fix.round] = [];
    byRound[fix.round].push(fix);
  }
  const loc = {};
  teams.forEach((t) => {
    loc[t._id.toString()] = t._id.toString(); 
  });
  const travelByTeam = {};
  teams.forEach((t) => {
    travelByTeam[t._id.toString()] = 0;
  });

  const roundsUsed = Object.keys(byRound).map(Number).sort((a,b)=>a-b);
  for (let r of roundsUsed) {
    const roundFx = byRound[r];
    for (let fix of roundFx) {
      const awayId = fix.awayTeam._id.toString();
      const homeId = fix.homeTeam._id.toString();

      const distAway = getDistanceFromIDs(loc[awayId], homeId, distances);
      travelByTeam[awayId] += distAway;
      loc[awayId] = homeId;

      if (loc[homeId] !== homeId) {
        const distHome = getDistanceFromIDs(loc[homeId], homeId, distances);
        travelByTeam[homeId] += distHome;
        loc[homeId] = homeId;
      }
    }
  }
  return travelByTeam;
}

async function scheduleFixturesByRound(fixtures, season, distances, restWeeks) {
  const scheduled = [];
  const totalRounds = 5;
  const roundDates = buildRoundDates(season, restWeeks, totalRounds);

  const byRound = {};
  for (let fix of fixtures) {
    if (!byRound[fix.round]) byRound[fix.round] = [];
    byRound[fix.round].push(fix);
  }

  for (let r = 1; r <= totalRounds; r++) {
    const roundFixes = byRound[r] || [];
    if (roundFixes.length === 0) continue;

    const baseDate = roundDates[r - 1];
    if (!baseDate) continue;
    roundFixes.sort((a, b) => a.awayTeam.teamName.localeCompare(b.awayTeam.teamName));
    const timeSlots = ['12:00','14:00','16:00'];
    for (let i = 0; i < roundFixes.length; i++) {
      if (i > 2) {
        console.warn(`Round ${r} has more than 3 fixtures? Should not happen for 6 teams`);
        break;
      }
      const fix = roundFixes[i];
      const dtStr = `${formatDate(baseDate)}T${timeSlots[i]}:00`;
      fix.date = new Date(dtStr);
      scheduled.push(fix);
    }
  }

  scheduled.sort((a, b) => a.date - b.date);
  return scheduled;
}

function buildRoundDates(season, restWeeks, totalRounds) {
  let dateCursor = findFirstSaturdayOfFebruary(season);
  const dates = [];

  for (let r = 1; r <= totalRounds; r++) {
    dates.push(new Date(dateCursor));
    dateCursor.setDate(dateCursor.getDate() + 7);
    if (restWeeks.includes(r)) {
      // skip an extra 7 days for rest
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }
  return dates;
}

function findFirstSaturdayOfFebruary(season) {
  const d = new Date(`${season}-02-01T00:00:00`);
  while (d.getDay() !== 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calculateTeamTravelDistances(fixtures, distances, teams, restWeeks) {
  const teamTravelDistances = {};
  teams.forEach((t) => {
    teamTravelDistances[t._id.toString()] = 0;
  });

  const matchTravelLog = {};
  fixtures.forEach((f) => {
    if (!matchTravelLog[f.round]) matchTravelLog[f.round] = [];
  });

  const teamLocations = {};
  teams.forEach((t) => {
    teamLocations[t._id.toString()] = { lat: t.stadium.latitude, lon: t.stadium.longitude };
  });

  fixtures.sort((a, b) => a.date - b.date);
  let currentRound = 1;

  for (let i = 0; i < fixtures.length; i++) {
    const fix = fixtures[i];
    const round = fix.round;

    if (round !== currentRound) {
      if (restWeeks.includes(currentRound)) {
        forceAllTeamsHome(
          teams,
          teamLocations,
          teamTravelDistances,
          matchTravelLog,
          fixtures[i - 1].date,
          currentRound,
          distances,
          false
        );
      }
      currentRound = round;
    }

    const awayId = fix.awayTeam._id.toString();
    const fromLoc = { ...teamLocations[awayId] };
    const toLoc = { lat: fix.stadium.latitude, lon: fix.stadium.longitude };
    const dist = calculateDistanceBetweenCoordinates(fromLoc, toLoc);
    teamTravelDistances[awayId] += dist;
    matchTravelLog[round].push({
      round,
      teamName: fix.awayTeam.teamName,
      fromTeamName: findTeamNameByLocation(teams, fromLoc),
      from: fromLoc,
      toTeamName: fix.homeTeam.teamName,
      to: toLoc,
      opponent: fix.homeTeam.teamName,
      distance: dist,
      date: fix.date,
      note: null,
    });
    teamLocations[awayId] = toLoc;

    const homeId = fix.homeTeam._id.toString();
    const homeLoc = { ...teamLocations[homeId] };
    const stadiumLoc = { lat: fix.stadium.latitude, lon: fix.stadium.longitude };
    if (homeLoc.lat !== stadiumLoc.lat || homeLoc.lon !== stadiumLoc.lon) {
      const distHome = calculateDistanceBetweenCoordinates(homeLoc, stadiumLoc);
      teamTravelDistances[homeId] += distHome;
      matchTravelLog[round].push({
        round,
        teamName: fix.homeTeam.teamName,
        fromTeamName: findTeamNameByLocation(teams, homeLoc),
        from: homeLoc,
        toTeamName: fix.homeTeam.teamName,
        to: stadiumLoc,
        opponent: fix.awayTeam.teamName,
        distance: distHome,
        date: fix.date,
        note: 'Return home to host',
      });
      teamLocations[homeId] = stadiumLoc;
    }
  }

  if (restWeeks.includes(currentRound)) {
    forceAllTeamsHome(
      teams,
      teamLocations,
      teamTravelDistances,
      matchTravelLog,
      fixtures[fixtures.length - 1].date,
      currentRound,
      distances,
      false
    );
  }
  forceAllTeamsHome(
    teams,
    teamLocations,
    teamTravelDistances,
    matchTravelLog,
    fixtures[fixtures.length - 1].date,
    currentRound,
    distances,
    true
  );

  const mergedTravelLogs = [];
  Object.keys(matchTravelLog)
    .sort((a, b) => a - b)
    .forEach((r) => {
      mergedTravelLogs.push(...matchTravelLog[r]);
    });

  return {
    teamTravelDistances,
    matchTravelDistances: mergedTravelLogs,
  };
}

function forceAllTeamsHome(
  teams,
  teamLocations,
  teamTravelDistances,
  matchTravelLog,
  approxDate,
  round,
  distances,
  endOfSeason
) {
  for (let tm of teams) {
    const tid = tm._id.toString();
    const cur = teamLocations[tid];
    const home = { lat: tm.stadium.latitude, lon: tm.stadium.longitude };
    if (Math.abs(cur.lat - home.lat) > 0.001 || Math.abs(cur.lon - home.lon) > 0.001) {
      const dist = calculateDistanceBetweenCoordinates(cur, home);
      teamTravelDistances[tid] += dist;
      if (!matchTravelLog[round]) matchTravelLog[round] = [];
      matchTravelLog[round].push({
        round,
        teamName: tm.teamName,
        fromTeamName: findTeamNameByLocation(teams, cur),
        from: { ...cur },
        toTeamName: tm.teamName,
        to: { ...home },
        opponent: 'Home',
        distance: dist,
        date: approxDate || null,
        note: endOfSeason ? 'Return home end-of-season' : 'Forced home due to rest week',
      });
      teamLocations[tid] = { ...home };
    }
  }
}

function computeStats(teamTravelDistances) {
  const values = Object.values(teamTravelDistances);
  values.sort((a, b) => a - b);

  const count = values.length;
  const minVal = values[0];
  const maxVal = values[count - 1];
  const sum = values.reduce((acc, x) => acc + x, 0);
  const mean = sum / count;

  let median;
  if (count % 2 === 1) {
    median = values[Math.floor(count / 2)];
  } else {
    median = (values[count / 2 - 1] + values[count / 2]) / 2;
  }

  let variance = 0;
  for (const val of values) {
    variance += (val - mean) ** 2;
  }
  variance /= count;
  const stdDev = Math.sqrt(variance);

  return { min: minVal, max: maxVal, mean, median, stdDev };
}

function checkWithinMedianThreshold(teamTravelDistances, median, threshold) {
  return Object.values(teamTravelDistances).every((dist) => {
    return dist >= median - threshold && dist <= median + threshold;
  });
}

function getDistanceFromIDs(idA, idB, distances) {
  if (idA === idB) return 0;
  const k1 = `${idA}-${idB}`;
  const k2 = `${idB}-${idA}`;
  return distances[k1] || distances[k2] || 0;
}

function findTeamNameByLocation(teams, loc) {
  if (!loc) return 'Unknown';
  const TOLERANCE = 0.01;
  for (const tm of teams) {
    if (tm.stadium) {
      const latDiff = Math.abs(tm.stadium.latitude - loc.lat);
      const lonDiff = Math.abs(tm.stadium.longitude - loc.lon);
      if (latDiff < TOLERANCE && lonDiff < TOLERANCE) {
        return tm.teamName;
      }
    }
  }
  return 'Unknown';
}

function getTeamNameById(teams, id) {
  const found = teams.find((t) => t._id.toString() === id.toString());
  return found ? found.teamName : 'Unknown Team';
}

function calculateDistanceBetweenCoordinates(coord1, coord2) {
  const R = 6371; // km
  const lat1 = coord1.lat * (Math.PI / 180);
  const lon1 = coord1.lon * (Math.PI / 180);
  const lat2 = coord2.lat * (Math.PI / 180);
  const lon2 = coord2.lon * (Math.PI / 180);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function precomputeDistances(teams) {
  console.log('Precomputing distances via Haversine + caching...');
  const distances = {};
  const distanceMessages = [];

  const teamCoords = {};
  for (const t of teams) {
    if (!t.stadium) {
      teamCoords[t._id.toString()] = { lat: 0, lon: 0 };
    } else {
      teamCoords[t._id.toString()] = {
        lat: t.stadium.latitude,
        lon: t.stadium.longitude,
      };
    }
  }

  const distPromises = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const tA = teams[i];
      const tB = teams[j];
      distPromises.push(
        getDistanceBetweenLocations(
          teamCoords[tA._id.toString()],
          teamCoords[tB._id.toString()]
        ).then((dist) => {
          distances[`${tA._id}-${tB._id}`] = dist;
          distances[`${tB._id}-${tA._id}`] = dist;
          const msg = `Distance: ${tA.teamName} vs ${tB.teamName} => ${dist.toFixed(2)} km`;
          distanceMessages.push(msg);
          console.log(msg);
        })
      );
    }
  }

  await Promise.all(distPromises);
  console.log('All distances precomputed.');
  return { distances, distanceMessages };
}

async function getDistanceBetweenLocations(origin, destination) {
  const cacheKey = `${origin.lat},${origin.lon}-${destination.lat},${destination.lon}`;
  const cached = distanceCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const dist = calculateDistanceBetweenCoordinates(origin, destination);
  distanceCache.set(cacheKey, dist);
  return dist;
}

function buildSummary(
  teams,
  fixtures,
  distanceMessages,
  teamTravelDistances,
  matchTravelDistances,
  matchupChanges,
  totalTravelDistance,
  restWeeks,
  approachType
) {
  const summary = [];
  summary.push(`=== ${approachType} ===`);
  summary.push(`Total Travel Distance: ${totalTravelDistance.toFixed(2)} km`);
  summary.push(`Rest Weeks: ${restWeeks.join(', ')}`);

  const stats = computeStats(teamTravelDistances);
  summary.push(
    `Distances => min=${stats.min.toFixed(2)}, max=${stats.max.toFixed(2)}, median=${stats.median.toFixed(
      2
    )}, mean=${stats.mean.toFixed(2)}, stdDev=${stats.stdDev.toFixed(2)}`
  );
  summary.push(
    `Threshold ±${DISTANCE_THRESHOLD} => ${(stats.median - DISTANCE_THRESHOLD).toFixed(2)} .. ${(stats.median + DISTANCE_THRESHOLD).toFixed(
      2
    )}\n`
  );

  if (matchupChanges.length) {
    summary.push('--- Home/Away Alternation Changes ---');
    matchupChanges.forEach((mc) => {
      summary.push(`  Prev: ${mc.previousMatchup} => Now: ${mc.currentMatchup} [${mc.note}]`);
    });
    summary.push('');
  }

  summary.push('--- Distances Between Teams (Precomputed) ---');
  summary.push(...distanceMessages);
  summary.push('');

  summary.push('--- Per-Match Travel Logs ---');
  const groupedByRound = matchTravelDistances.reduce((acc, md) => {
    if (!acc[md.round]) acc[md.round] = [];
    acc[md.round].push(md);
    return acc;
  }, {});
  Object.keys(groupedByRound)
    .sort((a, b) => a - b)
    .forEach((round) => {
      groupedByRound[round].forEach((md) => {
        const dateStr = md.date ? new Date(md.date).toLocaleString() : 'Unknown';
        const note = md.note ? `(${md.note})` : '';
        summary.push(
          `R${md.round} | ${md.teamName} from ${md.fromTeamName} ` +
            `[${md.from.lat.toFixed(2)},${md.from.lon.toFixed(2)}] -> ${md.toTeamName} ` +
            `[${md.to.lat.toFixed(2)},${md.to.lon.toFixed(2)}] = ${md.distance.toFixed(2)} km ${note} @ ${dateStr}`
        );
      });
      summary.push('');
    });

  summary.push('--- Total Travel Distances by Team ---');
  teams.forEach((t) => {
    const d = teamTravelDistances[t._id.toString()] || 0;
    summary.push(`  ${t.teamName}: ${d.toFixed(2)} km`);
  });
  summary.push('');

  summary.push('--- Per-Team Fixture Summary ---');
  const teamMap = {};
  teams.forEach((t) => {
    teamMap[t._id.toString()] = { name: t.teamName, matches: [] };
  });
  for (const fx of fixtures) {
    const hId = fx.homeTeam._id.toString();
    const aId = fx.awayTeam._id.toString();
    teamMap[hId].matches.push({
      round: fx.round,
      homeAway: 'Home',
      opp: fx.awayTeam,
      date: fx.date,
    });
    teamMap[aId].matches.push({
      round: fx.round,
      homeAway: 'Away',
      opp: fx.homeTeam,
      date: fx.date,
    });
  }
  Object.values(teamMap).forEach((tm) => {
    tm.matches.sort((a, b) => a.round - b.round);
  });
  Object.keys(teamMap).forEach((k) => {
    const t = teamMap[k];
    summary.push(`${t.name}:`);
    t.matches.forEach((m) => {
      summary.push(`  R${m.round} - ${m.homeAway} vs ${m.opp.teamName} on ${m.date.toDateString()}`);
    });
    summary.push('');
  });

  return summary;
}

module.exports = {
  generateStandardDeviationBalancedFixtures
};