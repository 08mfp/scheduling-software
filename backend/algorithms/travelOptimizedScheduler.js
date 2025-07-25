/**
 * @module backend/algorithms/travelOptimizedScheduler
 * @description
 * Generates fixtures while attempting to minimize total travel distance.
 * Key features:
 *   - Up to 1000 attempts (random + minor local search)
 *   - Forcing teams home on rest weeks and after final round
 *   - Tolerance-based location matching for summary logs
 *   - Clear "Last Season" references to avoid undefined vs undefined
 *  @version 3.4.0
 */

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const NodeCache = require('node-cache');
require('dotenv').config();

const distanceCache = new NodeCache({ stdTTL: 86400 });


async function generateTravelOptimizedFixtures(teams, season, restWeeks = []) {
  console.log('===== Starting Travel-Optimized Fixture Generation =====');

  if (teams.length !== 6) {
    throw new Error('Requires exactly 6 teams for travel-optimized scheduling.');
  }

  if (!restWeeks || restWeeks.length === 0) {
    restWeeks = [2, 4];
  }

  const previousSeasonFixtures = await Fixture.find({ season: season - 1 })
    .populate('homeTeam', '_id')
    .populate('awayTeam', '_id')
    .lean();

  const previousFixtureMap = new Map();
  for (let fix of previousSeasonFixtures) {
    const hId = fix.homeTeam._id.toString();
    const aId = fix.awayTeam._id.toString();
    const key = [hId, aId].sort().join('-');
    previousFixtureMap.set(key, fix);
  }

  const { distances, distanceMessages } = await precomputeDistances(teams);

  const maxAttempts = 100000; //! from 10 to 1000
  let bestResult = null;
  let minTravel = Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n=== Attempt ${attempt} ===`);
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

    const total = result.totalTravelDistance;
    console.log(`Total Travel Distance (Attempt ${attempt}): ${total.toFixed(2)} km`);
    if (total < minTravel) {
      minTravel = total;
      bestResult = result;
      console.log(`New best found on attempt ${attempt}.`);
    }
  }

  console.log('===== Travel-Optimized Scheduling Complete =====\n');
  return bestResult;
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

  // 1) Generate round-robin matchups
  const initialFixtures = generateRoundRobinMatchups(teams);

  // 2) Optimize home/away
  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    previousFixtureMap,
    teams
  );

  // 3) Assign to rounds randomly + local search
  let { scheduledFixtures } = assignFixturesToRoundsOptimized(optimizedFixtures, teams);
  scheduledFixtures = localSearchRoundSwap(scheduledFixtures, teams, distances);

  // 4) schedule day/time with rest weeks
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
    restWeeks
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

  return { fixtures: formattedFixtures, summary, totalTravelDistance: total };
}

async function generateFixturesWithoutPreviousData(
  teams,
  season,
  distances,
  distanceMessages,
  restWeeks
) {
  console.log('Generating with NO previous-season data...');

  // 1) Round-robin
  const initialFixtures = generateRoundRobinMatchups(teams);

  // 2) Optimize home/away (if no previousMap then pass null)
  const { optimizedFixtures, matchupChanges } = optimizeHomeAwayAssignments(
    initialFixtures,
    null,
    teams
  );

  // 3) Assign to rounds randomly + local search
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
    restWeeks
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

  return { fixtures: formattedFixtures, summary, totalTravelDistance: total };
}


function generateRoundRobinMatchups(teams) {
  const numTeams = teams.length; 
  const totalRounds = numTeams - 1; 
  const halfSize = numTeams / 2; 

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
  console.warn('assignFixturesToRoundsOptimized: reached max reset attempts');
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

    let chosen = null;
    let note = '';
    let prevDescription = 'No previous matchup';
    if (previousFixtureMap && previousFixtureMap.has(key)) {
      const prevFix = previousFixtureMap.get(key);
      const prevHomeName = getTeamNameById(teams, prevFix.homeTeam._id);
      const prevAwayName = getTeamNameById(teams, prevFix.awayTeam._id);
      prevDescription = `Last Season: ${prevHomeName} vs ${prevAwayName}`;

      const prevHomeId = prevFix.homeTeam._id.toString();
      // If last-year home = this-year home then we flip
      if (prevHomeId === hId) {
        chosen = { homeTeam: fix.awayTeam, awayTeam: fix.homeTeam };
        note = 'Flipped from last year';
      } else {
        chosen = { homeTeam: fix.homeTeam, awayTeam: fix.awayTeam };
        note = 'Maintained (already alternated) from last year';
      }
    } else {
      // if no previous we do normal approach
      chosen = decideHomeAwayNoPrevious(fix, homeCounts, awayCounts);
      note = (chosen.homeTeam._id.toString() === fix.homeTeam._id.toString())
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
      // if team has <2 home then we find a fixture to flip
      if (homeCounts[tid] < 2) {
        for (let fix of fixtures) {
          if (fix.awayTeam._id.toString() === tid) {
            const homeId = fix.homeTeam._id.toString();
            if (homeCounts[homeId] > 2 && awayCounts[tid] > 2) {
              // check if flipping breaks last-year rule
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

      // if team has <2 away then find a fixture to flip
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

function canFlipFixture(fix, teams, previousFixtureMap) {
  const oldHomeId = fix.homeTeam._id.toString();
  const oldAwayId = fix.awayTeam._id.toString();
  const key = [oldHomeId, oldAwayId].sort().join('-');
  if (!previousFixtureMap || !previousFixtureMap.has(key)) {
    return true;
  }
  const prev = previousFixtureMap.get(key);
  const prevHomeId = prev.homeTeam._id.toString();
  if (prevHomeId === oldAwayId) {
    return false;
  }
  return true;
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

function getWeekStartDate(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function localSearchRoundSwap(scheduledFixtures, teams, distances) {
  let bestArrangement = [...scheduledFixtures];
  let bestTravel = quickCalculateTravel(bestArrangement, teams, distances);

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

    const newTravel = quickCalculateTravel(bestArrangement, teams, distances);
    if (newTravel < bestTravel) {
      bestTravel = newTravel;
      improved = true;
    } else {
      // revert
      f1.round = oldRound1;
      f2.round = oldRound2;
    }
  }
  return bestArrangement;
}

function quickCalculateTravel(fixtures, teams, distances) {
  const byRound = {};
  fixtures.forEach((f) => {
    if (!byRound[f.round]) byRound[f.round] = [];
    byRound[f.round].push(f);
  });
  let total = 0;

  const loc = {};
  teams.forEach((t) => {
    loc[t._id.toString()] = t._id.toString();
  });

  const roundsUsed = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  for (let r of roundsUsed) {
    const roundFx = byRound[r];
    for (let fix of roundFx) {
      const awayId = fix.awayTeam._id.toString();
      if (loc[awayId] !== fix.homeTeam._id.toString()) {
        total += getDistanceFromIDs(loc[awayId], fix.homeTeam._id.toString(), distances);
      }
      loc[awayId] = fix.homeTeam._id.toString();

      // if home was away then teams come home
      const homeId = fix.homeTeam._id.toString();
      if (loc[homeId] !== homeId) {
        total += getDistanceFromIDs(loc[homeId], homeId, distances);
        loc[homeId] = homeId;
      }
    }
  }

  return total;
}

function getDistanceFromIDs(idA, idB, distances) {
  if (idA === idB) return 0;
  const k1 = `${idA}-${idB}`;
  const k2 = `${idB}-${idA}`;
  return distances[k1] || distances[k2] || 0;
}

async function scheduleFixturesOptimized(fixtures, season, distances, restWeeks = []) {
  const matchTimes = [
    { day: 5, timeSlots: ['20:00'] },
    { day: 6, timeSlots: ['14:00', '16:00', '18:00', '20:00'] },
    { day: 0, timeSlots: ['14:00', '16:00', '18:00'] },
  ];
  const roundsUsed = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);
  let scheduled = [];
  let dateCursor = new Date(`${season}-02-01`);

  for (let r of roundsUsed) {
    const roundFx = fixtures.filter((fx) => fx.round === r);
    let roundCursor = new Date(dateCursor);

    roundFx.sort((a, b) =>
      a.awayTeam.teamName.localeCompare(b.awayTeam.teamName)
    );

    if (r === 5) {
      const finalSaturday = new Date(`2025-03-15T00:00:00`); 
      const times = ['14:00', '16:00', '18:00'];
      
      roundFx.forEach((fix, idx) => {
        const dtStr = `${finalSaturday.toISOString().split('T')[0]}T${times[idx]}:00`;
        fix.date = new Date(dtStr);
      });
      
      scheduled.push(...roundFx);
      continue;
    }

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
    dateCursor.setDate(dateCursor.getDate() + 7);
    if (restWeeks.includes(r)) {
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }
  scheduled.sort((a, b) => a.date - b.date);
  return scheduled;
}

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

  return {
    teamTravelDistances,
    matchTravelDistances: matchTravelLog,
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

function getTeamNameById(teams, id) {
  const found = teams.find((t) => t._id.toString() === id.toString());
  return found ? found.teamName : 'Unknown Team';
}

function buildSummary(
  teams,
  fixtures,
  distanceMessages,
  teamTravelDistances,
  matchTravelDistances,
  matchupChanges,
  totalTravelDistance,
  restWeeks
) {
  const summary = [];
  summary.push('=== Travel-Optimized Scheduler ===');
  summary.push('Minimizing total travel distance with rest-week forced returns home.');
  summary.push(
    `Using rest weeks: ${restWeeks.length > 0 ? restWeeks.join(', ') : '(none)'}`
  );
  summary.push(`Total Travel Distance: ${totalTravelDistance.toFixed(2)} km\n`);

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

  Object.keys(groupedByRound).sort((a, b) => a - b).forEach((round) => {
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
    summary.push('');
  });
  summary.push('');

  summary.push('--- Total Travel Distances by Team ---');
  teams.forEach((t) => {
    const d = teamTravelDistances[t._id.toString()] || 0;
    summary.push(`  ${t.teamName}: ${d.toFixed(2)} km`);
  });
  summary.push('');

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
      round: fx.round % 5 + 1,
      homeAway: 'Home',
      opp: fx.awayTeam,
      date: fx.date,
    });
    teamMap[aId].matches.push({
      round: fx.round % 5 + 1,
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
      (m) =>
        ` R${m.round} - ${m.homeAway} vs ${m.opp.teamName} (${m.date.toDateString()});`
    );
    summary.push(lines.join('\n'));
    summary.push(''); 
  });

  return summary;
}

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
          const msg = `Distance: ${tA.teamName} vs ${tB.teamName} => ${dist.toFixed(
            2
          )} km`;
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

module.exports = {
  generateTravelOptimizedFixtures,
};