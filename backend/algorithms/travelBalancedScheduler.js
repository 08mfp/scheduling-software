// backend/algorithms/travelStdDevScheduler.js

/**
 * @module backend/algorithms/travelStdDevScheduler
 * @description
 * Generates fixtures attempting to minimize the standard deviation of travel distance
 * among all teams, while also enforcing that no team is > threshold from the median distance.
 *
 * Key features:
 *   - Up to 1000 attempts (random + minor local search)
 *   - Forcing teams home on rest weeks and after final round
 *   - Always flipping last year's home/away if it existed
 *   - Uses standard deviation + median threshold check
 */

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const NodeCache = require('node-cache');
require('dotenv').config();

// Cache distances for 24 hours
const distanceCache = new NodeCache({ stdTTL: 86400 }); // 1 day

// Example threshold: ±500 km from median
const DISTANCE_THRESHOLD = 500;

/**
 * Main export: tries multiple attempts (up to 1000).
 * Among attempts that pass the "median ± threshold" rule, pick the one with the smallest std dev.
 * If none pass the threshold rule, pick the arrangement with the smallest std dev overall.
 */
async function generateStandardDeviationBalancedFixtures(teams, season, restWeeks = []) {
  console.log('===== Starting StdDev-Balanced Fixture Generation =====');

  // 1) Must have exactly 6 teams
  if (teams.length !== 6) {
    throw new Error('Requires exactly 6 teams for standard-deviation balanced scheduling.');
  }

  // 2) Default rest weeks => [2,4] for 2-1-2 pattern
  if (!restWeeks || restWeeks.length === 0) {
    restWeeks = [2, 4];
  }

  // 3) Fetch previous-season data for venue alternation
  const previousSeasonFixtures = await Fixture.find({ season: season - 1 })
    .populate('homeTeam', '_id')
    .populate('awayTeam', '_id')
    .lean();

  // Build a map for quick lookup of last season’s home/away
  const previousFixtureMap = new Map();
  for (let fix of previousSeasonFixtures) {
    const hId = fix.homeTeam._id.toString();
    const aId = fix.awayTeam._id.toString();
    const key = [hId, aId].sort().join('-');
    previousFixtureMap.set(key, fix);
  }

  // 4) Precompute distances
  const { distances, distanceMessages } = await precomputeDistances(teams);

  // 5) Try multiple attempts
  const maxAttempts = 100000;
  let bestValidResult = null;     // best among those that pass threshold
  let bestValidStdDev = Infinity;
  let bestOverallResult = null;   // best ignoring threshold
  let bestOverallStdDev = Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n=== Attempt ${attempt} ===`);

    // Generate a fixture arrangement
    let result;
    if (previousSeasonFixtures.length > 0) {
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

    // Evaluate the standard deviation & median-based threshold
    const stats = computeStats(result.teamTravelDistances);
    const stdDev = stats.stdDev;
    const withinThreshold = checkWithinMedianThreshold(
      result.teamTravelDistances,
      stats.median,
      DISTANCE_THRESHOLD
    );

    console.log(
      `StdDev = ${stdDev.toFixed(2)} km; ` +
        `Median = ${stats.median.toFixed(2)} km; ` +
        `withinThreshold? ${withinThreshold}`
    );

    // Track best overall
    if (stdDev < bestOverallStdDev) {
      bestOverallStdDev = stdDev;
      bestOverallResult = result;
      console.log(`New best overall stdDev found on attempt ${attempt}.`);
    }

    // Track best among valid (threshold-passing) attempts
    if (withinThreshold && stdDev < bestValidStdDev) {
      bestValidStdDev = stdDev;
      bestValidResult = result;
      console.log(`New best threshold-valid stdDev found on attempt ${attempt}.`);
    }
  }

  // Final decision
  let finalResult = null;
  if (bestValidResult) {
    finalResult = bestValidResult;
    console.log(
      `\n===== Final: Chose threshold-valid arrangement with stdDev=${bestValidStdDev.toFixed(
        2
      )} =====\n`
    );
  } else {
    finalResult = bestOverallResult;
    console.log(
      `\n===== No arrangement passed threshold => fallback to best overall stdDev=${bestOverallStdDev.toFixed(
        2
      )} =====\n`
    );
  }

  return finalResult;
}

/**
 * Basic stats function to get min, max, mean, median, stdDev.
 * - returns { min, max, mean, median, stdDev }
 */
function computeStats(teamTravelDistances) {
  const values = Object.values(teamTravelDistances);
  values.sort((a, b) => a - b);

  const count = values.length;
  const minVal = values[0];
  const maxVal = values[count - 1];

  // mean
  const sum = values.reduce((acc, x) => acc + x, 0);
  const mean = sum / count;

  // median
  let median = 0;
  if (count % 2 === 1) {
    median = values[Math.floor(count / 2)];
  } else {
    const mid1 = values[count / 2 - 1];
    const mid2 = values[count / 2];
    median = (mid1 + mid2) / 2;
  }

  // standard deviation
  let variance = 0;
  for (let val of values) {
    variance += (val - mean) ** 2;
  }
  variance /= count;
  const stdDev = Math.sqrt(variance);

  return { min: minVal, max: maxVal, mean, median, stdDev };
}

/**
 * Checks that all teams are within ± threshold of the given median.
 */
function checkWithinMedianThreshold(teamTravelDistances, median, threshold) {
  return Object.values(teamTravelDistances).every((dist) => {
    return dist >= median - threshold && dist <= median + threshold;
  });
}

/**
 * Generate fixtures using previous season data to alternate venue.
 */
async function generateFixturesWithPreviousData(
  teams,
  season,
  previousFixtureMap,
  distances,
  distanceMessages,
  restWeeks
) {
  console.log('Generating with previous-season data (stdDev approach)...');

  // 1) Round-robin matchups
  const initialFixtures = generateRoundRobinMatchups(teams);

  // 2) Flip home/away if last year was the same
  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    previousFixtureMap,
    teams
  );

  // 3) Assign to rounds
  let { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams);
  scheduledFixtures = localSearchRoundSwap(scheduledFixtures, teams, distances);

  // 4) Schedule day/time
  const finalScheduled = await scheduleFixturesOptimized(
    scheduledFixtures,
    season,
    distances,
    restWeeks
  );

  // 5) Calculate travel
  const { teamTravelDistances, matchTravelDistances } = calculateTeamTravelDistances(
    finalScheduled,
    distances,
    teams,
    restWeeks
  );

  const total = Object.values(teamTravelDistances).reduce((a, b) => a + b, 0);

  // 6) Build summary
  const summary = buildSummary(
    teams,
    finalScheduled,
    distanceMessages,
    teamTravelDistances,
    matchTravelDistances,
    matchupChanges,
    total,
    restWeeks,
    'StdDev Balanced'
  );

  // 7) Format for DB
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

/**
 * Generate fixtures with no previous-season data.
 */
async function generateFixturesWithoutPreviousData(
  teams,
  season,
  distances,
  distanceMessages,
  restWeeks
) {
  console.log('Generating with NO previous-season data (stdDev approach)...');

  // 1) Round-robin
  const initialFixtures = generateRoundRobinMatchups(teams);

  // 2) Home/away naive approach
  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    null,
    teams
  );

  // 3) Assign to rounds
  let { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams);
  scheduledFixtures = localSearchRoundSwap(scheduledFixtures, teams, distances);

  // 4) schedule times
  const finalScheduled = await scheduleFixturesOptimized(
    scheduledFixtures,
    season,
    distances,
    restWeeks
  );

  // 5) calc travel
  const { teamTravelDistances, matchTravelDistances } = calculateTeamTravelDistances(
    finalScheduled,
    distances,
    teams,
    restWeeks
  );
  const total = Object.values(teamTravelDistances).reduce((a, b) => a + b, 0);

  // 6) summary
  const summary = buildSummary(
    teams,
    finalScheduled,
    distanceMessages,
    teamTravelDistances,
    matchTravelDistances,
    matchupChanges,
    total,
    restWeeks,
    'StdDev Balanced'
  );

  // 7) format
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

/**
 * Generate standard round-robin (6 teams => 5 rounds, 3 matches each).
 */
function generateRoundRobinMatchups(teams) {
  const numTeams = teams.length; // 6
  const totalRounds = numTeams - 1; // 5
  const halfSize = numTeams / 2;   // 3

  // Circle method
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
    // rotate
    list.unshift(list.pop());
  }
  // Flatten
  const allFixtures = [];
  rounds.forEach((roundFixtures, roundIndex) => {
    roundFixtures.forEach((f) => {
      allFixtures.push({
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        round: roundIndex + 1, // placeholder
      });
    });
  });
  return allFixtures;
}

/**
 * Basic random approach: shuffle fixtures, place them in 5 rounds.
 */
function assignFixturesToRoundsOptimized(fixtures, teams) {
  const totalRounds = 5;
  const rounds = Array.from({ length: totalRounds }, () => []);
  const teamRoundMap = {};
  teams.forEach((t) => (teamRoundMap[t._id.toString()] = new Set()));

  const all = shuffleArray([...fixtures]);
  const maxReset = 1000;
  let resetCount = 0;

  while (resetCount < maxReset) {
    // clear
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
      shuffleArray(all); // try again
    }
  }
  console.warn('assignFixturesToRoundsOptimized: reached max reset attempts');
  return { scheduledFixtures: rounds.flat() };
}

/**
 * Decide home/away with last-season alternation if found.
 */
function optimizeHomeAwayAssignments(fixtures, previousFixtureMap, teams) {
  // We'll log changes
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

    let chosen = null;
    let note = '';
    let prevDescription = 'No previous matchup';

    if (previousFixtureMap && previousFixtureMap.has(key)) {
      const prevFix = previousFixtureMap.get(key);
      const prevHomeId = prevFix.homeTeam._id.toString();

      const prevHomeName = getTeamNameById(teams, prevFix.homeTeam._id);
      const prevAwayName = getTeamNameById(teams, prevFix.awayTeam._id);
      prevDescription = `Last Season: ${prevHomeName} vs ${prevAwayName}`;

      // If last-year home == this-year home => flip
      if (prevHomeId === hId) {
        chosen = { homeTeam: fix.awayTeam, awayTeam: fix.homeTeam };
        note = 'Flipped from last year';
      } else {
        chosen = { homeTeam: fix.homeTeam, awayTeam: fix.awayTeam };
        note = 'Maintained (already alternated) from last year';
      }
    } else {
      // naive approach
      chosen = decideHomeAwayNoPrevious(fix, homeCounts, awayCounts);
      note =
        chosen.homeTeam._id.toString() === fix.homeTeam._id.toString()
          ? 'Assigned (original) to manage constraints'
          : 'Assigned (flipped) to manage constraints';
    }

    // increment counts
    const hid2 = chosen.homeTeam._id.toString();
    const aid2 = chosen.awayTeam._id.toString();
    homeCounts[hid2]++;
    awayCounts[aid2]++;

    // attach stadium
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

  // final balancing pass
  balanceHomeAwayCounts(optimized, homeCounts, awayCounts, teams, previousFixtureMap);

  return { optimizedFixtures: optimized, matchupChanges };
}

/**
 * If no last-season data, do naive approach with up to 3 home matches per team.
 */
function decideHomeAwayNoPrevious(fixture, homeCounts, awayCounts) {
  const hId = fixture.homeTeam._id.toString();
  const aId = fixture.awayTeam._id.toString();
  const homeCountH = homeCounts[hId];
  const homeCountA = homeCounts[aId];

  if (homeCountH < 3 && (homeCountA >= 3 || homeCountH <= homeCountA)) {
    // keep
    return { homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam };
  } else {
    // flip
    return { homeTeam: fixture.awayTeam, awayTeam: fixture.homeTeam };
  }
}

/**
 * Balancing pass ensures each team has at least 2 home / 2 away, 
 * doesn't break last-year rule.
 */
function balanceHomeAwayCounts(
  fixtures,
  homeCounts,
  awayCounts,
  teams,
  previousFixtureMap
) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let t of teams) {
      const tid = t._id.toString();
      // if team has <2 home => find a fixture to flip
      if (homeCounts[tid] < 2) {
        for (let fix of fixtures) {
          if (fix.awayTeam._id.toString() === tid) {
            const homeId = fix.homeTeam._id.toString();
            if (homeCounts[homeId] > 2 && awayCounts[tid] > 2) {
              if (canFlipFixture(fix, teams, previousFixtureMap)) {
                homeCounts[homeId]--;
                awayCounts[tid]--;
                homeCounts[tid]++;
                awayCounts[homeId]++;
                const oldHome = fix.homeTeam;
                fix.homeTeam = fix.awayTeam;
                fix.awayTeam = oldHome;
                const st = fix.homeTeam.stadium;
                fix.stadium = st || null;
                fix.location = st ? st.stadiumCity : 'Unknown';
                changed = true;
                break;
              }
            }
          }
        }
      }

      // if team has <2 away => find a fixture to flip
      if (awayCounts[tid] < 2) {
        for (let fix of fixtures) {
          if (fix.homeTeam._id.toString() === tid) {
            const awayId = fix.awayTeam._id.toString();
            if (homeCounts[tid] > 2 && awayCounts[awayId] > 2) {
              if (canFlipFixture(fix, teams, previousFixtureMap)) {
                homeCounts[tid]--;
                awayCounts[awayId]--;
                homeCounts[awayId]++;
                awayCounts[tid]++;
                const oldHome = fix.homeTeam;
                fix.homeTeam = fix.awayTeam;
                fix.awayTeam = oldHome;
                const st = fix.homeTeam.stadium;
                fix.stadium = st || null;
                fix.location = st ? st.stadiumCity : 'Unknown';
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

/**
 * Check if flipping won't violate last-year rule.
 */
function canFlipFixture(fix, teams, previousFixtureMap) {
  const oldHomeId = fix.homeTeam._id.toString();
  const oldAwayId = fix.awayTeam._id.toString();
  const key = [oldHomeId, oldAwayId].sort().join('-');
  if (!previousFixtureMap || !previousFixtureMap.has(key)) {
    return true; // no data => can flip
  }
  const prev = previousFixtureMap.get(key);
  const prevHomeId = prev.homeTeam._id.toString();
  // after flipping => new home = old away
  if (prevHomeId === oldAwayId) {
    // that breaks the alternation
    return false;
  }
  return true;
}

/**
 * Minimal local search: swap two fixtures from different rounds to see if stdDev improves 
 * (we reuse "quickCalculateTravelByTeam" from older code but measure stdDev now).
 */
function localSearchRoundSwap(scheduledFixtures, teams, distances) {
  let bestArrangement = [...scheduledFixtures];
  let bestTravelMap = quickCalculateTravelByTeam(bestArrangement, teams, distances);
  let bestStdDev = computeStats(bestTravelMap).stdDev;

  const maxSwaps = 50;
  let improved = true;
  let attempts = 0;

  while (improved && attempts < maxSwaps) {
    improved = false;
    attempts++;

    let fix1Index = Math.floor(Math.random() * bestArrangement.length);
    let fix2Index = Math.floor(Math.random() * bestArrangement.length);
    if (fix1Index === fix2Index) continue;

    let f1 = bestArrangement[fix1Index];
    let f2 = bestArrangement[fix2Index];
    if (f1.round === f2.round) continue;

    const oldRound1 = f1.round;
    const oldRound2 = f2.round;
    f1.round = oldRound2;
    f2.round = oldRound1;

    let newTravelMap = quickCalculateTravelByTeam(bestArrangement, teams, distances);
    let newStdDev = computeStats(newTravelMap).stdDev;

    if (newStdDev < bestStdDev) {
      bestStdDev = newStdDev;
      bestTravelMap = newTravelMap;
      improved = true;
    } else {
      // revert
      f1.round = oldRound1;
      f2.round = oldRound2;
    }
  }
  return bestArrangement;
}

/**
 * Quick approximate measure ignoring exact date/time. 
 * We then measure by standard deviation in localSearchRoundSwap.
 */
function quickCalculateTravelByTeam(fixtures, teams, distances) {
  const byRound = {};
  fixtures.forEach((f) => {
    if (!byRound[f.round]) byRound[f.round] = [];
    byRound[f.round].push(f);
  });
  // each team starts "at home" => location = teamId
  const loc = {};
  teams.forEach((t) => {
    loc[t._id.toString()] = t._id.toString();
  });

  const travelByTeam = {};
  teams.forEach((t) => {
    travelByTeam[t._id.toString()] = 0;
  });

  const roundsUsed = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  for (let r of roundsUsed) {
    const roundFx = byRound[r];
    for (let fix of roundFx) {
      const awayId = fix.awayTeam._id.toString();
      const homeId = fix.homeTeam._id.toString();

      const distAway = getDistanceFromIDs(loc[awayId], homeId, distances);
      travelByTeam[awayId] += distAway;
      loc[awayId] = homeId;

      // home might travel from some other location to their stadium
      if (loc[homeId] !== homeId) {
        const distHome = getDistanceFromIDs(loc[homeId], homeId, distances);
        travelByTeam[homeId] += distHome;
        loc[homeId] = homeId;
      }
    }
  }
  return travelByTeam;
}

/**
 * Return the distance from ID->ID in precomputed distances.
 */
function getDistanceFromIDs(idA, idB, distances) {
  if (idA === idB) return 0;
  const k1 = `${idA}-${idB}`;
  const k2 = `${idB}-${idA}`;
  return distances[k1] || distances[k2] || 0;
}

/**
 * Date/time assignment with rest weeks. 
 * For more realism, you might add Friday or Sunday. 
 */
async function scheduleFixturesOptimized(fixtures, season, distances, restWeeks = []) {
  const matchTimes = [{ day: 6, timeSlots: ['12:00', '14:00', '16:00'] }];
  const roundsUsed = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);
  let scheduled = [];
  let dateCursor = new Date(`${season}-02-01`);

  for (let r of roundsUsed) {
    const roundFx = fixtures.filter((fx) => fx.round === r);
    let roundCursor = new Date(dateCursor);

    roundFx.sort((a, b) =>
      a.awayTeam.teamName.localeCompare(b.awayTeam.teamName)
    );

    for (let fix of roundFx) {
      let assigned = false;
      while (!assigned) {
        const day = roundCursor.getDay();
        const matchDay = matchTimes.find((mt) => mt.day === day);
        if (matchDay) {
          for (let slot of matchDay.timeSlots) {
            const dtStr = `${roundCursor.toISOString().split('T')[0]}T${slot}:00`;
            const dt = new Date(dtStr);

            const slotTaken = scheduled.some(
              (sf) => sf.date.getTime() === dt.getTime()
            );
            const weekStart = getWeekStartDate(dt);
            const sameWeekTeam = scheduled.some((sf) => {
              const sfWeek = getWeekStartDate(sf.date);
              return (
                sfWeek.getTime() === weekStart.getTime() &&
                (sf.homeTeam._id.toString() === fix.homeTeam._id.toString() ||
                  sf.awayTeam._id.toString() === fix.awayTeam._id.toString())
              );
            });
            if (!slotTaken && !sameWeekTeam) {
              fix.date = dt;
              scheduled.push(fix);
              assigned = true;
              break;
            }
          }
        }
        if (!assigned) {
          roundCursor.setDate(roundCursor.getDate() + 1);
        }
      }
    }
    // after round, increment
    dateCursor.setDate(dateCursor.getDate() + 7);
    if (restWeeks.includes(r)) {
      // skip an extra week
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }
  scheduled.sort((a, b) => a.date - b.date);
  return scheduled;
}

/**
 * Return Sunday of the same week as 'date'.
 */
function getWeekStartDate(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * The main function that calculates travel distances for each fixture in chronological order,
 * forcing teams home during rest weeks & after final round.
 */
function calculateTeamTravelDistances(fixtures, distances, teams, restWeeks) {
  const teamTravelDistances = {};
  teams.forEach((t) => {
    teamTravelDistances[t._id.toString()] = 0;
  });

  const matchTravelLog = [];
  const teamLocations = {};
  teams.forEach((t) => {
    teamLocations[t._id.toString()] = {
      lat: t.stadium.latitude,
      lon: t.stadium.longitude,
    };
  });

  fixtures.sort((a, b) => a.date - b.date);
  let currentRound = 1;

  for (let i = 0; i < fixtures.length; i++) {
    const fix = fixtures[i];
    const round = fix.round;
    // if new round
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

    // away team travels
    const awayId = fix.awayTeam._id.toString();
    const fromLoc = { ...teamLocations[awayId] };
    const toLoc = {
      lat: fix.stadium.latitude,
      lon: fix.stadium.longitude,
    };
    const dist = calculateDistanceBetweenCoordinates(fromLoc, toLoc);
    teamTravelDistances[awayId] += dist;
    matchTravelLog.push({
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

    // home returns from away if needed
    const homeId = fix.homeTeam._id.toString();
    const homeLoc = { ...teamLocations[homeId] };
    const stadiumLoc = {
      lat: fix.stadium.latitude,
      lon: fix.stadium.longitude,
    };
    if (homeLoc.lat !== stadiumLoc.lat || homeLoc.lon !== stadiumLoc.lon) {
      const distHome = calculateDistanceBetweenCoordinates(homeLoc, stadiumLoc);
      teamTravelDistances[homeId] += distHome;
      matchTravelLog.push({
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

  // after final fixture => if it was a rest round, force home
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

  // end-of-season => everyone home
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

  return {
    teamTravelDistances,
    matchTravelDistances: matchTravelLog,
  };
}

/**
 * Force teams home, logging the travel.
 */
function forceAllTeamsHome(
  teams,
  teamLocations,
  teamTravelDistances,
  matchTravelLog,
  approxDate,
  round,
  distances,
  endOfSeason = false
) {
  for (let tm of teams) {
    const tid = tm._id.toString();
    const cur = teamLocations[tid];
    const home = {
      lat: tm.stadium.latitude,
      lon: tm.stadium.longitude,
    };
    if (Math.abs(cur.lat - home.lat) > 0.001 || Math.abs(cur.lon - home.lon) > 0.001) {
      // they're away
      const dist = calculateDistanceBetweenCoordinates(cur, home);
      teamTravelDistances[tid] += dist;
      matchTravelLog.push({
        round,
        teamName: tm.teamName,
        fromTeamName: findTeamNameByLocation(teams, cur),
        from: { ...cur },
        toTeamName: tm.teamName,
        to: { ...home },
        opponent: 'Home',
        distance: dist,
        date: approxDate || null,
        note: endOfSeason
          ? 'Return home end-of-season'
          : 'Forced home due to rest week',
      });
      teamLocations[tid] = { ...home };
    }
  }
}

/**
 * Tolerance-based matching of lat/lon to a team's stadium location.
 */
function findTeamNameByLocation(teams, loc) {
  if (!loc) return 'Unknown';
  const TOLERANCE = 0.01;
  for (let tm of teams) {
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

/** 
 * Get a team's name by ID.
 */
function getTeamNameById(teams, id) {
  const found = teams.find((t) => t._id.toString() === id.toString());
  return found ? found.teamName : 'Unknown Team';
}

/**
 * Build final summary referencing the "StdDev Balanced" approach.
 */
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
  summary.push(`=== ${approachType} Scheduler ===`);
  summary.push('Aiming to minimize standard deviation of travel + enforce threshold near median.');
  summary.push(
    `Using rest weeks: ${restWeeks.length > 0 ? restWeeks.join(', ') : '(none)'}`
  );
  summary.push(`Total Travel Distance (All Teams Combined): ${totalTravelDistance.toFixed(2)} km\n`);

  // Show stats
  const stats = computeStats(teamTravelDistances);
  summary.push(
    `Distances: min=${stats.min.toFixed(2)}, max=${stats.max.toFixed(2)}, median=${stats.median.toFixed(
      2
    )}, mean=${stats.mean.toFixed(2)}, stdDev=${stats.stdDev.toFixed(2)}`
  );
  summary.push(`Threshold = ±${DISTANCE_THRESHOLD} from median => ${stats.median - DISTANCE_THRESHOLD} .. ${stats.median + DISTANCE_THRESHOLD}`);
  summary.push('');

  if (matchupChanges.length) {
    summary.push('--- Home/Away Alternation Changes ---');
    matchupChanges.forEach((mc) => {
      const prev = mc.previousMatchup || 'Unknown vs Unknown';
      const curr = mc.currentMatchup || 'Unknown vs Unknown';
      summary.push(`  Prev: ${prev} => Now: ${curr} [${mc.note}]`);
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
          `R${md.round} | ${md.teamName} travels from ${md.fromTeamName} ` +
            `[${md.from.lat.toFixed(2)},${md.from.lon.toFixed(2)}] ` +
            `to ${md.toTeamName} [${md.to.lat.toFixed(2)},${md.to.lon.toFixed(2)}] => ` +
            `${md.distance.toFixed(2)} km ${note} @ ${dateStr}`
        );
      });
      summary.push(''); // Add a blank line after each round
    });
  summary.push('');

  summary.push('--- Total Travel Distances by Team ---');
  teams.forEach((t) => {
    const d = teamTravelDistances[t._id.toString()] || 0;
    summary.push(`  ${t.teamName}: ${d.toFixed(2)} km`);
  });
  summary.push('');

  // Per-team fixture summary
  summary.push('');
  summary.push('--- Per-Team Fixture Summary ---');
  const teamMap = {};
  teams.forEach((t) => {
    teamMap[t._id.toString()] = { name: t.teamName, matches: [] };
  });
  for (let fx of fixtures) {
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
    const lines = t.matches.map(
      (m) => ` R${m.round} - ${m.homeAway} vs ${m.opp.teamName} (${m.date.toDateString()});`
    );
    summary.push(lines.join('\n'));
    summary.push('');
  });

  return summary;
}

/**
 * Precompute distances for all pairs using haversine, caching them.
 */
async function precomputeDistances(teams) {
  console.log('Precomputing distances via Haversine + caching...');
  const distances = {};
  const distanceMessages = [];

  const teamCoords = {};
  for (let t of teams) {
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

/**
 * Actually get distance from the cache or compute via Haversine.
 */
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

/**
 * Standard Haversine formula in km
 */
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
 * Basic Fisher-Yates shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  generateStandardDeviationBalancedFixtures
};
