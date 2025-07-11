/**
 * @module backend/algorithms/round5Extravaganza
 * @description
 * Forces #1 vs #2 (final) and #3 vs #4 (second-last) in Round 5,
 * then uses backtracking to place the other 13 matches from Round 5 -> Round 1,
 * sorting leftover by a custom "interest" formula that combines:
 *   - rank difference (closer = more interesting)
 *   - sum of ranks (lower sum = higher-tier clash)
 * Weighted so big top-tier matchups with close ranks get the highest interest.
 *
 * @version 3.4.0
 */

const Stadium = require('../models/Stadium');
const Fixture = require('../models/Fixture');

/** Weights for the interest formula */
const ALPHA = 1;  // how much to value closeness (difference)
const BETA = 2;   // how much to value top-tier sum

/**
 * Fisher-Yates Shuffle.
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateAllMatchups(teams) {
  const all = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      all.push({
        teamA: teams[i],
        teamB: teams[j],
      });
    }
  }
  return all;
}

function getRankSum(m) {
  return m.teamA.teamRanking + m.teamB.teamRanking;
}

function getRankDiff(m) {
  return Math.abs(m.teamA.teamRanking - m.teamB.teamRanking);
}

/**
 *  "interest" formula, interest = ALPHA*(6 - diff) + BETA*(12 - sum).
 * - (6 - diff) because bigger is better (close rank => bigger).
 * - (12 - sum) because bigger is better (top-tier => smaller sum).
 * 
 * can adjust 6,12 for different number of teams or other offsets. (explaimn in report)
 */
function getMatchInterest(m) {
  const d = getRankDiff(m);
  const s = getRankSum(m);
  const interest = ALPHA * (6 - d) + BETA * (12 - s);
  return interest;
}

function buildInterestList(allMatches) {
  const combos = allMatches.map((m) => {
    const diff = getRankDiff(m);
    const sum = getRankSum(m);
    const interest = getMatchInterest(m);
    return {
      teamA: m.teamA,
      teamB: m.teamB,
      diff,
      sum,
      interest,
    };
  });

  combos.sort((a, b) => {
    if (b.interest !== a.interest) return b.interest - a.interest;
    return a.sum - b.sum; // tie-break is smaller sum is "better"
  });

  combos.forEach((c, idx) => {
    c.competRank = idx + 1;
  });

  const map = {};
  for (const c of combos) {
    const aId = c.teamA._id.toString();
    const bId = c.teamB._id.toString();
    const key = [aId, bId].sort().join('-');
    map[key] = c;
  }

  return { combos, map };
}

function validateUniqueFixtures(schedule) {
  const setOfPairs = new Set();
  for (let fx of schedule) {
    const a = fx.teamA._id.toString();
    const b = fx.teamB._id.toString();
    const key = [a, b].sort().join('-');
    if (setOfPairs.has(key)) {
      throw new Error(
        `Duplicate fixture found: ${fx.teamA.teamName} vs ${fx.teamB.teamName} (Round ${fx.round})`
      );
    }
    setOfPairs.add(key);
  }
  if (setOfPairs.size !== 15) {
    throw new Error(
      `Expected 15 unique fixtures, found ${setOfPairs.size}. Incomplete or invalid.`
    );
  }
}

function backtrackingFillRounds(leftover, index, rounds) {
  if (index === leftover.length) {
    return true;
  }
  const match = leftover[index];
  const tA = match.teamA._id.toString();
  const tB = match.teamB._id.toString();

  for (let r = 4; r >= 0; r--) {
    if (rounds[r].length < 3) {
      const conflict = rounds[r].some((fx) => {
        const fxA = fx.teamA._id.toString();
        const fxB = fx.teamB._id.toString();
        return fxA === tA || fxB === tA || fxA === tB || fxB === tB;
      });
      if (!conflict) {
        rounds[r].push({
          round: r + 1,
          teamA: match.teamA,
          teamB: match.teamB,
        });
        if (backtrackingFillRounds(leftover, index + 1, rounds)) {
          return true;
        }
        // backtrack
        rounds[r].pop();
      }
    }
  }
  return false;
}

function markFlipped(fixture, flippedSet) {
  const a = fixture.teamA._id.toString();
  const b = fixture.teamB._id.toString();
  flippedSet.add([a, b].sort().join('-'));
}
function alreadyFlipped(fixture, flippedSet) {
  const a = fixture.teamA._id.toString();
  const b = fixture.teamB._id.toString();
  return flippedSet.has([a, b].sort().join('-'));
}
function flipFixture(fixture, homeCount, awayCount) {
  homeCount[fixture.homeTeam._id.toString()]--;
  awayCount[fixture.awayTeam._id.toString()]--;
  [fixture.homeTeam, fixture.awayTeam] = [fixture.awayTeam, fixture.homeTeam];
  homeCount[fixture.homeTeam._id.toString()]++;
  awayCount[fixture.awayTeam._id.toString()]++;
}

async function assignHomeAway(fixtures, season, teams) {
  const changes = [];
  const homeCount = {};
  const awayCount = {};
  teams.forEach((t) => {
    homeCount[t._id.toString()] = 0;
    awayCount[t._id.toString()] = 0;
  });

  for (let fx of fixtures) {
    const prev = await Fixture.findOne({
      season: season - 1,
      $or: [
        { homeTeam: fx.teamA._id, awayTeam: fx.teamB._id },
        { homeTeam: fx.teamB._id, awayTeam: fx.teamA._id },
      ],
    });
    if (prev) {
      if (prev.homeTeam.equals(fx.teamA._id)) {
        fx.homeTeam = fx.teamB;
        fx.awayTeam = fx.teamA;
        changes.push(
          `Prev season home was ${fx.teamA.teamName}, flipping => now ${fx.teamB.teamName} hosts.`
        );
      } else {
        fx.homeTeam = fx.teamA;
        fx.awayTeam = fx.teamB;
        changes.push(
          `Prev season home was ${fx.teamB.teamName}, flipping => now ${fx.teamA.teamName} hosts.`
        );
      }
    } else {
      fx.homeTeam = fx.teamA;
      fx.awayTeam = fx.teamB;
      changes.push(
        `No previous record for ${fx.teamA.teamName} vs ${fx.teamB.teamName}, default => ${fx.teamA.teamName} hosts.`
      );
    }
    homeCount[fx.homeTeam._id.toString()]++;
    awayCount[fx.awayTeam._id.toString()]++;
  }

  const flippedFixtures = new Set();
  let done = false;
  while (!done) {
    done = true;
    for (let t of teams) {
      const tid = t._id.toString();
      if (homeCount[tid] < 2) {
        const candidate = fixtures.find(
          (f) =>
            f.awayTeam._id.toString() === tid &&
            homeCount[f.homeTeam._id.toString()] > 2 &&
            awayCount[f.awayTeam._id.toString()] > 2 &&
            !alreadyFlipped(f, flippedFixtures)
        );
        if (candidate) {
          flipFixture(candidate, homeCount, awayCount);
          markFlipped(candidate, flippedFixtures);
          changes.push(
            `Balancing: flipped to give ${candidate.homeTeam.teamName} a home match.`
          );
          done = false;
        }
      }
      if (awayCount[tid] < 2) {
        const candidate = fixtures.find(
          (f) =>
            f.homeTeam._id.toString() === tid &&
            homeCount[f.homeTeam._id.toString()] > 2 &&
            awayCount[f.awayTeam._id.toString()] > 2 &&
            !alreadyFlipped(f, flippedFixtures)
        );
        if (candidate) {
          flipFixture(candidate, homeCount, awayCount);
          markFlipped(candidate, flippedFixtures);
          changes.push(
            `Balancing: flipped to give ${candidate.awayTeam.teamName} an away match.`
          );
          done = false;
        }
      }
    }
  }

  for (let t of teams) {
    const tid = t._id.toString();
    if (homeCount[tid] < 2) {
      throw new Error(`Team ${t.teamName} ended with <2 home games.`);
    }
    if (awayCount[tid] < 2) {
      throw new Error(`Team ${t.teamName} ended with <2 away games.`);
    }
  }

  for (let fx of fixtures) {
    const st = await Stadium.findById(fx.homeTeam.stadium);
    fx.stadium = st || null;
    fx.location = st ? st.stadiumCity : 'Unknown City';
  }

  return changes;
}

function nextDayOfWeek(startDate, targetDOW) {
  const d = new Date(startDate);
  while (d.getDay() !== targetDOW) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

async function scheduleFixtures(fixtures, season, userRestWeeks, forcedMatches) {
  const restWeeks = userRestWeeks && userRestWeeks.length ? userRestWeeks : [2, 4];
  const rounds = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);

  let scheduled = [];
  let dateCursor = new Date(`${season}-02-01T09:00:00`);

  for (let r of rounds) {
    const roundFx = fixtures.filter((fx) => fx.round === r);

    if (r === 5) {
      const saturday = nextDayOfWeek(dateCursor, 6);
      const slots = [
        new Date(saturday.toISOString().split('T')[0] + 'T14:00:00'),
        new Date(saturday.toISOString().split('T')[0] + 'T16:00:00'),
        new Date(saturday.toISOString().split('T')[0] + 'T18:00:00'),
      ];
      const match1v2Index = roundFx.findIndex((fx) =>
        isSamePair(fx, forcedMatches.match1v2)
      );
      const match3v4Index = roundFx.findIndex((fx) =>
        isSamePair(fx, forcedMatches.match3v4)
      );
      if (match1v2Index === -1 || match3v4Index === -1) {
        throw new Error('Could not find forced #1 vs #2 or #3 vs #4 in Round 5.');
      }
      const match1v2 = roundFx[match1v2Index];
      const match3v4 = roundFx[match3v4Index];
      const leftover = roundFx.filter(
        (_, idx) => idx !== match1v2Index && idx !== match3v4Index
      );
      if (leftover.length !== 1) {
        throw new Error('Round 5 leftover mismatch, expected 1 leftover.');
      }
      leftover[0].date = slots[0];
      match3v4.date = slots[1];
      match1v2.date = slots[2];
      scheduled.push(leftover[0], match3v4, match1v2);
    } else {
      const fri = nextDayOfWeek(dateCursor, 5);
      const sat = nextDayOfWeek(dateCursor, 6);
      const slotTimes = [
        new Date(fri.toISOString().split('T')[0] + 'T20:00:00'),
        new Date(sat.toISOString().split('T')[0] + 'T14:00:00'),
        new Date(sat.toISOString().split('T')[0] + 'T16:00:00'),
      ];
      for (let i = 0; i < roundFx.length; i++) {
        roundFx[i].date = slotTimes[i];
      }
      scheduled.push(...roundFx);
    }

    dateCursor.setDate(dateCursor.getDate() + 7);
    if (restWeeks.includes(r)) {
      dateCursor.setDate(dateCursor.getDate() + 7);
    }
  }

  return scheduled;
}
function isSamePair(fx, forced) {
  const fxA = fx.teamA._id.toString();
  const fxB = fx.teamB._id.toString();
  const fA = forced.teamA._id.toString();
  const fB = forced.teamB._id.toString();
  return (fxA === fA && fxB === fB) || (fxA === fB && fxB === fA);
}

function buildSummary({
  teams,
  scheduledFixtures,
  restWeeks,
  homeAwayChanges,
  allMatches,
  interestMap,
}) {
  const summaryLines = [];

  summaryLines.push('=== Round 5 Extravaganza ===');
  summaryLines.push('Forcing teams[0] vs teams[1] in the final, and teams[2] vs teams[3] second-last of Round 5.');
  summaryLines.push(
    'Leftover matches sorted by descending “interest” to push big matches to later rounds.'
  );
  summaryLines.push(`Using rest weeks: ${restWeeks.join(', ')}`);
  summaryLines.push('');

  summaryLines.push('Team Rankings:');
  for (let t of teams) {
    summaryLines.push(` - ${t.teamName} (rank ${t.teamRanking})`);
  }

  let combos = allMatches.map((m) => {
    const aId = m.teamA._id.toString();
    const bId = m.teamB._id.toString();
    const key = [aId, bId].sort().join('-');
    const rec = interestMap[key];
    return {
      ...rec,
      teamA: m.teamA,
      teamB: m.teamB,
    };
  });

  combos.sort((a, b) => {
    if (b.interest !== a.interest) return b.interest - a.interest;
    return a.sum - b.sum;
  });

  summaryLines.push('');
  summaryLines.push('Match “Interest” Rankings (highest first):');
  combos.forEach((c, i) => {
    summaryLines.push(
      `${i + 1} - ${c.teamA.teamName} (rank ${c.teamA.teamRanking}) vs ` +
      `${c.teamB.teamName} (rank ${c.teamB.teamRanking}), ` +
      `interest=${c.interest}, sum=${c.sum}, diff=${c.diff}`
    );
  });

  if (homeAwayChanges.length) {
    summaryLines.push('');
    summaryLines.push('Home/Away Changes vs Last Season:');
    homeAwayChanges.forEach((line) => summaryLines.push(` - ${line}`));
  }

  const roundsUsed = [...new Set(scheduledFixtures.map((fx) => fx.round))].sort((a, b) => a - b);
  for (let r of roundsUsed) {
    const rFx = scheduledFixtures.filter((fx) => fx.round === r);
    const earliest = new Date(Math.min(...rFx.map((f) => f.date.getTime())));
    summaryLines.push('');
    summaryLines.push(`Round ${r} starts on => ${earliest.toDateString()}`);
    if (restWeeks.includes(r)) {
      summaryLines.push('(REST WEEK after this round)');
    }
  }

  summaryLines.push('');
  summaryLines.push('--- Per-Team Fixture Summary ---');
  const teamMap = {};
  teams.forEach((t) => {
    teamMap[t._id.toString()] = { name: t.teamName, matches: [] };
  });
  for (let fx of scheduledFixtures) {
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
    summaryLines.push(`${t.name}:`);
    const lines = t.matches.map(
      (m) =>
        ` R${m.round} - ${m.homeAway} vs ${m.opp.teamName} (${m.date.toDateString()});`
    );
    summaryLines.push(lines.join('\n'));
    summaryLines.push('');
  });

  summaryLines.push('--- Match Order with interest ---\n');
  roundsUsed.forEach((r) => {
    summaryLines.push(`Round ${r}:`);
    const rFx = scheduledFixtures
      .filter((fx) => fx.round === r)
      .sort((a, b) => a.date - b.date);

    rFx.forEach((fx, idx) => {
      const aId = fx.homeTeam._id.toString();
      const bId = fx.awayTeam._id.toString();
      const key = [aId, bId].sort().join('-');
      const rec = interestMap[key];
      summaryLines.push(
        `Match ${idx + 1} - ${fx.homeTeam.teamName} (rank ${fx.homeTeam.teamRanking}) vs ` +
        `${fx.awayTeam.teamName} (rank ${fx.awayTeam.teamRanking}) => ` +
        `${fx.date.toDateString()} ${fx.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ` +
        `: interest=${rec.interest} (sum=${rec.sum}, diff=${rec.diff}) [Ranking : #${rec.competRank}]`
      );
    });

    summaryLines.push('');
  });

  return summaryLines;
}

async function generateRound5ExtravaganzaFixtures(teams, season, userRestWeeks = []) {
  if (teams.length !== 6) {
    throw new Error('Requires exactly 6 teams for Round5Extravaganza algorithm.');
  }
  teams.sort((a, b) => a.teamRanking - b.teamRanking);

  const match1v2 = { teamA: teams[0], teamB: teams[1] };
  const match3v4 = { teamA: teams[2], teamB: teams[3] };

  const allMatches = generateAllMatchups(teams);

  const { combos: fullInterestList, map: interestMap } = buildInterestList(allMatches);

  function isSamePair(m, forced) {
    const a = m.teamA._id.toString();
    const b = m.teamB._id.toString();
    const fA = forced.teamA._id.toString();
    const fB = forced.teamB._id.toString();
    return (a === fA && b === fB) || (a === fB && b === fA);
  }
  const leftover = allMatches.filter(
    (m) => !isSamePair(m, match1v2) && !isSamePair(m, match3v4)
  );

  const maxAttempts = 1000000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // sort leftover by descending interest. leftover[0] = highest interest
      leftover.sort((m1, m2) => {
        const i1 = getMatchInterest(m1);
        const i2 = getMatchInterest(m2);
        if (i2 !== i1) return i2 - i1; 
        // tie break is smaller sum is bigger match
        return getRankSum(m1) - getRankSum(m2);
      });
      shuffleArray(leftover);

      const rounds = [[], [], [], [], []];
      // Force #1 vs #2, #3 vs #4 in round 5
      rounds[4].push({ round: 5, teamA: match1v2.teamA, teamB: match1v2.teamB });
      rounds[4].push({ round: 5, teamA: match3v4.teamA, teamB: match3v4.teamB });

      const success = backtrackingFillRounds(leftover, 0, rounds);
      if (!success) throw new Error('Backtracking fill failed');

      const schedule = rounds.flat();

      validateUniqueFixtures(schedule);

      const homeAwayChanges = await assignHomeAway(schedule, season, teams);

      const forcedMatches = { match1v2, match3v4 };
      const scheduled = await scheduleFixtures(
        schedule,
        season,
        userRestWeeks,
        forcedMatches
      );

      const finalFixtures = scheduled.map((fx) => ({
        round: fx.round,
        date: fx.date,
        homeTeam: fx.homeTeam._id,
        awayTeam: fx.awayTeam._id,
        stadium: fx.stadium ? fx.stadium._id : null,
        location: fx.location,
        season,
      }));

      const summary = buildSummary({
        teams,
        scheduledFixtures: scheduled,
        restWeeks: userRestWeeks && userRestWeeks.length ? userRestWeeks : [2, 4],
        homeAwayChanges,
        allMatches,
        interestMap,
      });

      return { fixtures: finalFixtures, summary };
    } catch (err) {
      console.warn(`[Round5Extravaganza] Attempt ${attempt} failed: ${err.message}`);
    }
  }

  throw new Error(`Failed to generate a feasible schedule after ${maxAttempts} attempts.`);
}

module.exports = {
  generateRound5ExtravaganzaFixtures,
};