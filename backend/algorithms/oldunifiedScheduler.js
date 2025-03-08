/***************************************************
 * SIX NATIONS SCHEDULER - ADVANCED VERSION (WITH EXTRA LOGS)
 *  - Enumerate Rest Patterns (0-3)
 *  - Constraint Satisfaction via Backtracking
 *  - Partial Last-Year Flips (try to flip, revert if infeasible)
 *  - Cost Function (Travel, Consecutive Away, Balance, Competitiveness)
 *  - Local Search for Optimization
 *  - Final Date/Time Assignment
 *  - Detailed Summary
 ***************************************************/

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
        // Simple measure: 12 - sum-of-ranks
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
   * Backtracking to assign 15 matchups into 5 match weekends (3 each).
   * Then we label them rounds 1..5. 
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
  
    // sort matchups by competitiveness descending => prefer big matches in later rounds
    const sorted = matchups.slice().sort((a, b) => b.competitiveness - a.competitiveness);
  
    function backtrack(idx) {
      if (idx === sorted.length) {
        // all assigned?
        for (let r = 0; r < 5; r++) {
          if (roundFixtures[r].length !== 3) return false;
        }
        return true;
      }
      const matchup = sorted[idx];
      const idA = getIdString(matchup.teamA._id);
      const idB = getIdString(matchup.teamB._id);
  
      const candidateRounds = [4, 3, 2, 1, 0];
      for (let r of candidateRounds) {
        if (roundFixtures[r].length >= 3) continue;
        if (teamRounds[idA].has(r) || teamRounds[idB].has(r)) continue;
  
        roundFixtures[r].push(matchup);
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
    return { feasible, rounds: roundFixtures };
  }
  
  /**
   * Flatten the 2D array of rounds into a single fixture list
   */
  function flattenRounds(rounds) {
    console.log("[flattenRounds] Flattening assigned rounds into a single fixture list...");
    const fixtures = [];
    for (let r = 0; r < rounds.length; r++) {
      for (let fx of rounds[r]) {
        fixtures.push({ ...fx, roundIndex: r });
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
   * Check if any team has 3 consecutive away matches
   */
  function hasThreeAwayInARowFinal(fixtures, teams) {
    const awayPattern = {};
    teams.forEach((t) => {
      awayPattern[getIdString(t._id)] = [];
    });
    for (let fx of fixtures) {
      const round = fx.roundIndex;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      if (fx.homeAssignment === 1) {
        // B away
        awayPattern[idB].push(round);
      } else {
        awayPattern[idA].push(round);
      }
    }
    for (const tid in awayPattern) {
      awayPattern[tid].sort((a, b) => a - b);
      let consecutive = 1;
      for (let i = 1; i < awayPattern[tid].length; i++) {
        if (awayPattern[tid][i] === awayPattern[tid][i - 1] + 1) {
          consecutive++;
          if (consecutive >= 3) return true;
        } else {
          consecutive = 1;
        }
      }
    }
    return false;
  }
  
  /**
   * Overall feasibility check:
   *   - 5 rounds, each with 3 fixtures => each team once/round
   *   - partialLocks
   *   - lastYear flips
   *   - no 3 consecutive away
   *   - each team = 5 matches
   */
  function isFeasible(fixtures, teams, partialLocks = {}, lastYearMap = {}) {
    // console.log("Checking feasibility...");
    // each round has exactly 3
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
  
    // partial locks + last-year flips
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
        if (fx.homeAssignment !== 0) return false;
      }
      if (lastYearMap[idB] && lastYearMap[idB][idA]) {
        if (fx.homeAssignment !== 1) return false;
      }
    }
  
    // no 3 consecutive away
    if (hasThreeAwayInARowFinal(fixtures, teams)) return false;
  
    // each team => 5 matches
    const teamCount = {};
    teams.forEach((t) => {
      teamCount[getIdString(t._id)] = 0;
    });
    for (let fx of fixtures) {
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      teamCount[idA]++;
      teamCount[idB]++;
    }
    for (const tid in teamCount) {
      if (teamCount[tid] !== 5) return false;
    }
    // console.log("Feasible!");
    return true;
  }
  
  /**
   * Attempt home/away assignment. 
   *   1) Start random
   *   2) Attempt lastYear flips if feasible
   *   3) If flipping kills feasibility, revert
   *   4) Then local flipping for cost improvements
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
        console.log(
          `  Team ${fx.teamA.teamName} locked as HOME in round ${r}`
        );
        fx.homeAssignment = 1;
        continue;
      } else if (lockA === 0) {
        console.log(
          `  Team ${fx.teamA.teamName} locked as AWAY in round ${r}`
        );
        fx.homeAssignment = 0;
        continue;
      } else if (lockB === 1) {
        console.log(
          `  Team ${fx.teamB.teamName} locked as HOME in round ${r} => A is away`
        );
        fx.homeAssignment = 0;
        continue;
      } else if (lockB === 0) {
        console.log(
          `  Team ${fx.teamB.teamName} locked as AWAY in round ${r} => A is home`
        );
        fx.homeAssignment = 1;
        continue;
      }
  
      // else random
      fx.homeAssignment = Math.random() < 0.5 ? 1 : 0;
      console.log(
        `  No partial lock => random assignment for ${fx.teamA.teamName} vs ${fx.teamB.teamName} => homeAssignment=${fx.homeAssignment}`
      );
    }
  
    // 2) Attempt last-year flips
    let changed = true;
    let passCount = 0;
    const maxPasses = fixtures.length * 2;
    console.log("\n[assignHomeAway] Trying to enforce last-year flips if possible...");
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
              console.log(
                `  * Forced flip: ${fx.teamA.teamName} vs ${fx.teamB.teamName} => B-home (last year A hosted B)`
              );
              changed = true;
            }
          }
        } else if (lastYearMap[idB] && lastYearMap[idB][idA]) {
          // B hosted A => A must host => assignment=1
          if (oldAssign !== 1) {
            fx.homeAssignment = 1;
            if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
              fx.homeAssignment = oldAssign;
            } else {
              console.log(
                `  * Forced flip: ${fx.teamA.teamName} vs ${fx.teamB.teamName} => A-home (last year B hosted A)`
              );
              changed = true;
            }
          }
        }
      }
    }
    console.log("Done enforcing last-year flips.\n");
  
    // check feasibility
    console.log("[assignHomeAway] Checking feasibility after flips...");
    if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
      console.log("  => Not feasible, returning cost=Infinity.\n");
      return { fixtures, cost: Infinity };
    }
    console.log("  => Feasible so far.\n");
  
    // 3) local flipping to reduce cost
    console.log("[assignHomeAway] Starting local flipping to reduce cost...");
    let currentCost = computeHomeAwayCost(fixtures, teams, distances, weights);
    console.log(`  initial cost = ${currentCost.toFixed(2)}`);
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
        const newAssign = oldAssign === 1 ? 0 : 1;
        fx.homeAssignment = newAssign;
        if (isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
          const newCost = computeHomeAwayCost(fixtures, teams, distances, weights);
          if (newCost < currentCost) {
            console.log(
              `  [Improvement] flipping fixture #${i} (${fx.teamA.teamName} vs ${
                fx.teamB.teamName
              }) => cost ${currentCost.toFixed(2)} -> ${newCost.toFixed(2)}`
            );
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
    console.log(`Done local flipping after ${iteration} iterations, final cost=${currentCost.toFixed(2)}\n`);
    return { fixtures, cost: currentCost };
  }
  
  /**
   * computeCostBreakdown: 
   *  - balance penalty
   *  - consecutive away penalty
   *  - max travel
   *  - competitiveness ordering
   */
  function computeCostBreakdown(fixtures, teams, distances, weights = {}) {
    const { w1 = 1.0, w2 = 2.0, w3 = 0.1, w4 = 1.0 } = weights;
  
    let balancePenalty = 0;
    let consecutiveAwayPenalty = 0;
    let maxTravel = 0;
    let compPenalty = 0;
  
    const homeCount = {};
    const awayCount = {};
    const travelDist = {};
    const teamRoundsRecord = {};
  
    teams.forEach((t) => {
      const tid = getIdString(t._id);
      homeCount[tid] = 0;
      awayCount[tid] = 0;
      travelDist[tid] = 0;
      teamRoundsRecord[tid] = [];
    });
  
    for (let fx of fixtures) {
      const r = fx.roundIndex;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      const d = distances[`${idA}-${idB}`] || distances[`${idB}-${idA}`] || 0;
  
      if (fx.homeAssignment === 1) {
        homeCount[idA]++;
        awayCount[idB]++;
        travelDist[idB] += 2 * d;
        teamRoundsRecord[idA].push({
          roundIndex: r,
          isAway: false,
          opp: idB,
          dist: d,
        });
        teamRoundsRecord[idB].push({
          roundIndex: r,
          isAway: true,
          opp: idA,
          dist: d,
        });
      } else {
        homeCount[idB]++;
        awayCount[idA]++;
        travelDist[idA] += 2 * d;
        teamRoundsRecord[idB].push({
          roundIndex: r,
          isAway: false,
          opp: idA,
          dist: d,
        });
        teamRoundsRecord[idA].push({
          roundIndex: r,
          isAway: true,
          opp: idB,
          dist: d,
        });
      }
  
      // competitiveness penalty => prefer bigger matches in later rounds
      compPenalty += fx.competitiveness * (4 - r);
    }
  
    // home/away balance => prefer exactly 2.5 => 2 or 3
    teams.forEach((t) => {
      const tid = getIdString(t._id);
      balancePenalty += Math.abs(homeCount[tid] - 2.5);
    });
  
    // consecutive away penalty
    for (let t of teams) {
      const tid = getIdString(t._id);
      teamRoundsRecord[tid].sort((a, b) => a.roundIndex - b.roundIndex);
      let consecutive = 0;
      for (let i = 0; i < teamRoundsRecord[tid].length; i++) {
        if (!teamRoundsRecord[tid][i].isAway) {
          consecutive = 0;
        } else {
          if (i === 0) {
            consecutive = 1;
          } else {
            const prev = teamRoundsRecord[tid][i - 1];
            if (
              prev.isAway &&
              teamRoundsRecord[tid][i].roundIndex === prev.roundIndex + 1
            ) {
              consecutive++;
            } else {
              consecutive = 1;
            }
          }
          if (consecutive >= 2) {
            consecutiveAwayPenalty++;
          }
        }
      }
    }
  
    // max travel
    for (let t of teams) {
      const tid = getIdString(t._id);
      if (travelDist[tid] > maxTravel) {
        maxTravel = travelDist[tid];
      }
    }
  
    const totalCost =
      w1 * balancePenalty + w2 * consecutiveAwayPenalty + w3 * maxTravel + w4 * compPenalty;
  
    return {
      balancePenalty,
      consecutiveAwayPenalty,
      maxTravel,
      compPenalty,
      totalCost,
      teamRoundsRecord,
      travelDist,
    };
  }
  
  function computeHomeAwayCost(fixtures, teams, distances, weights) {
    const breakdown = computeCostBreakdown(fixtures, teams, distances, weights);
    return breakdown.totalCost;
  }
  
  /**
   * scheduleDates: for a chosen rest pattern, find the 5 'true' => match weekends
   *    then assign day/time => fri, sat, sun
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
      baseDate.setDate(baseDate.getDate() + 1);
    }
    const roundsDateMap = {};
    for (let r = 1; r <= 5; r++) {
      const slotIdx = matchSlots[r - 1];
      const weekendStart = new Date(baseDate);
      weekendStart.setDate(baseDate.getDate() + slotIdx * 7);
  
      const friday = new Date(weekendStart);
      friday.setHours(20, 0, 0, 0);
      const saturday = new Date(friday.getTime() + 24 * 3600 * 1000);
      saturday.setHours(14, 0, 0, 0);
      const sunday = new Date(friday.getTime() + 2 * 24 * 3600 * 1000);
      sunday.setHours(14, 0, 0, 0);
  
      roundsDateMap[r] = { friday, saturday, sunday };
    }
  
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
      arr[0].date = roundsDateMap[r].friday;
      arr[1].date = roundsDateMap[r].saturday;
      arr[2].date = roundsDateMap[r].sunday;
    }
    console.log("  => Successfully assigned date/time for each round!\n");
    return fixtures;
  }
  
  /**
   * create a neighbor by either swapping roundIndex or flipping home/away
   */
  function makeNeighbor(schedule, teams, distances, weights, partialLocks, lastYearMap) {
    // console.log("[makeNeighbor] building a neighbor schedule...");
    const newSched = JSON.parse(JSON.stringify(schedule));
    const fixtures = newSched.fixtures;
    if (fixtures.length < 2) return null;
  
    const moveType = Math.random() < 0.5 ? "swapRounds" : "flipHomeAway";
    // console.log(`  moveType=${moveType}`);
  
    if (moveType === "swapRounds") {
      const idx1 = Math.floor(Math.random() * fixtures.length);
      let idx2 = Math.floor(Math.random() * fixtures.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * fixtures.length);
      }
      const f1 = fixtures[idx1];
      const f2 = fixtures[idx2];
      if (f1.roundIndex === f2.roundIndex) return null;
  
      const tmp = f1.roundIndex;
      f1.roundIndex = f2.roundIndex;
      f2.roundIndex = tmp;
    } else {
      const idx = Math.floor(Math.random() * fixtures.length);
      const fx = fixtures[idx];
      const roundNum = fx.roundIndex + 1;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
  
      // skip partial lock or forced flips
      if (lastYearMap[idA] && lastYearMap[idA][idB]) return null;
      if (lastYearMap[idB] && lastYearMap[idB][idA]) return null;
      if (partialLocks[idA] && typeof partialLocks[idA][roundNum] === "number") return null;
      if (partialLocks[idB] && typeof partialLocks[idB][roundNum] === "number") return null;
  
      fx.homeAssignment = fx.homeAssignment === 1 ? 0 : 1;
    }
  
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
    return current;
  }
  
  /**
   * buildFinalSummary => produce detailed lines about cost, travel, consecutive away, etc.
   */
  function buildFinalSummary(schedule, teams) {
    console.log("[buildFinalSummary] Building final summary info...");
    const summary = [];
    const { fixtures, totalCost, distances } = schedule;
    const breakdown = computeCostBreakdown(fixtures, teams, distances, {});
    const {
      balancePenalty,
      consecutiveAwayPenalty,
      maxTravel,
      compPenalty,
      totalCost: finalCost,
      teamRoundsRecord,
      travelDist,
    } = breakdown;
  
    summary.push(`Best schedule found with total cost: ${finalCost.toFixed(2)}`);
    summary.push("Cost function breakdown:");
    summary.push(`  - Home/Away Balance Penalty: ${balancePenalty.toFixed(2)}`);
    summary.push(`  - Consecutive Away Penalty:  ${consecutiveAwayPenalty.toFixed(2)}`);
    summary.push(`  - Max Travel (km):           ${maxTravel.toFixed(2)}`);
    summary.push(`  - Competitiveness Penalty:   ${compPenalty.toFixed(2)}`);
    summary.push(`  => Weighted total:           ${finalCost.toFixed(2)}`);
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
  
    // Round-by-Round travel
    const roundTravel = {};
    for (let r = 0; r < 5; r++) {
      roundTravel[r] = {};
    }
    for (let fx of fixtures) {
      const rid = fx.roundIndex;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      const d = distances[`${idA}-${idB}`] || distances[`${idB}-${idA}`] || 0;
      if (fx.homeAssignment === 1) {
        roundTravel[rid][idB] = (roundTravel[rid][idB] || 0) + 2 * d;
      } else {
        roundTravel[rid][idA] = (roundTravel[rid][idA] || 0) + 2 * d;
      }
    }
    for (let r = 0; r < 5; r++) {
      summary.push(`Round ${r + 1} Travel:`);
      for (let tm of teams) {
        const tid = getIdString(tm._id);
        if (roundTravel[r][tid]) {
          summary.push(
            `   * ${tm.teamName} traveled ${roundTravel[r][tid].toFixed(2)} km`
          );
        }
      }
      summary.push("");
    }
  
    // Detailed away matches
    summary.push("Detailed Travel (which team traveled where):");
    const sorted = fixtures.slice().sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date - b.date;
    });
    for (let fx of sorted) {
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      const d = distances[`${idA}-${idB}`] || distances[`${idB}-${idA}`] || 0;
      const homeIsA = fx.homeAssignment === 1;
      const city = homeIsA
        ? fx.teamA.stadium?.stadiumCity || "Unknown"
        : fx.teamB.stadium?.stadiumCity || "Unknown";
      if (homeIsA) {
        summary.push(
          `  * ${fx.teamB.teamName} traveled to ${fx.teamA.teamName}'s stadium in ${city} [${d.toFixed(
            2
          )} km one-way, 2x for return]`
        );
      } else {
        summary.push(
          `  * ${fx.teamA.teamName} traveled to ${fx.teamB.teamName}'s stadium in ${city} [${d.toFixed(
            2
          )} km one-way, 2x for return]`
        );
      }
    }
    summary.push("");
  
    summary.push("Detailed Consecutive Away / Round-Trip Explanation:");
    summary.push(
      "  (Each away fixture is counted as a round-trip from home. Consecutive away can add penalty.)"
    );
    teams.forEach((tm) => {
      const tid = getIdString(tm._id);
      const recs = teamRoundsRecord[tid].slice().sort((a, b) => a.roundIndex - b.roundIndex);
  
      summary.push(`\n--- ${tm.teamName} ---`);
      let lastAwayRound = null;
      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i];
        if (!rec.isAway) {
          summary.push(
            `  Round ${rec.roundIndex + 1}: HOME fixture (no travel cost).`
          );
          continue;
        }
        let note = "";
        if (lastAwayRound !== null && rec.roundIndex === lastAwayRound + 1) {
          note = " [CONSECUTIVE AWAY => triggers penalty]";
        }
        const oppTeam = teams.find((x) => getIdString(x._id) === rec.opp);
        const oppName = oppTeam ? oppTeam.teamName : "???";
  
        summary.push(
          `  Round ${rec.roundIndex + 1}: AWAY vs ${oppName}, one-way=${rec.dist.toFixed(
            2
          )} km, round-trip=${(2 * rec.dist).toFixed(2)} km${note}`
        );
        lastAwayRound = rec.roundIndex;
      }
    });
    summary.push("");
  
    // final chronological
    summary.push("Final Fixtures (chronological):");
    for (let fx of sorted) {
      if (!fx.date) {
        summary.push(
          `  Round ${fx.roundIndex + 1}: (No date) ${fx.teamA.teamName} vs ${fx.teamB.teamName}`
        );
        continue;
      }
      const dateStr = fx.date.toISOString().split("T")[0];
      const timeStr = fx.date.toTimeString().split(" ")[0].slice(0, 5);
      const homeTeam = fx.homeAssignment === 1 ? fx.teamA : fx.teamB;
      const awayTeam = fx.homeAssignment === 1 ? fx.teamB : fx.teamA;
      summary.push(
        `  Round ${fx.roundIndex + 1} - ${dateStr} ${timeStr}: ${homeTeam.teamName} vs ${awayTeam.teamName}`
      );
    }
  
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
      const haResult = assignHomeAway(teams, fixtures, distances, weights, partialLocks, lastYearHome);
      fixtures = haResult.fixtures;
      if (!isFinite(haResult.cost)) {
        console.log("   => Could not assign home/away feasibly, skip.\n");
        continue;
      }
  
      // 4) date scheduling
      const scheduled = scheduleDates(fixtures, pattern, season);
      if (!scheduled || scheduled.length !== 15) {
        console.log("   => Date scheduling fail (didn't get 15), skip.\n");
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
        const refined = runLocalSearch(candidate, teams, distances, weights, partialLocks, lastYearHome);
        if (refined && refined.totalCost < candidate.totalCost) {
          candidate = refined;
          console.log(`     => local search improved cost => ${candidate.totalCost.toFixed(2)}`);
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
  
    // format final
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
  
  // Export
  module.exports = {
    generateComprehensiveFairFixtures,
    generateComprehensiveFairFixturesWithRetries,
  };
  