/**
 * @module backend/algorithms/unifiedScheduler
 * @description
Features:
 *  - Standard constraints (no 3 away in a row, 2–3 home distribution, flips from last year)
 *  - Additional cost terms (travel, fairness, timeslot, short-gap)
 *  - Competitiveness formula (interest = ALPHA*(6 - diff) + BETA*(12 - sum))
 *  - Broadcast constraints (Fri limit, R5 super saturday, #1 vs #2 final slot)
 *  - Pruning & memoization in backtracking
 *  - Hybrid local search with bigger “jump” (reassign round) + adaptive
 *  - Multiple permutations in round assignment (desc, asc, random)
 *  - Multi-run function for large repeated attempts
 *  - Fully expanded buildFinalSummary with user-facing logs
 * @version 3.4.0
 */

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
  
  function getRankDiff(m) {
    return Math.abs(m.teamA.teamRanking - m.teamB.teamRanking);
  }
  
  function getRankSum(m) {
    return m.teamA.teamRanking + m.teamB.teamRanking;
  }
  
  function calculateDistance(coord1, coord2) {
    const R = 6371;
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
  
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  
  /**
   * Given a match (with teamA/teamB) and alpha/beta, compute
   * interest = alpha*(6 - diff) + beta*(12 - sum).
   */
  function getMatchInterest(m, alpha = 1, beta = 2) {
    const diff = getRankDiff(m);
    const sum = getRankSum(m);
    return alpha * (6 - diff) + beta * (12 - sum);
  }
  
  function generateAllMatchups(teams, alpha = 1, beta = 2) {
    const matchups = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const interest = getMatchInterest(
          { teamA: teams[i], teamB: teams[j] },
          alpha,
          beta
        );
        matchups.push({
          teamA: teams[i],
          teamB: teams[j],
          competitiveness: interest,
        });
      }
    }
    return matchups;
  }
  
  function precomputeTeamDistances(teams) {
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
      }
    }
    return { distances, messages };
  }
  
  function generateRestWeekPatterns(matchWeeks = 5, totalSlots = 8) {
    const patterns = [];
    function backtrack(idx, used, current) {
      if (idx === totalSlots) {
        if (used === matchWeeks) patterns.push(current.slice());
        return;
      }
      if (used < matchWeeks) {
        current.push(true);
        backtrack(idx + 1, used + 1, current);
        current.pop();
      }
      current.push(false);
      backtrack(idx + 1, used, current);
      current.pop();
    }
    backtrack(0, 0, []);
    return patterns;
  }
  
  function flattenRounds(rounds) {
    const fixtures = [];
    for (let r = 0; r < rounds.length; r++) {
      for (let fx of rounds[r]) {
        fixtures.push(fx);
      }
    }
    return fixtures;
  }
  
  function unifyFixtureTeams(fixtures, teams) {
    const teamMap = {};
    teams.forEach((t) => {
      teamMap[getIdString(t._id)] = t;
    });
    fixtures.forEach((fx) => {
      fx.teamA = teamMap[getIdString(fx.teamA._id)];
      fx.teamB = teamMap[getIdString(fx.teamB._id)];
    });
  }
  
  function hasThreeAwayInARowConsideringRest(fixtures, teams) {
    const awaySlots = {};
    teams.forEach((t) => {
      awaySlots[getIdString(t._id)] = [];
    });
  
    for (let fx of fixtures) {
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
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
        if (awaySlots[tid][i] === awaySlots[tid][i - 1] + 1) {
          consecutive++;
          if (consecutive >= 3) {
            return true;
          }
        } else {
          consecutive = 1;
        }
      }
    }
    return false;
  }
  
  function isFeasible(fixtures, teams, partialLocks = {}, lastYearMap = {}) {
    // 1) 5 rounds x 3 fixtures
    const roundMap = {};
    for (let fx of fixtures) {
      const r = fx.roundIndex;
      if (!roundMap[r]) roundMap[r] = [];
      roundMap[r].push(fx);
    }
    for (let r = 0; r < 5; r++) {
      if (!roundMap[r] || roundMap[r].length !== 3) return false;
      const teamSet = new Set();
      for (let fx of roundMap[r]) {
        const idA = getIdString(fx.teamA._id);
        const idB = getIdString(fx.teamB._id);
        // no overlap
        if (teamSet.has(idA) || teamSet.has(idB)) {
          return false;
        }
        teamSet.add(idA);
        teamSet.add(idB);
      }
    }
  
    // 2) partial locks + last-year flips
    for (let fx of fixtures) {
      const roundNum = fx.roundIndex + 1;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
  
      // partial locks
      if (partialLocks[idA] && typeof partialLocks[idA][roundNum] === "number") {
        if (partialLocks[idA][roundNum] !== fx.homeAssignment) return false;
      }
      if (partialLocks[idB] && typeof partialLocks[idB][roundNum] === "number") {
        // if B is locked as 1 => B is home => assignment=0 => conflict
        const forcedHome = partialLocks[idB][roundNum] === 1 ? 0 : 1;
        if (fx.homeAssignment !== forcedHome) return false;
      }
  
      // last-year flips
      if (lastYearMap[idA] && lastYearMap[idA][idB]) {
        // A was home => B must be home => assignment=0
        if (fx.homeAssignment !== 0) return false;
      }
      if (lastYearMap[idB] && lastYearMap[idB][idA]) {
        if (fx.homeAssignment !== 1) return false;
      }
    }
  
    // 3) no 3 away in a row
    if (hasThreeAwayInARowConsideringRest(fixtures, teams)) return false;
  
    // 4) 2–3 or 3–2 distribution
    const homeCount = {};
    teams.forEach((t) => {
      homeCount[getIdString(t._id)] = 0;
    });
    fixtures.forEach((fx) => {
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
      if (fx.homeAssignment === 1) {
        homeCount[idA]++;
      } else {
        homeCount[idB]++;
      }
    });
    for (const tid in homeCount) {
      const h = homeCount[tid];
      // must be exactly 2 or 3 => if it's 4,5,0,1 then fail this solition
      if (h === 4 || h === 5 || h === 0 || h === 1) {
        return false;
      }
    }
  
    return true;
  }
  
  function computeShortGapPenalty(fixtures, teams, minGapDays) {
    const teamFixtures = {};
    teams.forEach((t) => {
      teamFixtures[getIdString(t._id)] = [];
    });
  
    fixtures.forEach((fx) => {
      const homeId =
        fx.homeAssignment === 1
          ? getIdString(fx.teamA._id)
          : getIdString(fx.teamB._id);
      const awayId =
        fx.homeAssignment === 1
          ? getIdString(fx.teamB._id)
          : getIdString(fx.teamA._id);
      teamFixtures[homeId].push(fx);
      teamFixtures[awayId].push(fx);
    });
  
    let penalty = 0;
    for (let tid in teamFixtures) {
      const list = teamFixtures[tid].sort((a, b) => (a.date || 0) - (b.date || 0));
      for (let i = 0; i < list.length - 1; i++) {
        if (!list[i].date || !list[i + 1].date) continue;
        const gapDays = (list[i + 1].date - list[i].date) / (1000 * 3600 * 24);
        if (gapDays < minGapDays) {
          penalty += minGapDays - gapDays;
        }
      }
    }
    return penalty;
  }
  

  function getTimeslotScore(date, competitiveness) {
    if (!date) return 0;
    const day = date.getDay(); // 0=Sun,1=Mon,...,,6=Sat
    const hour = date.getHours();
    let score = 0;
  
    if (day === 5 && hour === 20) {
      score += 3;
    }
    // Saturday 20:00 => reward big matches
    else if (day === 6 && hour === 20) {
      if (competitiveness > 5) score -= 2;
    }
    // Sunday 18:00 => prime slot
    else if (day === 0 && hour === 18) {
      if (competitiveness > 5) score -= 2;
    }
  
    return score;
  }
  

  function computeCostBreakdown(fixtures, teams, distances, weights = {}) {
    for (const fx of fixtures) {
      if (fx.date && typeof fx.date === "string") {
        fx.date = new Date(fx.date);
      }
    }
  
    let {
      w1 = 1.0, // consecutive away penalty
      w2 = 0.1, // max travel
      w3 = 1.0, // competitiveness
      wFri = 2.0, // broadcast penalty
      wTravelTotal = 0.05,
      wTravelFair = 0.05,
      wSlot = 0.5,
      wShortGap = 0.5,
      minGapDays = 6,
  
      ALPHA = 1,
      BETA = 2,
      FRIDAY_NIGHT_LIMIT = 2,
      FRIDAY_NIGHT_PENALTY = 5.0,
      TOP2_MISSED_SLOT_PENALTY = 15.0,
    } = weights;
  
    let consecutiveAwayPenalty = 0;
    let maxTravel = 0;
    let compPenalty = 0;
    let fridayNightCount = 0;
    let top2missedSlotPenalty = 0;
    let timeslotPenalty = 0;
  
    const travelDist = {};
    teams.forEach((t) => {
      travelDist[getIdString(t._id)] = 0;
    });
  
    // find top-2 for final slot penalty
    const sortedByRank = teams.slice().sort((a, b) => a.teamRanking - b.teamRanking);
    const topTeamId = getIdString(sortedByRank[0]._id);
    const secondTeamId = getIdString(sortedByRank[1]._id);
  
    const roundsRecord = {};
    teams.forEach((t) => {
      roundsRecord[getIdString(t._id)] = [];
    });
  
    for (let fx of fixtures) {
      const { teamA, teamB, homeAssignment, competitiveness, date, roundIndex } = fx;
      const idA = getIdString(teamA._id);
      const idB = getIdString(teamB._id);
      const d = distances[`${idA}-${idB}`] || 0;
  
      // track travel
      if (homeAssignment === 1) {
        travelDist[idB] += 2 * d;
        roundsRecord[idA].push({ roundIndex, isAway: false });
        roundsRecord[idB].push({ roundIndex, isAway: true });
      } else {
        travelDist[idA] += 2 * d;
        roundsRecord[idB].push({ roundIndex, isAway: false });
        roundsRecord[idA].push({ roundIndex, isAway: true });
      }
  
      // competitiveness penalty => if bigger matches are  earlier => compPenalty += competitiveness * (4 - roundIndex)
      compPenalty += competitiveness * (4 - roundIndex);
  
      // top2 => if not Round5 at 18:00 then penalty
      const isTop2 =
        (idA === topTeamId && idB === secondTeamId) ||
        (idB === topTeamId && idA === secondTeamId);
      if (isTop2) {
        // roundIndex=4 => Round 5 => must be 18:00
        if (roundIndex !== 4 || !date || date.getHours() !== 18) {
          top2missedSlotPenalty = TOP2_MISSED_SLOT_PENALTY;
        }
      }
  
      // broadcast penalty => Fri 20:00
      if (date && date.getDay() === 5 && date.getHours() === 20) {
        fridayNightCount++;
      }
  
      // timeslot penalty
      timeslotPenalty += getTimeslotScore(date, competitiveness);
    }
  
    // consecutive away penalty
    for (let tid in roundsRecord) {
      roundsRecord[tid].sort((a, b) => a.roundIndex - b.roundIndex);
      for (let i = 1; i < roundsRecord[tid].length; i++) {
        const prev = roundsRecord[tid][i - 1];
        const curr = roundsRecord[tid][i];
        if (prev.isAway && curr.isAway && curr.roundIndex === prev.roundIndex + 1) {
          consecutiveAwayPenalty += 1;
        }
      }
    }
  
    // travel stats
    let totalTravel = 0;
    const travelVals = [];
    for (let tid in travelDist) {
      const val = travelDist[tid];
      totalTravel += val;
      travelVals.push(val);
      if (val > maxTravel) maxTravel = val;
    }
  
    // broadcast penalty => if it exceed FRIDAY_NIGHT_LIMIT amount
    let broadcastPenalty = 0;
    if (fridayNightCount > FRIDAY_NIGHT_LIMIT) {
      broadcastPenalty =
        (fridayNightCount - FRIDAY_NIGHT_LIMIT) * FRIDAY_NIGHT_PENALTY;
    }
  
    // travel fairness => std dev from mean //! or median?
    const meanTravel = totalTravel / teams.length;
    let variance = 0;
    travelVals.forEach((v) => {
      variance += (v - meanTravel) ** 2;
    });
    variance /= teams.length;
    const travelStdDev = Math.sqrt(variance);
  
    const shortGapPenalty = computeShortGapPenalty(fixtures, teams, minGapDays);
  
    const baseCost =
      w1 * consecutiveAwayPenalty +
      w2 * maxTravel +
      w3 * compPenalty +
      wFri * broadcastPenalty +
      top2missedSlotPenalty;
  
    const addedCost =
      wTravelTotal * totalTravel +
      wTravelFair * travelStdDev +
      wSlot * timeslotPenalty +
      wShortGap * shortGapPenalty;
  
    const totalCost = baseCost + addedCost;
  
    return {
      consecutiveAwayPenalty,
      maxTravel,
      compPenalty,
      broadcastPenalty,
      top2missedSlotPenalty,
      travelDist,
      totalTravel,
      travelStdDev,
      timeslotPenalty,
      shortGapPenalty,
      totalCost,
    };
  }
  
  function computeHomeAwayCost(fixtures, teams, distances, weights) {
    return computeCostBreakdown(fixtures, teams, distances, weights).totalCost;
  }
  
  function backtrackingAssignRoundsWithPattern(
    teams,
    matchups,
    pattern,
    orderStrategy = "desc"
  ) {
    let sorted = [];
    if (orderStrategy === "desc") {
      sorted = matchups.slice().sort((a, b) => b.competitiveness - a.competitiveness);
    } else if (orderStrategy === "asc") {
      sorted = matchups.slice().sort((a, b) => a.competitiveness - b.competitiveness);
    } else {
      sorted = shuffleArray(matchups);
    }
  
    const matchSlotIndices = [];
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i]) matchSlotIndices.push(i);
    }
    if (matchSlotIndices.length !== 5) {
      return { feasible: false, rounds: [], matchSlotIndices: [] };
    }
  
    const roundFixtures = [[], [], [], [], []];
    const teamRounds = {};
    teams.forEach((t) => {
      teamRounds[getIdString(t._id)] = new Set();
    });
  
    const memo = new Map();
  
    function getStateKey(idx) {
      const counts = roundFixtures.map((rf) => rf.length).join(",");
      return `idx=${idx}|counts=${counts}`;
    }
  
    function backtrack(idx) {
      if (idx === sorted.length) {
        for (let r = 0; r < 5; r++) {
          if (roundFixtures[r].length !== 3) return false;
        }
        return true;
      }
  
      // prune if any round > 3 matcjes
      for (let r = 0; r < 5; r++) {
        if (roundFixtures[r].length > 3) return false;
      }
  
      const stateKey = getStateKey(idx);
      if (memo.has(stateKey)) {
        return memo.get(stateKey);
      }
  
      const matchup = sorted[idx];
      const idA = getIdString(matchup.teamA._id);
      const idB = getIdString(matchup.teamB._id);
  
      let candidateRounds = [0, 1, 2, 3, 4];
      if (orderStrategy === "desc") {
        candidateRounds = [4, 3, 2, 1, 0];
      } else if (orderStrategy === "random") {
        candidateRounds = shuffleArray(candidateRounds);
      }
  
      for (let r of candidateRounds) {
        if (roundFixtures[r].length >= 3) continue;
        if (teamRounds[idA].has(r) || teamRounds[idB].has(r)) continue;
  
        roundFixtures[r].push({
          ...matchup,
          roundIndex: r,
          weekSlotIndex: matchSlotIndices[r],
        });
        teamRounds[idA].add(r);
        teamRounds[idB].add(r);
  
        if (backtrack(idx + 1)) {
          memo.set(stateKey, true);
          return true;
        }
  
        roundFixtures[r].pop();
        teamRounds[idA].delete(r);
        teamRounds[idB].delete(r);
      }
  
      memo.set(stateKey, false);
      return false;
    }
  
    const feasible = backtrack(0);
    return { feasible, rounds: roundFixtures, matchSlotIndices };
  }
  
  function assignHomeAway(
    teams,
    fixtures,
    distances,
    weights,
    partialLocks,
    lastYearMap
  ) {

    for (let fx of fixtures) {
      const r = fx.roundIndex + 1;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
  
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
      } else if (lockA === 0) {
        fx.homeAssignment = 0;
      } else if (lockB === 1) {
        fx.homeAssignment = 0;
      } else if (lockB === 0) {
        fx.homeAssignment = 1;
      } else {
        fx.homeAssignment = Math.random() < 0.5 ? 1 : 0;
      }
    }
  
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
  
        if (
          (partialLocks[idA] && typeof partialLocks[idA][r] === "number") ||
          (partialLocks[idB] && typeof partialLocks[idB][r] === "number")
        ) {
          continue;
        }
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
  
    if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
      return { fixtures, cost: Infinity };
    }
  
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
  
  function scheduleDates(fixtures, pattern, season, teams) {
    const matchSlots = [];
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i]) matchSlots.push(i);
    }
    if (matchSlots.length !== 5) return null;
  
    const baseDate = new Date(`${season}-02-01T00:00:00`);
    while (baseDate.getDay() !== 5) {
      baseDate.setDate(baseDate.getDate() + 1);
    }
  
    function buildRound14Dates(weekendStart) {
      const fri20 = new Date(weekendStart);
      fri20.setHours(20, 0, 0, 0);
      const sat14 = new Date(fri20.getTime() + 24 * 3600 * 1000);
      sat14.setHours(14, 0, 0, 0);
      const sat20 = new Date(fri20.getTime() + 24 * 3600 * 1000);
      sat20.setHours(20, 0, 0, 0);
      const sun14 = new Date(fri20.getTime() + 2 * 24 * 3600 * 1000);
      sun14.setHours(14, 0, 0, 0);
      return [fri20, sat14, sat20, sun14];
    }
  
    function buildRound5Dates(weekendStart) {
      // super sat on Sat14, Sat16, Sat18
      const dayStart = new Date(weekendStart);
      while (dayStart.getDay() !== 6) {
        dayStart.setDate(dayStart.getDate() + 1);
      }
      const t1 = new Date(dayStart);
      t1.setHours(14, 0, 0, 0);
      const t2 = new Date(dayStart);
      t2.setHours(16, 0, 0, 0);
      const t3 = new Date(dayStart);
      t3.setHours(18, 0, 0, 0);
      return [t1, t2, t3];
    }
  
    const roundsDateMap = {};
    for (let r = 1; r <= 5; r++) {
      const slotIdx = matchSlots[r - 1];
      const weekendStart = new Date(baseDate);
      weekendStart.setDate(baseDate.getDate() + slotIdx * 7);
  
      if (r < 5) {
        roundsDateMap[r] = buildRound14Dates(weekendStart);
      } else {
        roundsDateMap[r] = buildRound5Dates(weekendStart);
      }
    }
  
    const roundMap = {};
    for (let fx of fixtures) {
      const r = fx.roundIndex + 1;
      if (!roundMap[r]) roundMap[r] = [];
      roundMap[r].push(fx);
    }
  
    // Rivalry set for prime time
    const rivalrySet = new Set([
      "Scotland~England",
      "England~Scotland",
      "Ireland~England",
      "England~Ireland",
      "England~France",
      "France~England",
      "Ireland~Wales",
      "Wales~Ireland",
      "Wales~England",
      "England~Wales",
    ]);
  
    for (let r = 1; r <= 4; r++) {
      const arr = roundMap[r] || [];
      if (arr.length !== 3) return null;
      const dateChoices = roundsDateMap[r];
  
      const primeCandidates = [];
      const normalCandidates = [];
  
      for (let fx of arr) {
        const key = fx.teamA.teamName + "~" + fx.teamB.teamName;
        if (rivalrySet.has(key)) {
          primeCandidates.push(fx);
        } else {
          normalCandidates.push(fx);
        }
      }
  
      let usedSlots = new Set();
      if (primeCandidates.length > 0) {
        // first prime on Sat20
        const primeFx = primeCandidates.shift();
        primeFx.date = dateChoices[2];
        usedSlots.add(2);
        // second on Sun14
        if (primeCandidates.length > 0) {
          const primeFx2 = primeCandidates.shift();
          primeFx2.date = dateChoices[3];
          usedSlots.add(3);
        }
      }
  
      const freeSlots = [0, 1, 2, 3].filter((x) => !usedSlots.has(x));
      let idx = 0;
      for (let fx of normalCandidates) {
        if (idx >= freeSlots.length) return null;
        fx.date = dateChoices[freeSlots[idx]];
        idx++;
      }
      while (primeCandidates.length > 0 && idx < freeSlots.length) {
        const fx = primeCandidates.shift();
        fx.date = dateChoices[freeSlots[idx]];
        idx++;
      }
    }
  
    // round 5 on super saturday
    const arr5 = roundMap[5] || [];
    if (arr5.length !== 3) return null;
    const superSatSlots = roundsDateMap[5];
  
    // place #1 vs #2 in final 18:00 if found/allowed
    const sortedByRank = teams.slice().sort((a, b) => a.teamRanking - b.teamRanking);
    const topTeam = sortedByRank[0];
    const secondTeam = sortedByRank[1];
    let top2FixtureIndex = -1;
    for (let i = 0; i < arr5.length; i++) {
      const f = arr5[i];
      const idA = getIdString(f.teamA._id);
      const idB = getIdString(f.teamB._id);
      const topA = getIdString(topTeam._id);
      const topB = getIdString(secondTeam._id);
      if ((idA === topA && idB === topB) || (idB === topA && idA === topB)) {
        top2FixtureIndex = i;
        break;
      }
    }
  
    const usedRound5 = new Set();
    if (top2FixtureIndex >= 0) {
      arr5[top2FixtureIndex].date = superSatSlots[2];
      usedRound5.add(2);
    }
    let slotIndex5 = 0;
    for (let i = 0; i < arr5.length; i++) {
      if (i === top2FixtureIndex) continue;
      while (usedRound5.has(slotIndex5)) {
        slotIndex5++;
        if (slotIndex5 >= superSatSlots.length) return null;
      }
      arr5[i].date = superSatSlots[slotIndex5];
      usedRound5.add(slotIndex5);
      slotIndex5++;
    }
  
    return fixtures;
  }
  

  function makeNeighbor(schedule, teams, distances, weights, partialLocks, lastYearMap) {
    const newSched = JSON.parse(JSON.stringify(schedule));
    const fixtures = newSched.fixtures;
    if (fixtures.length < 2) return null;
  
    for (const fx of fixtures) {
      if (fx.date && typeof fx.date === "string") {
        fx.date = new Date(fx.date);
      }
    }
  
    const rnd = Math.random();
    let moveType = null;
    if (rnd < 0.4) {
      moveType = "flipHomeAway";
    } else if (rnd < 0.7) {
      moveType = "swapRounds";
    } else {
      moveType = "reassignRound";
    }
  
    if (moveType === "flipHomeAway") {
      const idx = Math.floor(Math.random() * fixtures.length);
      const fx = fixtures[idx];
      const r = fx.roundIndex + 1;
      const idA = getIdString(fx.teamA._id);
      const idB = getIdString(fx.teamB._id);
  
      if (lastYearMap[idA] && lastYearMap[idA][idB]) return null;
      if (lastYearMap[idB] && lastYearMap[idB][idA]) return null;
      if (partialLocks[idA] && typeof partialLocks[idA][r] === "number") return null;
      if (partialLocks[idB] && typeof partialLocks[idB][r] === "number") return null;
  
      fx.homeAssignment = fx.homeAssignment === 1 ? 0 : 1;
    } else if (moveType === "swapRounds") {
      const idx1 = Math.floor(Math.random() * fixtures.length);
      let idx2 = Math.floor(Math.random() * fixtures.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * fixtures.length);
      }
      const f1 = fixtures[idx1];
      const f2 = fixtures[idx2];
      if (f1.roundIndex === f2.roundIndex) return null;
      // swap
      const tmp = f1.roundIndex;
      f1.roundIndex = f2.roundIndex;
      f2.roundIndex = tmp;
      const tmpSlot = f1.weekSlotIndex;
      f1.weekSlotIndex = f2.weekSlotIndex;
      f2.weekSlotIndex = tmpSlot;
    } else if (moveType === "reassignRound") {

      const rPick = Math.floor(Math.random() * 5);
      const roundFixtures = fixtures.filter((x) => x.roundIndex === rPick);
      if (roundFixtures.length !== 3) return null;
      for (let i = 0; i < roundFixtures.length; i++) {
        const newR = Math.floor(Math.random() * 5);
        roundFixtures[i].roundIndex = newR;
        roundFixtures[i].weekSlotIndex = newR;
      }
    }
  
    if (!isFeasible(fixtures, teams, partialLocks, lastYearMap)) {
      return null;
    }
    newSched.totalCost = computeHomeAwayCost(fixtures, teams, distances, weights);
    return newSched;
  }
  

  function runLocalSearch(schedule, teams, distances, weights, partialLocks, lastYearMap) {
    let current = JSON.parse(JSON.stringify(schedule));
  
    current.fixtures.forEach((f) => {
      if (f.date && typeof f.date === "string") {
        f.date = new Date(f.date);
      }
    });
  
    let bestCost = current.totalCost;
    let temperature = 5.0;
    const coolingRate = 0.95;
    const MAX_ITER = 400;
    let iterationsSinceImprovement = 0;
  
    for (let iter = 0; iter < MAX_ITER; iter++) {
      const neighbor = makeNeighbor(
        current,
        teams,
        distances,
        weights,
        partialLocks,
        lastYearMap
      );
      if (!neighbor) {
        temperature *= coolingRate;
        iterationsSinceImprovement++;
        if (iterationsSinceImprovement > 50) {
          temperature *= 0.9;
        }
        continue;
      }

      neighbor.fixtures.forEach((f) => {
        if (f.date && typeof f.date === "string") {
          f.date = new Date(f.date);
        }
      });
  
      iterationsSinceImprovement++;
      if (neighbor.totalCost < bestCost) {
        current = neighbor;
        bestCost = neighbor.totalCost;
        iterationsSinceImprovement = 0;
      } else {
        const delta = neighbor.totalCost - bestCost;
        if (Math.random() < Math.exp(-delta / temperature)) {
          current = neighbor;
          bestCost = neighbor.totalCost;
          iterationsSinceImprovement = 0;
        }
      }
      if (iterationsSinceImprovement > 20) {
        temperature *= 0.9;
        iterationsSinceImprovement = 0;
      } else {
        temperature *= coolingRate;
      }
    }
  
    current.totalCost = bestCost;
    return current;
  }
  

  function buildFinalSummary(schedule, teams) {
    console.log("[buildFinalSummary] Building final summary info...");
    const summary = [];
  
    const rivalrySet = new Set([
      "Scotland~England",
      "England~Scotland",
      "Ireland~England",
      "England~Ireland",
      "England~France",
      "France~England",
      "Ireland~Wales",
      "Wales~Ireland",
      "Wales~England",
      "England~Wales",
    ]);
  
    const { fixtures, totalCost, distances } = schedule;
    const breakdown = computeCostBreakdown(fixtures, teams, distances, {});
    const chrono = fixtures.slice().sort((a, b) => (a.date || 0) - (b.date || 0));
    const {
      consecutiveAwayPenalty,
      maxTravel,
      compPenalty,
      broadcastPenalty,
      top2missedSlotPenalty,
      travelDist,
      totalTravel,
      travelStdDev,
      timeslotPenalty,
      shortGapPenalty,
    } = breakdown;
  
    summary.push("=== Final Comprehensive Schedule Summary ===");
    summary.push("");
  
    summary.push(`Best schedule found with total cost: ${totalCost.toFixed(2)}`);
    summary.push("Cost breakdown:");
    summary.push(
      `  - Consecutive Away Penalty:  ${consecutiveAwayPenalty.toFixed(
        2
      )} (Each pair of back-to-back away matches adds +1)`
    );
    summary.push(
      `  - Max Travel (km):          ${maxTravel.toFixed(
        2
      )} (Heaviest total distance for a single team)`
    );
    summary.push(
      `  - Total Travel (km):        ${totalTravel.toFixed(
        2
      )} (Sum across all teams, weighted to encourage efficiency)`
    );
    summary.push(
      `  - Travel StdDev (fairness): ${travelStdDev.toFixed(
        2
      )} (Penalizes large disparities)`
    );
    summary.push(
      `  - Competitiveness Penalty:  ${compPenalty.toFixed(
        2
      )} (High-interest matches earlier => bigger penalty)`
    );
    summary.push(
      `  - Broadcast Penalty:        ${broadcastPenalty.toFixed(
        2
      )} (Extra cost if more Friday-night matches than limit)`
    );
    summary.push(
      `  - Timeslot Penalty:         ${timeslotPenalty.toFixed(
        2
      )} (Non-prime or sub-optimal timeslots => penalty)`
    );
    summary.push(
      `  - Short-Gap Penalty:        ${shortGapPenalty.toFixed(
        2
      )} (Matches <6 days apart => penalty)`
    );
    summary.push(
      `  - Top2 Missed Slot Penalty: ${top2missedSlotPenalty.toFixed(
        2
      )} (#1 vs #2 not in R5 final slot => +15)`
    );
    summary.push(`  => Weighted total:          ${totalCost.toFixed(2)}`);
    summary.push("");
  
    summary.push(`Round Start Dates:`);
    for (let r = 1; r <= 5; r++) {
      const roundFixtures = chrono.filter((x) => x.roundIndex + 1 === r);
      if (roundFixtures.length > 0) {
        roundFixtures.sort((a, b) => (a.date || 0) - (b.date || 0));
        const dateStr = roundFixtures[0].date
          ? roundFixtures[0].date.toDateString()
          : "(no date)";
        summary.push(`  Round ${r} starts on => ${dateStr}`);
      }
    }
    summary.push("");
  
    summary.push(`Team Rankings:`);
    const sortedByRank = teams.slice().sort((a, b) => a.teamRanking - b.teamRanking);
    for (let i = 0; i < sortedByRank.length; i++) {
      summary.push(
        `  - ${sortedByRank[i].teamName} (rank ${sortedByRank[i].teamRanking})`
      );
    }
    summary.push("");
  
    summary.push(`Match “Interest” Rankings (highest first):`);
    const allPairs = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const diff = getRankDiff({ teamA: teams[i], teamB: teams[j] });
        const sum = getRankSum({ teamA: teams[i], teamB: teams[j] });
        // default alpha=1,beta=2 in summary //! MAYBE NEED TO UPDATE THIS TO BE DYNAMIC IN SUMMARY
        const interest = 1 * (6 - diff) + 2 * (12 - sum);
        allPairs.push({
          teamA: teams[i],
          teamB: teams[j],
          interest,
          sum,
          diff,
        });
      }
    }
    allPairs.sort((a, b) => b.interest - a.interest);
    let rankIdx = 1;
    for (let p of allPairs) {
      summary.push(
        `${rankIdx} - ${p.teamA.teamName} (rank ${p.teamA.teamRanking}) vs ${p.teamB.teamName} (rank ${p.teamB.teamRanking}), interest=${p.interest}, sum=${p.sum}, diff=${p.diff}`
      );
      rankIdx++;
    }
    summary.push("");
  
    summary.push(`Prime-Time Matches (Sat 20:00 or Sun 18:00) for Rivalries:`);
    const primeTimeMatches = chrono.filter((fx) => {
      if (!fx.date) return false;
      const day = fx.date.getDay();
      const hour = fx.date.getHours();
      const isPrime = (day === 6 && hour === 20) || (day === 0 && hour === 18);
      const key = fx.teamA.teamName + "~" + fx.teamB.teamName;
      const isRival = rivalrySet.has(key);
      return isPrime && isRival;
    });
    if (primeTimeMatches.length === 0) {
      summary.push("  (No big rivalry was assigned to prime time)");
    } else {
      primeTimeMatches.forEach((fx) => {
        const homeIsA = fx.homeAssignment === 1;
        const homeTeam = homeIsA ? fx.teamA.teamName : fx.teamB.teamName;
        const awayTeam = homeIsA ? fx.teamB.teamName : fx.teamA.teamName;
        const dateStr = fx.date
          ? fx.date.toISOString().split("T")[0] +
            " " +
            fx.date.toTimeString().split(" ")[0].slice(0, 5)
          : "(no date)";
        summary.push(`  R${fx.roundIndex + 1}: ${homeTeam} vs ${awayTeam} @ ${dateStr}`);
      });
    }
    summary.push("");
  
    summary.push(`--- Distances Between Teams (Precomputed) ---`);
    const displayedPairs = new Set();
    for (let key in distances) {
      if (displayedPairs.has(key)) continue;
      const reversed = key.split("-").reverse().join("-");
      displayedPairs.add(key);
      displayedPairs.add(reversed);
  
      const [idA, idB] = key.split("-");
      const tA = teams.find((t) => getIdString(t._id) === idA);
      const tB = teams.find((t) => getIdString(t._id) === idB);
      if (!tA || !tB) continue;
      const d = distances[key].toFixed(2);
      summary.push(`Distance: ${tA.teamName} vs ${tB.teamName} => ${d} km`);
    }
    summary.push("");
  
    summary.push(`--- Total Travel Distances by Team ---`);
    teams.forEach((t) => {
      const tid = getIdString(t._id);
      const distVal = (travelDist[tid] || 0).toFixed(2);
      summary.push(`  ${t.teamName}: ${distVal} km`);
    });
    summary.push("");
  
    summary.push(`--- Per-Match Travel Logs ---`);
    for (let fx of chrono) {
      const homeIsA = fx.homeAssignment === 1;
      const homeTeam = homeIsA ? fx.teamA : fx.teamB;
      const awayTeam = homeIsA ? fx.teamB : fx.teamA;
      const dKey = `${getIdString(fx.teamA._id)}-${getIdString(fx.teamB._id)}`;
      const dist = distances[dKey] || 0;
      const dateStr = fx.date
        ? fx.date.toISOString().split("T")[0] +
          " " +
          fx.date.toTimeString().split(" ")[0].slice(0, 5)
        : "(no date)";
      summary.push(
        `R${fx.roundIndex + 1} | ${awayTeam.teamName} travels from ${
          awayTeam.teamName
        } [${awayTeam.stadium.latitude},${
          awayTeam.stadium.longitude
        }] to ${homeTeam.teamName} [${homeTeam.stadium.latitude},${
          homeTeam.stadium.longitude
        }] => ${dist.toFixed(2)} km  @ ${dateStr}`
      );
    }
    summary.push("");
  
    summary.push(`--- Per-Team Fixture Summary ---`);
    const teamFixtures = {};
    teams.forEach((t) => {
      teamFixtures[getIdString(t._id)] = [];
    });
    for (let fx of chrono) {
      const r = fx.roundIndex + 1;
      const homeIsA = fx.homeAssignment === 1;
      const homeTeam = homeIsA ? fx.teamA : fx.teamB;
      const awayTeam = homeIsA ? fx.teamB : fx.teamA;
      teamFixtures[getIdString(homeTeam._id)].push({
        round: r,
        opponent: awayTeam.teamName,
        homeOrAway: "Home",
        date: fx.date,
      });
      teamFixtures[getIdString(awayTeam._id)].push({
        round: r,
        opponent: homeTeam.teamName,
        homeOrAway: "Away",
        date: fx.date,
      });
    }
    teams.forEach((t) => {
      const tid = getIdString(t._id);
      summary.push(`${t.teamName}:`);
      teamFixtures[tid].sort((a, b) => a.round - b.round);
      teamFixtures[tid].forEach((f) => {
        const dStr = f.date ? f.date.toISOString().split("T")[0] : "(no date)";
        summary.push(`  R${f.round} - ${f.homeOrAway} vs ${f.opponent} (${dStr})`);
      });
      summary.push("");
    });
  
    console.log("[buildFinalSummary] Summary built.\n");
    return summary;
  }
  
  async function generateComprehensiveFairFixtures(
    teams,
    season,
    requestedRestCount = null,
    weights = {},
    options = {}
  ) {
    console.log(
      `\n=== generateComprehensiveFairFixtures ===\nSeason=${season}, requestedRestCount=${requestedRestCount}`
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
  
    const alpha = weights.ALPHA || 1;
    const beta = weights.BETA || 2;
  
    console.log("[Scheduler] Generating matchups...");
    const matchups = generateAllMatchups(teams, alpha, beta);
  
    console.log("[Scheduler] Building rest patterns...");
    const allPatterns = generateRestWeekPatterns(5, 8);
    let patterns = [];
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
  
    const orderStrategies = ["desc", "asc", "random"];
  
    for (let pIndex = 0; pIndex < patterns.length; pIndex++) {
      const pattern = patterns[pIndex];
  
      for (let strategy of orderStrategies) {
        const roundRes = backtrackingAssignRoundsWithPattern(
          teams,
          matchups,
          pattern,
          strategy
        );
        if (!roundRes.feasible) {
          continue;
        }
  
        let fixtures = flattenRounds(roundRes.rounds);
        unifyFixtureTeams(fixtures, teams);
  
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
          continue;
        }

        const scheduled = scheduleDates(fixtures, pattern, season, teams);
        if (!scheduled || scheduled.length !== 15) {
          continue;
        }
  
        const costVal = computeHomeAwayCost(scheduled, teams, distances, weights);
        if (!isFinite(costVal)) {
          continue;
        }
  
        let candidate = {
          fixtures: scheduled,
          pattern,
          totalCost: costVal,
          distances,
          messages,
          lastYearMap: lastYearHome,
        };
  
        if (runLocalSearchFlag) {
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
          }
        }
  
        if (candidate.totalCost < bestCost) {
          bestCost = candidate.totalCost;
          bestSchedule = candidate;
        }
      }
    }
  
    if (!bestSchedule) {
      console.log("[Scheduler] No feasible schedule found!\n");
      return {
        fixtures: [],
        summary: ["No feasible schedule found."],
        bestCost: null,
      };
    }
  
    console.log(
      `[Scheduler] Best cost found = ${bestCost.toFixed(
        2
      )} => building summary...\n`
    );
  
    // build final summary (with default weighting in the summary) //! IS THERE A NEED TO UPDATE SUMMARY TO SHOW THE ACTUAL WEIGHTS USED?
    const summary = buildFinalSummary(bestSchedule, teams);
  
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
      `\nDone with all runs. Best cost found => ${
        globalBest.bestCost?.toFixed(2) ?? globalBestCost.toFixed(2)
      }`
    );
    return globalBest;
  }
  
  module.exports = {
    generateComprehensiveFairFixtures,
    generateComprehensiveFairFixturesWithRetries,
  };