/***************************************************
 * SIX NATIONS SCHEDULER - IMPROVED VERSION
 * 
 * Incorporates new constraints:
 *   - No 3 consecutive away (rest breaks the streak).
 *   - 2–3 or 3–2 home/away distribution only (4–1 or 5–0 disallowed).
 *   - Last-year flips enforced (otherwise infeasible).
 *   - Broadcast constraints => soft penalty:
 *       * Limit Friday-night matches (penalty if exceeded).
 *       * Round 5 => "Super Saturday" timeslots: 14:00, 16:00, 18:00
 *   - Competitiveness ordering => penalty if big matches
 *     happen too early, plus special penalty if #1 vs #2
 *     not in Round 5 final slot (18:00).
 ***************************************************/

const FRIDAY_NIGHT_LIMIT = 2;       // e.g. allow up to 2 total Friday-night matches
const FRIDAY_NIGHT_PENALTY = 5.0;   // penalty per extra Friday-night fixture beyond limit
const TOP2_MISSED_SLOT_PENALTY = 15.0; // penalty if #1 vs #2 is NOT in round 5 at 18:00

function getIdString(docId) {
  if (!docId) return "";
  if (typeof docId === "object" && docId.buffer instanceof Uint8Array) {
    return Buffer.from(docId.buffer).toString("hex");
  }
  if (typeof docId.toHexString === "function") {
    return docId.toHexString();
  }
  return docId.toString();
}

/**
 * calculateDistance: Uses the Haversine formula to compute the distance (in km)
 * between two coordinates.
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth radius in km
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fisher-Yates shuffle.
 */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate all pairings (Team i vs Team j) for 6 teams.
 */
function generateAllMatchups(teams) {
  console.log("[generateAllMatchups] Generating all pairwise matchups...");
  const matchups = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      // Example measure: 12 - sum-of-ranks => bigger match if ranks are low
      const competitiveness = 12 - (teams[i].teamRanking + teams[j].teamRanking);
      console.log(
        `  -> Matchup: ${teams[i].teamName} vs ${teams[j].teamName}, competitiveness=${competitiveness}`
      );
      matchups.push({
        teamA: teams[i],
        teamB: teams[j],
        competitiveness,
      });
    }
  }
  console.log(`  Total matchups: ${matchups.length}\n`);
  return matchups;
}

/**
 * Precompute pairwise distances for all teams
 */
function precomputeTeamDistances(teams) {
  console.log("[precomputeTeamDistances] Computing distances among teams...");
  const distances = {};
  const messages = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const idA = getIdString(teams[i]._id);
      const idB = getIdString(teams[j]._id);
      const locA = {
        latitude: teams[i].stadium.latitude,
        longitude: teams[i].stadium.longitude,
      };
      const locB = {
        latitude: teams[j].stadium.latitude,
        longitude: teams[j].stadium.longitude,
      };
      const d = calculateDistance(locA, locB);
      distances[`${idA}-${idB}`] = d;
      distances[`${idB}-${idA}`] = d;
      const msg = `Distance between ${teams[i].teamName} and ${teams[j].teamName} = ${d.toFixed(
        2
      )} km`;
      messages.push(msg);
      console.log("  " + msg);
    }
  }
  console.log("Done computing distances.\n");
  return { distances, messages };
}

/**
 * Generate all rest-week patterns (8 slots => 5 match weekends, 3 rest).
 * If totalSlots = 8 and we want 5 'true', then 3 are 'false'.
 */
function generateRestWeekPatterns(matchWeeks = 5, totalSlots = 8) {
  console.log(
    `[generateRestWeekPatterns] Generating patterns for matchWeeks=${matchWeeks}, totalSlots=${totalSlots}...`
  );
  const patterns = [];

  function backtrack(idx, used, current) {
    if (idx === totalSlots) {
      if (used === matchWeeks) patterns.push(current.slice());
      return;
    }
    // choose match weekend if used < matchWeeks
    if (used < matchWeeks) {
      current.push(true);
      backtrack(idx + 1, used + 1, current);
      current.pop();
    }
    // rest
    current.push(false);
    backtrack(idx + 1, used, current);
    current.pop();
  }
  backtrack(0, 0, []);
  console.log(`  Generated ${patterns.length} rest-week patterns.\n`);
  return patterns;
}

/**
 * Attempt to assign the 15 matchups into 5 match weekends (rounds),
 * given a rest-week pattern. We'll store not only roundIndex (0..4)
 * but also the actual weekSlotIndex from the pattern for feasibility checks
 * with rest resets.
 */
function backtrackingAssignRoundsWithPattern(teams, matchups, pattern) {
  console.log("[backtrackingAssignRoundsWithPattern] Attempting round assignment...");
  const matchSlotIndices = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i]) matchSlotIndices.push(i);
  }
  if (matchSlotIndices.length !== 5) {
    console.log("  Invalid pattern => not 5 match weekends.\n");
    return { feasible: false, rounds: [] };
  }
  console.log(`  pattern => matchSlotIndices = ${matchSlotIndices.join(",")}`);

  // We'll store assigned fixtures in 5 sub-arrays
  const roundFixtures = [[], [], [], [], []];
  const teamRounds = {};
  teams.forEach((t) => {
    teamRounds[getIdString(t._id)] = new Set();
  });

  // Sort matchups by competitiveness descending => prefer big matches in later rounds
  const sorted = matchups.slice().sort((a, b) => b.competitiveness - a.competitiveness);

  function backtrack(idx) {
    if (idx === sorted.length) {
      // all assigned? ensure each round has exactly 3
      for (let r = 0; r < 5; r++) {
        if (roundFixtures[r].length !== 3) return false;
      }
      return true;
    }
    const matchup = sorted[idx];
    const idA = getIdString(matchup.teamA._id);
    const idB = getIdString(matchup.teamB._id);

    // We'll attempt rounds in "later first" for big matches => [4,3,2,1,0]
    const candidateRounds = [4, 3, 2, 1, 0];
    for (let r of candidateRounds) {
      // If round is full, skip
      if (roundFixtures[r].length >= 3) continue;
      // if either team is already in round r, skip
      if (teamRounds[idA].has(r) || teamRounds[idB].has(r)) continue;

      // Accept
      roundFixtures[r].push({
        ...matchup,
        roundIndex: r,
        // Store actual week slot from pattern for feasibility checks
        weekSlotIndex: matchSlotIndices[r],
      });
      teamRounds[idA].add(r);
      teamRounds[idB].add(r);

      if (backtrack(idx + 1)) return true;

      // revert
      roundFixtures[r].pop();
      teamRounds[idA].delete(r);
      teamRounds[idB].delete(r);
    }
    return false;
  }

  const feasible = backtrack(0);
  console.log(`  => Round assignment feasible? ${feasible}\n`);
  return { feasible, rounds: roundFixtures, matchSlotIndices };
}

/**
 * Flatten the 2D array of rounds into a single fixture list
 */
function flattenRounds(rounds) {
  console.log("[flattenRounds] Flattening assigned rounds into a single fixture list...");
  const fixtures = [];
  for (let r = 0; r < rounds.length; r++) {
    for (let fx of rounds[r]) {
      // fx already has roundIndex, weekSlotIndex
      fixtures.push(fx);
    }
  }
  console.log(`  Flattened total fixtures => ${fixtures.length}\n`);
  return fixtures;
}

/**
 * unifyFixtureTeams: Re-link each fixture's team object from the teams array
 */
function unifyFixtureTeams(fixtures, teams) {
  console.log("[unifyFixtureTeams] Re-linking fixture team objects...");
  const teamMap = {};
  teams.forEach((t) => {
    teamMap[getIdString(t._id)] = t;
  });
  fixtures.forEach((fx) => {
    fx.teamA = teamMap[getIdString(fx.teamA._id)];
    fx.teamB = teamMap[getIdString(fx.teamB._id)];
  });
  console.log("Done re-linking teams.\n");
}

/**
 * Checks if any team has 3 consecutive away matches,
 * but rest weeks reset the consecutive counter.
 * 
 * We'll gather away "weekSlotIndex" for each team, then
 * walk them in ascending order. If the difference between
 * consecutive away slots is exactly 1, that means
 * back-to-back away *with no rest in between*. If difference
 * is > 1, we consider there was a rest or enough gap to reset.
 */
function hasThreeAwayInARowConsideringRest(fixtures, teams) {
  const awaySlots = {};
  teams.forEach((t) => {
    awaySlots[getIdString(t._id)] = [];
  });

  for (let fx of fixtures) {
    const idA = getIdString(fx.teamA._id);
    const idB = getIdString(fx.teamB._id);
    // homeAssignment=1 => A is home, B is away
    // homeAssignment=0 => B is home, A is away
    if (fx.homeAssignment === 1) {
      awaySlots[idB].push(fx.weekSlotIndex);
    } else {
      awaySlots[idA].push(fx.weekSlotIndex);
    }
  }

  for (const tid in awaySlots) {
    awaySlots[tid].sort((a, b) => a - b);
    let consecutive = 1;
    for (let i = 1; i < awaySlots[tid].length; i++) {
      // Check if consecutive
      if (awaySlots[tid][i] === awaySlots[tid][i - 1] + 1) {
        consecutive++;
        if (consecutive >= 3) {
          return true;
        }
      } else {
        // reset the consecutive counter
        consecutive = 1;
      }
    }
  }
  return false;
}

/**
 * isFeasible: Overall feasibility check with new rules:
 *   - 5 rounds, each with 3 fixtures => each team once/round
 *   - partialLocks
 *   - lastYear flips
 *   - no 3 consecutive away (rest resets)
 *   - home/away distribution (no 4–1 or 5–0)
 */
function isFeasible(fixtures, teams, partialLocks = {}, lastYearMap = {}) {
  // 1) each of the 5 rounds must have 3 fixtures
  const roundMap = {};
  for (let fx of fixtures) {
    const r = fx.roundIndex;
    if (!roundMap[r]) roundMap[r] = [];
    roundMap[r].push(fx);
  }
  for (let r = 0; r < 5; r++) {
    if (!roundMap[r] || roundMap[r].length !== 3) return false;
    // check repeated teams
    const teamSet = new Set();
    for (let fx of roundMap[r]) {
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      if (teamSet.has(idA) || teamSet.has(idB)) return false;
      teamSet.add(idA);
      teamSet.add(idB);
    }
  }

  // 2) partial locks + last-year flips
  for (let fx of fixtures) {
    const roundNum = fx.roundIndex + 1;
    const idA = getIdString(fx.teamA._id);
    const idB = getIdString(fx.teamB._id);

    // partial lock
    if (partialLocks[idA] && typeof partialLocks[idA][roundNum] === "number") {
      if (partialLocks[idA][roundNum] !== fx.homeAssignment) return false;
    }
    if (partialLocks[idB] && typeof partialLocks[idB][roundNum] === "number") {
      const forcedHome = partialLocks[idB][roundNum] === 1 ? 0 : 1;
      if (fx.homeAssignment !== forcedHome) return false;
    }

    // lastYear => if A hosted B => B must host => assignment=0
    if (lastYearMap[idA] && lastYearMap[idA][idB]) {
      // meaning last year A was home vs B => so this year B must be home => fx.homeAssignment=0
      if (fx.homeAssignment !== 0) return false;
    }
    if (lastYearMap[idB] && lastYearMap[idB][idA]) {
      if (fx.homeAssignment !== 1) return false;
    }
  }

  // 3) No 3 consecutive away, factoring rest
  if (hasThreeAwayInARowConsideringRest(fixtures, teams)) return false;

  // 4) Home/Away distribution => no 4–1 or 5–0
  //    If a team has 4 or 5 home matches, that's invalid
  //    If a team has 0 or 1 home match, also invalid
  const homeCount = {};
  teams.forEach((t) => {
    homeCount[getIdString(t._id)] = 0;
  });
  fixtures.forEach((fx) => {
    const idA = getIdString(fx.teamA._id);
    const idB = getIdString(fx.teamB._id);
    if (fx.homeAssignment === 1) {
      // A home
      homeCount[idA]++;
    } else {
      // B home
      homeCount[idB]++;
    }
  });
  for (const tid in homeCount) {
    const h = homeCount[tid];
    if (h === 4 || h === 5 || h === 0 || h === 1) return false;
  }

  return true;
}

/**
 * assignHomeAway:
 *   1) Start random or from partial locks
 *   2) Enforce lastYear flips if feasible
 *   3) If flipping kills feasibility, revert
 *   4) Local flipping for cost improvements
 */
function assignHomeAway(teams, fixtures, distances, weights, partialLocks, lastYearMap) {
  console.log("[assignHomeAway] Assigning initial home/away...");
  // 1) random or partial locked
  for (let fx of fixtures) {
    const r = fx.roundIndex + 1;
    const idA = getIdString(fx.teamA._id);
    const idB = getIdString(fx.teamB._id);

    // partial lock?
    const lockA =
      partialLocks[idA] && typeof partialLocks[idA][r] === "number"
        ? partialLocks[idA][r]
        : null;
    const lockB =
      partialLocks[idB] && typeof partialLocks[idB][r] === "number"
        ? partialLocks[idB][r]
        : null;
    if (lockA === 1) {
      fx.homeAssignment = 1;
      continue;
    } else if (lockA === 0) {
      fx.homeAssignment = 0;
      continue;
    } else if (lockB === 1) {
      // B locked home => A away
      fx.homeAssignment = 0;
      continue;
    } else if (lockB === 0) {
      // B locked away => A home
      fx.homeAssignment = 1;
      continue;
    }

    // else random
    fx.homeAssignment = Math.random() < 0.5 ? 1 : 0;
  }

  // 2) Attempt last-year flips
  let changed = true;
  let passCount = 0;
  const maxPasses = fixtures.length * 2;
  while (changed && passCount < maxPasses) {
    changed = false;
    passCount++;
    for (let i = 0; i < fixtures.length; i++) {
      const fx = fixtures[i];
      const oldAssign = fx.homeAssignment;
      const r = fx.roundIndex + 1;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);

      // skip partial locks
      if (
        (partialLocks[idA] && typeof partialLocks[idA][r] === "number") ||
        (partialLocks[idB] && typeof partialLocks[idB][r] === "number")
      ) {
        continue;
      }

      // if last year A hosted B => B must host => assignment=0
      if (lastYearMap[idA] && lastYearMap[idA][idB]) {
        if (oldAssign !== 0) {
          fx.homeAssignment = 0;
          if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
            fx.homeAssignment = oldAssign;
          } else {
            changed = true;
          }
        }
      } else if (lastYearMap[idB] && lastYearMap[idB][idA]) {
        if (oldAssign !== 1) {
          fx.homeAssignment = 1;
          if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
            fx.homeAssignment = oldAssign;
          } else {
            changed = true;
          }
        }
      }
    }
  }

  // check feasibility
  if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
    console.log("  => Not feasible after enforcing last-year flips, returning cost=Infinity.\n");
    return { fixtures, cost: Infinity };
  }

  // 3) local flipping to reduce cost (only if it remains feasible)
  let currentCost = computeHomeAwayCost(fixtures, teams, distances, weights);
  let improved = true;
  let iteration = 0;
  const MAX_ITER = 300;
  while (improved && iteration < MAX_ITER) {
    improved = false;
    iteration++;
    for (let i = 0; i < fixtures.length; i++) {
      const fx = fixtures[i];
      const r = fx.roundIndex + 1;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);

      // skip partial or forced flips
      if (lastYearMap[idA] && lastYearMap[idA][idB]) continue;
      if (lastYearMap[idB] && lastYearMap[idB][idA]) continue;
      if (partialLocks[idA] && typeof partialLocks[idA][r] === "number") continue;
      if (partialLocks[idB] && typeof partialLocks[idB][r] === "number") continue;

      const oldAssign = fx.homeAssignment;
      fx.homeAssignment = oldAssign === 1 ? 0 : 1;

      if (isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
        const newCost = computeHomeAwayCost(fixtures, teams, distances, weights);
        if (newCost < currentCost) {
          currentCost = newCost;
          improved = true;
        } else {
          fx.homeAssignment = oldAssign;
        }
      } else {
        fx.homeAssignment = oldAssign;
      }
    }
  }

  return { fixtures, cost: currentCost };
}

/**
 * computeCostBreakdown:
 *   - balance penalty (small, or 0 if we already enforce 2–3 or 3–2 strictly)
 *   - consecutive away penalty
 *   - max travel
 *   - competitiveness ordering
 *   - broadcast constraints penalty
 */
function computeCostBreakdown(fixtures, teams, distances, weights = {}) {
  const {
    w1 = 1.0,  // weighting for consecutive away penalty
    w2 = 0.1,  // weighting for max travel
    w3 = 1.0,  // weighting for competitiveness ordering
    wFri = 2.0 // weighting for broadcast/Friday penalty
  } = weights;

  let consecutiveAwayPenalty = 0;
  let maxTravel = 0;
  let compPenalty = 0;
  let fridayNightCount = 0; // track # of Friday-night fixtures
  let top2missedSlotPenalty = 0;

  // Identify top-2 teams by rank (lowest rank # is best)
  const sortedByRank = teams.slice().sort((a, b) => a.teamRanking - b.teamRanking);
  const topTeamId = getIdString(sortedByRank[0]._id);
  const secondTeamId = getIdString(sortedByRank[1]._id);

  // Build data structures
  const travelDist = {};
  const roundsRecord = {}; // for consecutive away
  teams.forEach((t) => {
    const tid = getIdString(t._id);
    travelDist[tid] = 0;
    roundsRecord[tid] = [];
  });

  // For competitiveness penalty, if a fixture (i,j) with competitiveness = C
  // is placed in round r => add penalty C * (4 - r) or something similar.
  // We'll also do an extra check for top2-match in round 5 final slot.
  for (let fx of fixtures) {
    const { teamA, teamB, homeAssignment, competitiveness, date, roundIndex } = fx;
    const idA = getIdString(teamA._id);
    const idB = getIdString(teamB._id);

    const d = distances[`${idA}-${idB}`] || distances[`${idB}-${idA}`] || 0;
    const isAhome = (homeAssignment === 1);

    // travel
    if (isAhome) {
      travelDist[idB] += 2 * d;
      roundsRecord[idA].push({ roundIndex, isAway: false });
      roundsRecord[idB].push({ roundIndex, isAway: true });
    } else {
      travelDist[idA] += 2 * d;
      roundsRecord[idB].push({ roundIndex, isAway: false });
      roundsRecord[idA].push({ roundIndex, isAway: true });
    }

    // competitiveness penalty => bigger matches placed earlier => more penalty
    // for example: penalty = competitiveness * (4 - roundIndex)
    compPenalty += competitiveness * (4 - roundIndex);

    // check if this is the top2 match
    const isTop2Match =
      (idA === topTeamId && idB === secondTeamId) ||
      (idB === topTeamId && idA === secondTeamId);

    if (isTop2Match) {
      // If not in round 5's final slot (18:00), add penalty
      // Round 5 => roundIndex=4
      if (roundIndex !== 4 || !date || date.getHours() !== 18) {
        top2missedSlotPenalty = TOP2_MISSED_SLOT_PENALTY;
      }
    }

    // broadcast => check if date is Friday night (day=5, hour=20)
    if (date) {
      // getDay() => 0=Sunday, 1=Monday, ... 5=Friday, 6=Saturday
      // if date is Friday at 20:00
      if (date.getDay() === 5 && date.getHours() === 20) {
        fridayNightCount++;
      }
    }
  }

  // consecutive away penalty
  // We'll just penalize each pair of consecutive away matches for each team
  for (let tid in roundsRecord) {
    roundsRecord[tid].sort((a, b) => a.roundIndex - b.roundIndex);
    for (let i = 1; i < roundsRecord[tid].length; i++) {
      const prev = roundsRecord[tid][i - 1];
      const curr = roundsRecord[tid][i];
      if (prev.isAway && curr.isAway && curr.roundIndex === prev.roundIndex + 1) {
        consecutiveAwayPenalty += 1; // e.g. 1 point per consecutive pair
      }
    }
  }

  // max travel
  for (let tid in travelDist) {
    if (travelDist[tid] > maxTravel) {
      maxTravel = travelDist[tid];
    }
  }

  // broadcast penalty => if we exceed FRIDAY_NIGHT_LIMIT
  let broadcastPenalty = 0;
  if (fridayNightCount > FRIDAY_NIGHT_LIMIT) {
    broadcastPenalty = (fridayNightCount - FRIDAY_NIGHT_LIMIT) * FRIDAY_NIGHT_PENALTY;
  }

  const totalCost =
    w1 * consecutiveAwayPenalty +
    w2 * maxTravel +
    w3 * compPenalty +
    wFri * broadcastPenalty +
    top2missedSlotPenalty; // add top2 special penalty unweighted, or you can scale it

  return {
    consecutiveAwayPenalty,
    maxTravel,
    compPenalty,
    totalCost,
    broadcastPenalty,
    top2missedSlotPenalty,
    travelDist,
  };
}

function computeHomeAwayCost(fixtures, teams, distances, weights) {
  const breakdown = computeCostBreakdown(fixtures, teams, distances, weights);
  return breakdown.totalCost;
}

/**
 * scheduleDates: for a chosen rest pattern, find the 5 'true' => match weekends
 *   - Rounds 1..4 => Fri 20:00, Sat 14:00, Sun 14:00
 *   - Round 5 => "Super Saturday" timeslots => 14:00, 16:00, 18:00
 */
function scheduleDates(fixtures, pattern, season) {
  console.log("[scheduleDates] Assigning dates/times based on the rest pattern...");
  const matchSlots = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i]) matchSlots.push(i);
  }
  if (matchSlots.length !== 5) {
    console.log("  Pattern doesn't have 5 match weekends => null.\n");
    return null;
  }
  // find first friday in feb
  const baseDate = new Date(`${season}-02-01T00:00:00`);
  while (baseDate.getDay() !== 5) {
    // 5 => Friday
    baseDate.setDate(baseDate.getDate() + 1);
  }

  const roundsDateMap = {};
  for (let r = 1; r <= 5; r++) {
    const slotIdx = matchSlots[r - 1];
    const weekendStart = new Date(baseDate);
    weekendStart.setDate(baseDate.getDate() + slotIdx * 7);

    // For Rounds 1..4, let's do Fri 20:00, Sat 14:00, Sun 14:00
    // For Round 5 => "Super Saturday": 14:00, 16:00, 18:00
    if (r < 5) {
      const fri = new Date(weekendStart);
      fri.setHours(20, 0, 0, 0);
      const sat = new Date(fri.getTime() + 24 * 3600 * 1000);
      sat.setHours(14, 0, 0, 0);
      const sun = new Date(fri.getTime() + 2 * 24 * 3600 * 1000);
      sun.setHours(14, 0, 0, 0);
      roundsDateMap[r] = [fri, sat, sun];
    } else {
      // Round 5 => Super Saturday
      const dayStart = new Date(weekendStart);
      // Make sure it's Saturday for final round (if we want "Saturday" specifically)
      // For simplicity, let's just ensure dayStart is Saturday:
      while (dayStart.getDay() !== 6) {
        dayStart.setDate(dayStart.getDate() + 1);
      }
      // times: 14:00, 16:00, 18:00
      const t1 = new Date(dayStart); t1.setHours(14, 0, 0, 0);
      const t2 = new Date(dayStart); t2.setHours(16, 0, 0, 0);
      const t3 = new Date(dayStart); t3.setHours(18, 0, 0, 0);
      roundsDateMap[r] = [t1, t2, t3];
    }
  }

  // Assign each round's 3 fixtures to these timeslots
  const roundMap = {};
  for (let fx of fixtures) {
    const r = fx.roundIndex + 1;
    if (!roundMap[r]) roundMap[r] = [];
    roundMap[r].push(fx);
  }

  for (let r = 1; r <= 5; r++) {
    const arr = roundMap[r] || [];
    if (arr.length !== 3) {
      console.log(`  Round ${r} doesn't have 3 fixtures => scheduling fail.\n`);
      return null;
    }
    // just assign them in order
    for (let i = 0; i < arr.length; i++) {
      arr[i].date = roundsDateMap[r][i];
    }
  }
  console.log("  => Successfully assigned date/time for each round!\n");
  return fixtures;
}

/**
 * create a neighbor by either swapping roundIndex or flipping home/away.
 * This is used in local search (sim annealing).
 */
function makeNeighbor(schedule, teams, distances, weights, partialLocks, lastYearMap) {
  const newSched = JSON.parse(JSON.stringify(schedule));
  const fixtures = newSched.fixtures;
  if (fixtures.length < 2) return null;

  const moveType = Math.random() < 0.5 ? "swapRounds" : "flipHomeAway";
  if (moveType === "swapRounds") {
    const idx1 = Math.floor(Math.random() * fixtures.length);
    let idx2 = Math.floor(Math.random() * fixtures.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * fixtures.length);
    }
    const f1 = fixtures[idx1];
    const f2 = fixtures[idx2];
    if (f1.roundIndex === f2.roundIndex) return null; // no effect

    const tmp = f1.roundIndex;
    f1.roundIndex = f2.roundIndex;
    f2.roundIndex = tmp;

    // Also swap their weekSlotIndex if needed
    const tmpSlot = f1.weekSlotIndex;
    f1.weekSlotIndex = f2.weekSlotIndex;
    f2.weekSlotIndex = tmpSlot;

  } else {
    // flip home/away for one fixture
    const idx = Math.floor(Math.random() * fixtures.length);
    const fx = fixtures[idx];
    const r = fx.roundIndex + 1;
    const idA = getIdString(fx.teamA._id);
    const idB = getIdString(fx.teamB._id);

    // skip partial or forced flips
    if (lastYearMap[idA] && lastYearMap[idA][idB]) return null;
    if (lastYearMap[idB] && lastYearMap[idB][idA]) return null;
    if (partialLocks[idA] && typeof partialLocks[idA][r] === "number") return null;
    if (partialLocks[idB] && typeof partialLocks[idB][r] === "number") return null;

    fx.homeAssignment = fx.homeAssignment === 1 ? 0 : 1;
  }

  // check feasibility
  if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
    return null;
  }
  const newCost = computeHomeAwayCost(fixtures, teams, distances, weights);
  newSched.totalCost = newCost;
  return newSched;
}

/**
 * runLocalSearch: optional final polish with a simple simulated annealing
 */
function runLocalSearch(schedule, teams, distances, weights, partialLocks, lastYearMap) {
  console.log("[runLocalSearch] Starting local search (sim annealing)...");
  let current = JSON.parse(JSON.stringify(schedule));
  let bestCost = current.totalCost;
  console.log(`  Starting cost = ${bestCost.toFixed(2)}`);
  let temperature = 5.0;
  const coolingRate = 0.95;
  const MAX_ITER = 200;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const neighbor = makeNeighbor(current, teams, distances, weights, partialLocks, lastYearMap);
    if (!neighbor) {
      // no valid neighbor => keep cooling
      temperature *= coolingRate;
      continue;
    }
    if (neighbor.totalCost < bestCost) {
      console.log(
        `  [Iter ${iter}] Improvement => cost ${bestCost.toFixed(2)} -> ${neighbor.totalCost.toFixed(2)}`
      );
      current = neighbor;
      bestCost = neighbor.totalCost;
    } else {
      const delta = neighbor.totalCost - bestCost;
      if (Math.random() < Math.exp(-delta / temperature)) {
        console.log(
          `  [Iter ${iter}] Accepting worse => cost +${delta.toFixed(
            2
          )} due to temp=${temperature.toFixed(2)}`
        );
        current = neighbor;
        bestCost = neighbor.totalCost;
      }
    }
    temperature *= coolingRate;
  }
  console.log(`Done local search. Final cost = ${bestCost.toFixed(2)}\n`);
  current.totalCost = bestCost;
  return current;
}

/**
 * buildFinalSummary => produce detailed lines about cost, travel, consecutive away, etc.
 * Incorporates mention of broadcast penalty, top2 penalty, etc.
 */
function buildFinalSummary(schedule, teams) {
  console.log("[buildFinalSummary] Building final summary info...");
  const summary = [];
  const { fixtures, totalCost, distances } = schedule;
  const breakdown = computeCostBreakdown(fixtures, teams, distances, {});
  const {
    consecutiveAwayPenalty,
    maxTravel,
    compPenalty,
    broadcastPenalty,
    top2missedSlotPenalty,
    travelDist,
  } = breakdown;

  summary.push(`Best schedule found with total cost: ${totalCost.toFixed(2)}`);
  summary.push("Cost breakdown:");
  summary.push(`  - Consecutive Away Penalty: ${consecutiveAwayPenalty.toFixed(2)}`);
  summary.push(`  - Max Travel (km):         ${maxTravel.toFixed(2)}`);
  summary.push(`  - Competitiveness Penalty: ${compPenalty.toFixed(2)}`);
  summary.push(`  - Broadcast Penalty:       ${broadcastPenalty.toFixed(2)}`);
  summary.push(`  - Top2 Missed Slot Penalty:${top2missedSlotPenalty.toFixed(2)}`);
  summary.push(`  => Weighted total:         ${totalCost.toFixed(2)}`);
  summary.push("");

  // Summaries of travel
  let totalTravel = 0;
  teams.forEach((t) => {
    totalTravel += travelDist[getIdString(t._id)];
  });
  summary.push("Per-Team Total Travel (km):");
  teams.forEach((t) => {
    const tid = getIdString(t._id);
    summary.push(`  - ${t.teamName}: ${travelDist[tid].toFixed(2)} km`);
  });
  summary.push(`Total Travel for all teams: ${totalTravel.toFixed(2)} km\n`);

  // Chronological fixture listing
  const sorted = fixtures.slice().sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return a.date - b.date;
  });
  summary.push("Final Fixtures (chronological):");
  for (let fx of sorted) {
    const homeTeam = (fx.homeAssignment === 1) ? fx.teamA : fx.teamB;
    const awayTeam = (fx.homeAssignment === 1) ? fx.teamB : fx.teamA;
    if (!fx.date) {
      summary.push(
        `  Round ${fx.roundIndex + 1}: (No date) ${homeTeam.teamName} vs ${awayTeam.teamName}`
      );
      continue;
    }
    const dateStr = fx.date.toISOString().split("T")[0];
    const timeStr = fx.date.toTimeString().split(" ")[0].slice(0, 5);
    summary.push(
      `  Round ${fx.roundIndex + 1} - ${dateStr} ${timeStr}: ${homeTeam.teamName} vs ${awayTeam.teamName}`
    );
  }
  summary.push("");

  console.log("[buildFinalSummary] Summary built.\n");
  return summary;
}

/**
 * The main scheduler function
 */
async function generateComprehensiveFairFixtures(
  teams,
  season,
  requestedRestCount = null,
  weights = {},
  options = {}
) {
  console.log(
    `\n=== generateComprehensiveFairFixtures ===\nSeason=${season}, requestedRestCount=${requestedRestCount}, weights=`,
    weights,
    "options=",
    options
  );

  // in case teams are from mongoose docs
  teams = teams.map((t) => (t.toObject ? t.toObject() : t));
  if (teams.length !== 6) {
    throw new Error("Exactly 6 teams are required for the Six Nations.");
  }

  const partialLocks = options.partialLocks || {};
  const lastYearHome = options.previousYearHome || {};
  const runLocalSearchFlag = !!options.runLocalSearch;

  console.log("[Scheduler] Precomputing distances...");
  const { distances, messages } = precomputeTeamDistances(teams);

  console.log("[Scheduler] Generating 15 matchups...");
  const matchups = generateAllMatchups(teams);

  console.log("[Scheduler] Building rest patterns...");
  let patterns = [];
  const allPatterns = generateRestWeekPatterns(5, 8);
  if (typeof requestedRestCount === "number") {
    patterns = allPatterns.filter(
      (p) => p.filter((x) => !x).length === requestedRestCount
    );
  } else {
    patterns = allPatterns;
  }
  console.log(`  => We have ${patterns.length} patterns to try.\n`);

  let bestSchedule = null;
  let bestCost = Infinity;

  for (let pIndex = 0; pIndex < patterns.length; pIndex++) {
    const pattern = patterns[pIndex];
    console.log(`== Checking pattern #${pIndex} => ${pattern}`);

    // 1) round assignment
    const roundRes = backtrackingAssignRoundsWithPattern(teams, matchups, pattern);
    if (!roundRes.feasible) {
      console.log("   => Round assignment infeasible, skipping pattern.\n");
      continue;
    }

    // 2) flatten
    let fixtures = flattenRounds(roundRes.rounds);
    unifyFixtureTeams(fixtures, teams);

    // 3) home/away
    const haResult = assignHomeAway(
      teams,
      fixtures,
      distances,
      weights,
      partialLocks,
      lastYearHome
    );
    fixtures = haResult.fixtures;
    if (!isFinite(haResult.cost)) {
      console.log("   => Could not assign home/away feasibly, skip.\n");
      continue;
    }

    // 4) date scheduling
    const scheduled = scheduleDates(fixtures, pattern, season);
    if (!scheduled || scheduled.length !== 15) {
      console.log("   => Date scheduling fail (didn't get 15 fixtures), skip.\n");
      continue;
    }

    // 5) cost
    const costVal = computeHomeAwayCost(scheduled, teams, distances, weights);
    if (!isFinite(costVal)) {
      console.log("   => cost=Infinity => skip.\n");
      continue;
    }
    console.log(`   => Pattern cost: ${costVal.toFixed(2)}`);

    let candidate = {
      fixtures: scheduled,
      pattern,
      totalCost: costVal,
      distances,
      messages,
    };

    // 6) optional local search
    if (runLocalSearchFlag) {
      console.log("   => Running local search on this candidate...");
      const refined = runLocalSearch(
        candidate,
        teams,
        distances,
        weights,
        partialLocks,
        lastYearHome
      );
      if (refined && refined.totalCost < candidate.totalCost) {
        candidate = refined;
        console.log(
          `     => local search improved cost => ${candidate.totalCost.toFixed(2)}`
        );
      }
    }

    if (candidate.totalCost < bestCost) {
      console.log(
        `   => Found new best cost => ${candidate.totalCost.toFixed(2)} (old best=${bestCost.toFixed(2)})`
      );
      bestCost = candidate.totalCost;
      bestSchedule = candidate;
    }
    console.log("");
  }

  if (!bestSchedule) {
    console.log("[Scheduler] No feasible schedule found for any pattern!\n");
    return {
      fixtures: [],
      summary: ["No feasible schedule found."],
      bestCost: null,
    };
  }

  console.log(`[Scheduler] Best cost found = ${bestCost.toFixed(2)} => building summary...\n`);
  const summary = buildFinalSummary(bestSchedule, teams);

  // format final for returned structure
  const formatted = bestSchedule.fixtures.map((fx) => ({
    round: fx.roundIndex + 1,
    date: fx.date,
    homeTeam: fx.homeAssignment === 1 ? fx.teamA._id : fx.teamB._id,
    awayTeam: fx.homeAssignment === 1 ? fx.teamB._id : fx.teamA._id,
    stadium:
      fx.homeAssignment === 1
        ? fx.teamA.stadium?._id || null
        : fx.teamB.stadium?._id || null,
    location:
      fx.homeAssignment === 1
        ? fx.teamA.stadium?.stadiumCity || "Unknown"
        : fx.teamB.stadium?.stadiumCity || "Unknown",
    season,
  }));

  return {
    fixtures: formatted,
    summary,
    bestCost: bestSchedule.totalCost,
  };
}

/**
 * Optional multi-run wrapper
 */
async function generateComprehensiveFairFixturesWithRetries(
  teams,
  season,
  requestedRestCount = null,
  weights = {},
  options = {},
  runs = 10
) {
  console.log("[generateComprehensiveFairFixturesWithRetries] Starting multi-run...");
  let globalBest = null;
  let globalBestCost = Infinity;

  for (let i = 1; i <= runs; i++) {
    console.log(`\n=== SCHEDULER RUN #${i} of ${runs} ===`);
    const result = await generateComprehensiveFairFixtures(
      teams,
      season,
      requestedRestCount,
      weights,
      options
    );
    if (result.bestCost !== null && result.bestCost < globalBestCost) {
      globalBestCost = result.bestCost;
      globalBest = result;
      console.log(`  => Found new best cost => ${globalBestCost.toFixed(2)}`);
    }
  }

  if (!globalBest) {
    console.log("No feasible schedule found after all retries.\n");
    return {
      fixtures: [],
      summary: ["No feasible schedule found after all retries."],
      bestCost: null,
    };
  }

  console.log(
    `\nDone with all runs. Best cost found => ${globalBest.bestCost?.toFixed(2) ?? globalBestCost.toFixed(2)}`
  );
  return globalBest;
}

// Export the scheduler
module.exports = {
  generateComprehensiveFairFixtures,
  generateComprehensiveFairFixturesWithRetries,
};
