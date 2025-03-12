import React, { useState, useEffect, useMemo, useContext } from 'react';
import axios from 'axios';
import { Navigate, Link } from 'react-router-dom';
import { FaInfoCircle, FaSun, FaMoon, FaPlus, FaMinus } from 'react-icons/fa';
import { Team, Fixture } from '../interfaces/ManualFixture';
import { AuthContext } from '../contexts/AuthContext';
import ManualSchedulerSplash from './ManualSchedulerSplash'; 

interface ValidationError {
  message: string;
  fixtureIndices?: { roundIndex: number; fixtureIndex: number };
}

interface ConflictSuggestion {
  fixtureToReset: { roundIndex: number; fixtureIndex: number };
  conflictingFixture: { roundIndex: number; fixtureIndex: number };
}

interface UnfeasibleMatchupReason {
  teamA: Team;
  teamB: Team;
  reason: string;
}

interface ManualFixtureSchedulerProps {
  initialFixtures?: Fixture[][];
}

const getTeamColor = (teamName: string): { backgroundColor: string; textColor: string } => {
  switch (teamName) {
    case 'England':
      return { backgroundColor: '#ffffff', textColor: '#000000' };
    case 'France':
      return { backgroundColor: '#0033cc', textColor: '#ffffff' };
    case 'Ireland':
      return { backgroundColor: '#009933', textColor: '#ffffff' };
    case 'Scotland':
      return { backgroundColor: '#003366', textColor: '#ffffff' };
    case 'Italy':
      return { backgroundColor: '#0066cc', textColor: '#ffffff' };
    case 'Wales':
      return { backgroundColor: '#cc0000', textColor: '#ffffff' };
    default:
      return { backgroundColor: '#ffa500', textColor: '#000000' };
  }
};

const ManualFixtureScheduler: React.FC<ManualFixtureSchedulerProps> = () => {

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [showSplash, setShowSplash] = useState(false);

useEffect(() => {
  const hasVisited = localStorage.getItem('firstTimeManualFixtures');
  if (!hasVisited) {
    setShowSplash(true);
    localStorage.setItem('firstTimeManualFixtures', 'true');
  }
}, []);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const [season, setSeason] = useState<number>(new Date().getFullYear() + 1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[][]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [constraintChecks, setConstraintChecks] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<'selectTeams' | 'input' | 'summary'>('selectTeams');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [collapsedFixtures, setCollapsedFixtures] = useState<Set<string>>(new Set());
  const { user, apiKey } = useContext(AuthContext);
  const [matchupTracker, setMatchupTracker] = useState<{ [key: string]: boolean }>({});
  const [perRoundTeamTracker, setPerRoundTeamTracker] = useState<{
    [round: number]: { [teamId: string]: boolean };
  }>({});

  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({});
  const [conflictingRounds, setConflictingRounds] = useState<{ round1: number; round2: number }[]>([]);
  const [conflictSuggestions, setConflictSuggestions] = useState<{ [key: string]: ConflictSuggestion[] }>({});
  const [unfeasibleMatchupReasons, setUnfeasibleMatchupReasons] = useState<{
    [key: string]: UnfeasibleMatchupReason[];
  }>({});

  useEffect(() => {
    if (user && user.role === 'admin') {
      const fetchTeams = async () => {
        try {
          const res = await axios.get('http://localhost:5003/api/teams', {
            headers: {
              'x-api-key': apiKey,
            },
          });
          setTeams(res.data || []);
        } catch (error) {
          console.error('Error fetching teams:', error);
        }
      };
      fetchTeams();
    }
  }, [user, apiKey]);

  const toggleSelectedTeam = (teamId: string) => {
    setErrorMessage('');
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        if (next.size >= 6) {
          setErrorMessage('You can select up to 6 teams.');
          return prev;
        }
        next.add(teamId);
      }
      return next;
    });
  };

  const validateTeamCount = (): boolean => {
    if (selectedTeamIds.size !== 6) {
      setErrorMessage('Please select exactly 6 teams.');
      return false;
    }
    return true;
  };

  const initializeFixtures = (teamList: Team[]) => {
    const totalTeams = teamList.length;
    const rounds = totalTeams - 1;
    const fixturesPerRound = totalTeams / 2;

    const newFixtures: Fixture[][] = [];
    for (let r = 1; r <= rounds; r++) {
      const roundFixtures: Fixture[] = [];
      for (let i = 0; i < fixturesPerRound; i++) {
        roundFixtures.push({
          round: r,
          date: '',
          homeTeam: null,
          awayTeam: null,
          stadium: null,
          location: '',
          touched: false,
        });
      }
      newFixtures.push(roundFixtures);
    }
    setFixtures(newFixtures);
  };

  const initializeMatchupTracker = (teamList: Team[]) => {
    const tracker: { [key: string]: boolean } = {};
    for (let i = 0; i < teamList.length; i++) {
      for (let j = i + 1; j < teamList.length; j++) {
        const tA = teamList[i];
        const tB = teamList[j];
        const key = [tA._id, tB._id].sort().join('-');
        tracker[key] = false;
      }
    }
    setMatchupTracker(tracker);
  };

  const initializePerRoundTeamTracker = (teamList: Team[]) => {
    const rounds = teamList.length - 1;
    const newTracker: { [round: number]: { [teamId: string]: boolean } } = {};
    for (let r = 1; r <= rounds; r++) {
      newTracker[r] = {};
      teamList.forEach((t) => {
        newTracker[r][t._id] = false;
      });
    }
    setPerRoundTeamTracker(newTracker);
  };

  const updateTrackers = (fx: Fixture[][]) => {
    const overall: { [key: string]: boolean } = {};
    selectedTeams.forEach((teamA, i) => {
      selectedTeams.slice(i + 1).forEach((teamB) => {
        const key = [teamA._id, teamB._id].sort().join('-');
        overall[key] = false;
      });
    });

    fx.forEach((roundFx) => {
      roundFx.forEach((fix) => {
        if (fix.homeTeam && fix.awayTeam) {
          const mk = [fix.homeTeam._id, fix.awayTeam._id].sort().join('-');
          if (overall.hasOwnProperty(mk)) {
            overall[mk] = true;
          }
        }
      });
    });
    setMatchupTracker(overall);

    const newPR: { [round: number]: { [teamId: string]: boolean } } = {};
    fx.forEach((roundFx, rIndex) => {
      const roundNo = rIndex + 1;
      newPR[roundNo] = {};
      selectedTeams.forEach((t) => {
        newPR[roundNo][t._id] = false;
      });
      roundFx.forEach((fix) => {
        if (fix.homeTeam && fix.awayTeam) {
          newPR[roundNo][fix.homeTeam._id] = true;
          newPR[roundNo][fix.awayTeam._id] = true;
        }
      });
    });
    setPerRoundTeamTracker(newPR);
  };

  const handleTeamSelectionForFixture = async (
    roundIndex: number,
    fixtureIndex: number,
    teamType: 'teamA' | 'teamB',
    teamId: string
  ) => {
    const updated = [...fixtures];
    const fix = { ...updated[roundIndex][fixtureIndex] };
    const foundTeam = selectedTeams.find((t) => t._id === teamId);

    if (teamType === 'teamA') {
      fix.homeTeam = foundTeam || ({ _id: teamId, teamName: 'Unknown' } as Team);
    } else {
      fix.awayTeam = foundTeam || ({ _id: teamId, teamName: 'Unknown' } as Team);
    }
    fix.stadium = null;
    fix.location = '';
    fix.touched = true;

    if (fix.homeTeam && fix.awayTeam) {
      try {
        const res = await axios.get('http://localhost:5003/api/manual-fixtures/previous-fixture', {
          params: {
            season,
            teamAId: fix.homeTeam._id,
            teamBId: fix.awayTeam._id,
          },
        });
        const data = res.data;
        fix.homeTeam = data.homeTeam;
        fix.awayTeam = data.awayTeam;
        fix.stadium = data.stadium;
        fix.location = data.location;
        fix.previousFixture = data.previousFixture;

        updated[roundIndex][fixtureIndex] = fix;
        setFixtures(updated);
        checkConstraints(updated);
        updateTrackers(updated);
      } catch (err) {
        console.error('Error fetching previous fixture:', err);
      }
    } else {
      updated[roundIndex][fixtureIndex] = fix;
      setFixtures(updated);
      checkConstraints(updated);
      updateTrackers(updated);
    }
  };

  const handleDateChange = (roundIndex: number, fixtureIndex: number, date: string) => {
    const updated = [...fixtures];
    const fix = { ...updated[roundIndex][fixtureIndex] };
    fix.date = date;
    fix.touched = true;
    updated[roundIndex][fixtureIndex] = fix;
    setFixtures(updated);
    checkConstraints(updated);
    updateTrackers(updated);
  };

  const handleResetFixture = (roundIndex: number, fixtureIndex: number) => {
    const updated = [...fixtures];
    updated[roundIndex][fixtureIndex] = {
      round: roundIndex + 1,
      date: '',
      homeTeam: null,
      awayTeam: null,
      stadium: null,
      location: '',
      touched: false,
    };
    setFixtures(updated);
    checkConstraints(updated);
    updateTrackers(updated);
  };

  const toggleRoundCollapse = (roundIndex: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundIndex)) next.delete(roundIndex);
      else next.add(roundIndex);
      return next;
    });
  };

  const toggleFixtureCollapse = (roundIndex: number, fixtureIndex: number) => {
    const key = `${roundIndex}-${fixtureIndex}`;
    setCollapsedFixtures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isDateWithinAllowedRange = (ds: string) => {
    const d = new Date(ds);
    const month = d.getUTCMonth();
    const dow = d.getUTCDay();
    const hr = d.getUTCHours();
    const mm = d.getUTCMinutes();


    if (month !== 1 && month !== 2) return false;
    if (dow === 5) {
      return hr >= 18;
    } else if (dow === 6) {
      return true;
    } else if (dow === 0) {
      return hr < 20 || (hr === 20 && mm === 0);
    }
    return false;
  };

function getWeekend(d: Date): string {
  const dow = d.getUTCDay();   // Sunday=0, Monday=1, ... Saturday=6 //! check later as could mess up weekends
  const dd = d.getUTCDate();
  const mm = d.getUTCMonth(); // January=0, February=1, ... December=11
  const yy = d.getUTCFullYear();

  let offset = 0;  
  if (dow === 5) {
    offset = 1;
  }
  else if (dow === 0) {
    offset = -1;
  }
  const anchorDate = new Date(Date.UTC(yy, mm, dd + offset));

  return `${anchorDate.getUTCFullYear()}-${anchorDate.getUTCMonth()}-${anchorDate.getUTCDate()}`;
}

  const getPreviousWeekend = (d: Date) => {
    const dow = d.getUTCDay();
    const dd = d.getUTCDate();
    const mm = d.getUTCMonth();
    const yy = d.getUTCFullYear();
    const offset = -((dow + 1) % 7) - 1;
    const prevSat = new Date(Date.UTC(yy, mm, dd + offset));
    return `${prevSat.getUTCFullYear()}-${prevSat.getUTCMonth()}-${prevSat.getUTCDate()}`;
  };

  const getWeekOfMonth = (d: Date): number => {
    const day = d.getUTCDate();
    return Math.ceil(day / 7);
  };
  const checkConstraints = (fx: Fixture[][]) => {
    const errors: ValidationError[] = [];
    const constraints: { [key: string]: boolean } = {};
    const roundConflicts: { round1: number; round2: number }[] = [];
    const conflictMap: { [key: string]: ConflictSuggestion[] } = {};
    const touched: { fixture: Fixture; roundIndex: number; fixtureIndex: number }[] = [];
    for (let rI = 0; rI < fx.length; rI++) {
      for (let fI = 0; fI < fx[rI].length; fI++) {
        const fix = fx[rI][fI];
        if (fix.touched) {
          touched.push({ fixture: fix, roundIndex: rI, fixtureIndex: fI });
        }
      }
    }
  
    if (touched.length === 0) {
      setValidationErrors([]);
      setConstraintChecks({});
      setConflictingRounds([]);
      setConflictSuggestions({});
      setUnfeasibleMatchupReasons({});
      return;
    }
  
    const completedFixtures = touched.filter(
      ({ fixture }) => fixture.homeTeam && fixture.awayTeam && fixture.date
    );
  
    if (completedFixtures.length === 0) {
      setValidationErrors([]);
      setConstraintChecks({});
      setConflictingRounds([]);
      setConflictSuggestions({});
      setUnfeasibleMatchupReasons({});
      return;
    }
  
    let playsOncePerRound = true;
    let teamPlaysOnlyOncePerRound = true;
  
    for (let rI = 0; rI < fx.length; rI++) {
      const roundFx = fx[rI];
      let roundTouched = false;
      const tracker = new Map<string, boolean>();
  
      for (let fI = 0; fI < roundFx.length; fI++) {
        const fix = roundFx[fI];
        if (!fix.homeTeam || !fix.awayTeam || !fix.date) continue;
  
        roundTouched = true;
  
        if (fix.homeTeam) {
          if (tracker.has(fix.homeTeam._id)) {
            teamPlaysOnlyOncePerRound = false;
            errors.push({
              message: `Team ${fix.homeTeam.teamName} is scheduled multiple times in Round ${fix.round}.`,
              fixtureIndices: { roundIndex: rI, fixtureIndex: fI },
            });
          } else {
            tracker.set(fix.homeTeam._id, true);
          }
        }
        if (fix.awayTeam) {
          if (tracker.has(fix.awayTeam._id)) {
            teamPlaysOnlyOncePerRound = false;
            errors.push({
              message: `Team ${fix.awayTeam.teamName} is scheduled multiple times in Round ${fix.round}.`,
              fixtureIndices: { roundIndex: rI, fixtureIndex: fI },
            });
          } else {
            tracker.set(fix.awayTeam._id, true);
          }
        }
      }
  
      if (roundTouched) {
        const foundTeams = tracker.size;
        const expectedTeams = roundFx.length * 2;
        if (foundTeams !== expectedTeams) {
          playsOncePerRound = false;
          errors.push({
            message: `Round ${rI + 1} does not have all teams scheduled.`,
          });
        }
      }
    }
  
    constraints['playsOncePerRound'] = playsOncePerRound;
    constraints['teamPlaysOnlyOncePerRound'] = teamPlaysOnlyOncePerRound;
  

    let validMatchups = true;
    let noSelfPlay = true;
    const used = new Map<string, { roundIndex: number; fixtureIndex: number }>();
    for (let item of completedFixtures) {
      const { fixture, roundIndex, fixtureIndex } = item;
      const tA = fixture.homeTeam!._id;
      const tB = fixture.awayTeam!._id;
      if (tA === tB) {
        noSelfPlay = false;
        errors.push({
          message: `Team ${fixture.homeTeam?.teamName ?? 'Unknown'} is playing itself.`,
          fixtureIndices: { roundIndex, fixtureIndex },
        });
        continue;
      }
  
      const mk = [tA, tB].sort().join('-');
      if (used.has(mk)) {
        validMatchups = false;
        errors.push({
          message: `Duplicate matchup: ${fixture.homeTeam?.teamName ?? 'Unknown'} vs ${fixture.awayTeam?.teamName ?? 'Unknown'}.`,
          fixtureIndices: { roundIndex, fixtureIndex },
        });
        const existing = used.get(mk)!;
        const suggestion: ConflictSuggestion = {
          fixtureToReset: { roundIndex, fixtureIndex },
          conflictingFixture: { roundIndex: existing.roundIndex, fixtureIndex: existing.fixtureIndex },
        };
        const key = `${roundIndex}-${fixtureIndex}`;
        if (!conflictMap[key]) conflictMap[key] = [];
        conflictMap[key].push(suggestion);
      } else {
        used.set(mk, { roundIndex, fixtureIndex });
      }
    }
  
    constraints['eachTeamPlaysEachOther'] = validMatchups;
    constraints['noSelfPlay'] = noSelfPlay;
  
    let validDates = true;
    let datesInFebMarch = true;
    const roundDateMap = new Map<number, Date>();
  
    for (let item of completedFixtures) {
      const { fixture, roundIndex, fixtureIndex } = item;
      const d = new Date(fixture.date!);
      if (!isDateWithinAllowedRange(fixture.date!)) {
        validDates = false;
        errors.push({
          message: `Invalid date/time for ${fixture.homeTeam?.teamName} vs ${fixture.awayTeam?.teamName}.`,
          fixtureIndices: { roundIndex, fixtureIndex },
        });
      }
      const mo = d.getUTCMonth();
      if (mo !== 1 && mo !== 2) {
        datesInFebMarch = false;
        errors.push({
          message: `Fixture must be in Feb or Mar: ${fixture.homeTeam?.teamName} vs ${fixture.awayTeam?.teamName}.`,
          fixtureIndices: { roundIndex, fixtureIndex },
        });
      }
  
      if (!roundDateMap.has(fixture.round)) {
        roundDateMap.set(fixture.round, d);
      } else {
        const existingDate = roundDateMap.get(fixture.round)!;
        if (getWeekend(existingDate) !== getWeekend(d)) {
          validDates = false;
          errors.push({
            message: `All fixtures in Round ${fixture.round} must be on the same weekend.`,
            fixtureIndices: { roundIndex, fixtureIndex },
          });
        }
      }
    }
  
    constraints['datesWithinAllowedRange'] = validDates && datesInFebMarch;
  
    const weekendToRounds = new Map<string, number[]>();
    roundDateMap.forEach((date, r) => {
      const wkd = getWeekend(date);
      if (weekendToRounds.has(wkd)) {
        weekendToRounds.get(wkd)!.push(r);
      } else {
        weekendToRounds.set(wkd, [r]);
      }
    });
  
    weekendToRounds.forEach((rnds, wkd) => {
      if (rnds.length > 1) {
        for (let i = 0; i < rnds.length; i++) {
          for (let j = i + 1; j < rnds.length; j++) {
            roundConflicts.push({ round1: rnds[i], round2: rnds[j] });
            errors.push({
              message: `Rounds ${rnds[i]} and ${rnds[j]} share the same weekend (${wkd}).`,
            });
          }
        }
      }
    });
    constraints['conflictingRounds'] = roundConflicts.length === 0;
  
    let roundsInOrder = true;
    for (let i = 2; i <= fx.length; i++) {
      const prev = roundDateMap.get(i - 1);
      const curr = roundDateMap.get(i);
      if (prev && curr && curr <= prev) {
        roundsInOrder = false;
        errors.push({
          message: `Round ${i} must be after Round ${i - 1}.`,
        });
      }
    }
    constraints['roundsInOrder'] = roundsInOrder;
  
    let round1InFirstWeek = true;
    const r1Date = roundDateMap.get(1);
    if (r1Date) {
      if (getWeekOfMonth(r1Date) !== 1) {
        round1InFirstWeek = false;
        errors.push({ message: 'Round 1 must be in the first week of February.' });
      }
    }
    constraints['round1InFirstWeek'] = round1InFirstWeek;
  
    let noRoundsBeforeRound1 = true;
    if (r1Date) {
      const prevWkd = getPreviousWeekend(r1Date);
      weekendToRounds.forEach((rnds, wkd) => {
        if (wkd === prevWkd) {
          rnds.forEach((rr) => {
            errors.push({ message: `Round ${rr} is on the weekend before Round 1.` });
          });
          noRoundsBeforeRound1 = false;
        }
      });
    }
    constraints['noRoundsBeforeRound1'] = noRoundsBeforeRound1;
  
    const allTouched = fx.every((rFx) => rFx.every((f) => f.touched));
    constraints['allFixturesTouched'] = allTouched;
  
    setValidationErrors(errors);
    setConstraintChecks(constraints);
    setConflictingRounds(roundConflicts);
    setConflictSuggestions(conflictMap);
  };
  
  const saveFixtures = async () => {
    setLoading(true);
    const allFx = fixtures.flat();
    const toSave = allFx.map((fx) => ({
      round: fx.round,
      date: fx.date,
      homeTeam: fx.homeTeam?._id,
      awayTeam: fx.awayTeam?._id,
      stadium: fx.stadium?._id,
      location: fx.location,
      season,
    }));

    try {
      const validateResp = await axios.post('http://localhost:5003/api/manual-fixtures/validate', {
        fixtures: toSave,
        season,
      });
      if (validateResp.data.message === 'Fixtures are valid') {
        await axios.post('http://localhost:5003/api/manual-fixtures/save', {
          fixtures: toSave,
          season,
        });
        alert('Fixtures saved successfully!');
      } else {
        alert('Fixtures validation failed');
      }
    } catch (error: any) {
      console.error('Error saving fixtures:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        setValidationErrors(error.response.data.errors.map((msg: string) => ({ message: msg })));
      } else {
        setValidationErrors([{ message: 'Unknown error occurred' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const allConstraintsSatisfied = useMemo(() => {
    return Object.values(constraintChecks).every((val) => val !== false);
  }, [constraintChecks]);

  const suggestMatchups = (rI: number, fI: number): string[] => {
    const out: string[] = [];
    const roundNo = rI + 1;
    const scheduled = Object.keys(perRoundTeamTracker[roundNo] || {}).filter(
      (id) => perRoundTeamTracker[roundNo][id]
    );
    const avails = selectedTeams.filter((t) => !scheduled.includes(t._id));

    for (let i = 0; i < avails.length; i++) {
      for (let j = i + 1; j < avails.length; j++) {
        const tA = avails[i];
        const tB = avails[j];
        const mk = [tA._id, tB._id].sort().join('-');
        if (!matchupTracker[mk]) {
          out.push(`${tA.teamName} vs ${tB.teamName}`);
        }
      }
    }
    return out;
  };

  const toggleSuggestions = (rI: number, fI: number) => {
    const key = `${rI}-${fI}`;
    setShowSuggestions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generateConflictSolutions = (rI: number, fI: number): ConflictSuggestion[] => {
    const key = `${rI}-${fI}`;
    return conflictSuggestions[key] || [];
  };

  const getUnfeasibleMatchupReasons = useMemo(() => {
    const reasons: { [key: string]: UnfeasibleMatchupReason[] } = {};
    for (let rI = 0; rI < fixtures.length; rI++) {
      for (let fI = 0; fI < fixtures[rI].length; fI++) {
        const key = `${rI}-${fI}`;
        if (showSuggestions[key] && !suggestMatchups(rI, fI).length) {
          const roundNo = rI + 1;
          const scheduled = Object.keys(perRoundTeamTracker[roundNo] || {}).filter(
            (id) => perRoundTeamTracker[roundNo][id]
          );
          const avails = selectedTeams.filter((t) => !scheduled.includes(t._id));
          const temp: UnfeasibleMatchupReason[] = [];

          for (let i = 0; i < avails.length; i++) {
            for (let j = i + 1; j < avails.length; j++) {
              const tA = avails[i];
              const tB = avails[j];
              const mk = [tA._id, tB._id].sort().join('-');
              if (matchupTracker[mk]) {
                temp.push({
                  teamA: tA,
                  teamB: tB,
                  reason: 'Already played each other.',
                });
              } else {
                temp.push({
                  teamA: tA,
                  teamB: tB,
                  reason: 'Unknown conflict.',
                });
              }
            }
          }
          reasons[key] = temp;
        }
      }
    }
    return reasons;
  }, [fixtures, perRoundTeamTracker, selectedTeams, matchupTracker, showSuggestions]);

  const ConstraintBadge = ({ valid }: { valid: boolean }) =>
    valid ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        OK
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Issue
      </span>
    );

  const TeamSelection = () => (
    < div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-6 mb-8 space-y-6">
          <div className="flex flex-col items-center">
            <label
              htmlFor="season"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            >
              Season:
            </label>
            <input
              type="number"
              id="season"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value))}
              min={2000}
              className="border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 
                         rounded px-3 py-1 w-60 text-center"
            />
          </div>

    <div className="text-center mb-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Select 6 Teams for the Season
      </h3>
      {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}

      <div className="inline-flex flex-wrap gap-4 justify-center">
      {teams.map((team) => {
      const selected = selectedTeamIds.has(team._id);
      const { backgroundColor, textColor } = getTeamColor(team.teamName);

      return (
        <button
          key={team._id}
          onClick={() => toggleSelectedTeam(team._id)}
          className={`
                      px-4 py-3 text-sm font-medium rounded-md focus:outline-none 
                      focus:ring-2 focus:ring-blue-500 transition-colors
                      w-44 h-20 flex flex-col items-center justify-center
                      relative border border-black dark:border-white
                    `}
          style={{
            backgroundColor,
            color: textColor,
            opacity: selected ? 1 : 0.85,
          }}
        >
          {team.image && (
            <img
              src={`http://localhost:5003${team.image}`}
              alt={`${team.teamName} Logo`}
              className="w-8 h-8 object-contain rounded-full mb-1"
              style={{ backgroundColor: '#fff' }}
            />
          )}
          <span className="whitespace-nowrap font-semibold">{team.teamName}</span>
          {selected && <span className="text-xs font-bold mt-1">SELECTED</span>}
        </button>
      );
    })}

      </div>

      <p className="mt-4 text-gray-600 dark:text-gray-300">
        {selectedTeamIds.size} of 6 teams selected.
      </p>

      <button
        onClick={() => {
          if (validateTeamCount()) {
            const sel = teams.filter((t) => selectedTeamIds.has(t._id));
            setSelectedTeams(sel);
            initializeFixtures(sel);
            initializeMatchupTracker(sel);
            initializePerRoundTeamTracker(sel);
            setStep('input');
          }
        }}
        className="block mt-6 mx-auto px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 
                   focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
      >
        Proceed to Schedule Fixtures
      </button>
    </div>
    </div>
  );

  const tableHeaderClass =
    'border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
  const tableCellClass =
    'border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-200';

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <>
    <ManualSchedulerSplash
      show={showSplash}
      onClose={() => setShowSplash(false)}
    />
    
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 
                 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8
                 transition-colors duration-300"
    >

      <div className="max-w-7xl w-full mb-8">
        <div
          className="flex justify-between items-center px-4 py-2
                     bg-gray-100 dark:bg-gray-800 rounded-md"
        >
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/ Admin /</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Manual Fixture Scheduler
            </span>
          </nav>

                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setShowSplash(true)}
                          className="flex items-center justify-center w-9 h-9 bg-gray-200 dark:bg-gray-700
                                     text-gray-800 dark:text-gray-200 rounded-md
                                     hover:bg-gray-300 dark:hover:bg-gray-600
                                     transition-colors duration-200 focus:outline-none
                                     focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                          aria-label="Show Splash Info"
                        >
                          <svg
                            className="w-5 h-5"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={toggleDarkMode}
                          className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 
                                     text-gray-800 dark:text-gray-200 rounded-md 
                                     hover:bg-gray-300 dark:hover:bg-gray-600 
                                     transition-colors duration-200 focus:outline-none 
                                     focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                          aria-label="Toggle Dark Mode"
                        >
                          {isDarkMode ? (
                            <>
                              <FaSun className="mr-2" />
                              Light Mode
                            </>
                          ) : (
                            <>
                              <FaMoon className="mr-2" />
                              Dark Mode
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

      <div className="max-w-7xl w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 transition-colors duration-300">
        <div className="text-left mb-6">
          <h2 className="font-extrabold text-gray-900 dark:text-gray-100 mb-2 text-3xl">
                  Manual Fixture Scheduler
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-2 text-base">
          This interface allows you to manually schedule your fixtures using an interactive interface with a live tracker that ensures every round is fully scheduled and adheres to Six Nations rules. 
          Benefit from real-time constraint checking and handy suggestion buttons that offer valid matchups to fill any gaps in your schedule.
          </p>
          <br />
          <p className="text-gray-500 dark:text-gray-400 italic text-xs">
          Note: Because scheduling is sequential, some combinations might later prove infeasible. In such cases, feedback is provided to help you backtrack and correct errors.
          </p>
          <br />

      </div>

        <div className="grid grid-cols-1 lg:grid-cols-[repeat(14,minmax(0,1fr))] gap-4">
          <div className="lg:col-span-4 sticky top-4 space-y-4">
            {(step === 'input' || step === 'summary') && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">
                  Constraints
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <li className="flex justify-between">
                    <span>All teams play once per round.</span>
                    <ConstraintBadge
                      valid={
                        constraintChecks['playsOncePerRound'] &&
                        constraintChecks['teamPlaysOnlyOncePerRound']
                      }
                    />
                  </li>
                  <li className="flex justify-between">
                    <span>All teams plays every other team once.</span>
                    <ConstraintBadge valid={constraintChecks['eachTeamPlaysEachOther']} />
                  </li>
                  <li className="flex justify-between">
                    <span>Dates & times within allowed ranges.</span>
                    <ConstraintBadge valid={constraintChecks['datesWithinAllowedRange']} />
                  </li>
                  <li className="flex justify-between">
                    <span>Round 1 in first week of Feb.</span>
                    <ConstraintBadge valid={constraintChecks['round1InFirstWeek']} />
                  </li>
                  <li className="flex justify-between">
                    <span>Round 1 must be first </span>
                    <ConstraintBadge valid={constraintChecks['noRoundsBeforeRound1']} />
                  </li>
                  <li className="flex justify-between">
                    <span>Rounds in chronological order.</span>
                    <ConstraintBadge valid={constraintChecks['roundsInOrder']} />
                  </li>
                  <li className="flex justify-between">
                    <span>No Conflicting Rounds.</span>
                    <ConstraintBadge valid={constraintChecks['conflictingRounds']} />
                  </li>
                  <li className="flex justify-between">
                    <span>No team plays itself.</span>
                    <ConstraintBadge valid={constraintChecks['noSelfPlay']} />
                  </li>
                  <li className="flex justify-between">
                    <span>All fixtures are filled.</span>
                    <ConstraintBadge valid={constraintChecks['allFixturesTouched']} />
                  </li>
                </ul>
              </div>
            )}

            {(step === 'input' || step === 'summary') && (
              <div
                className={`
                  p-4 rounded
                  ${
                    validationErrors.length > 0
                      ? 'bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-600'
                      : 'bg-green-50 dark:bg-green-900 border border-green-300 dark:border-green-600'
                  }
                `}
              >
                <h4
                  className={`
                    text-md font-semibold mb-2
                    ${
                      validationErrors.length > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }
                  `}
                >
                  Validation Errors
                </h4>
                {validationErrors.length === 0 ? (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    No validation errors found.
                  </p>
                ) : (
                  <ul className="list-disc list-inside text-sm space-y-1 text-red-600 dark:text-red-300">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            {step === 'selectTeams' && <TeamSelection />}

            {step === 'input' && (
              <>
                {fixtures.map((roundFixtures, roundIndex) => {
                  const isCollapsed = collapsedRounds.has(roundIndex);
                  const isConflicting = conflictingRounds.some(
                    (c) => c.round1 === roundIndex + 1 || c.round2 === roundIndex + 1
                  );

                  return (
                    <div key={roundIndex} className="mb-6">
                      <div
                        className={`
                          w-full px-4 py-2 rounded mb-2 font-bold flex items-center justify-between
                          ${
                            isConflicting
                              ? 'bg-red-100 border border-red-300 text-red-800'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border'
                          }
                        `}
                      >
                        <span>
                          Round {roundIndex + 1} {isConflicting && '(Conflicting)'}
                        </span>
                        {isCollapsed ? (
                          <button
                            onClick={() => toggleRoundCollapse(roundIndex)}
                            className="text-green-600 hover:text-green-800 dark:hover:text-green-400 focus:outline-none"
                          >
                            <FaPlus />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleRoundCollapse(roundIndex)}
                            className="text-red-600 hover:text-red-800 dark:hover:text-red-400 focus:outline-none"
                          >
                            <FaMinus />
                          </button>
                        )}
                      </div>

                      {!isCollapsed && (
                        <div className="space-y-4 px-4">
                          {roundFixtures.map((fixture, fixtureIndex) => {
                            const fixtureErrors = validationErrors.filter(
                              (err) =>
                                err.fixtureIndices?.roundIndex === roundIndex &&
                                err.fixtureIndices.fixtureIndex === fixtureIndex
                            );
                            const hasError = fixtureErrors.length > 0;
                            const key = `${roundIndex}-${fixtureIndex}`;
                            const matchups = suggestMatchups(roundIndex, fixtureIndex);
                            const roundNo = roundIndex + 1;
                            const fix = fixtures[roundIndex][fixtureIndex];
                            const availableTeamsForHome = selectedTeams.filter(
                              (team) =>
                                !perRoundTeamTracker[roundNo][team._id] ||
                                (fix.homeTeam && fix.homeTeam._id === team._id)
                            );

                            const availableTeamsForAway = selectedTeams.filter(
                              (team) =>
                                !perRoundTeamTracker[roundNo][team._id] ||
                                (fix.awayTeam && fix.awayTeam._id === team._id)
                            );

                            if (collapsedFixtures.has(key)) {
                              return (
                                <div
                                  className={`p-4 rounded border ${
                                    hasError
                                      ? 'border-red-500 '
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <h4
                                      className={`text-md font-semibold ${
                                        hasError ? 'text-red-700 dark:text-red-800' : 'text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      Fixture {fixtureIndex + 1}
                                    </h4>

                                    <button
                                      onClick={() => toggleFixtureCollapse(roundIndex, fixtureIndex)}
                                      className="text-blue-600 dark:text-blue-400 focus:outline-none"
                                    >
                                      <FaPlus />
                                    </button>
                                  </div>

                                  <div className="mt-2 text-gray-800 dark:text-gray-200">
                                    {fixture.homeTeam && fixture.awayTeam ? (
                                      <>
                                        <p>
                                          {fixture.homeTeam.teamName} vs {fixture.awayTeam.teamName}
                                        </p>
                                        
                                        {fixture.date ? (
                                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(fixture.date).toLocaleString()}
                                          </p>
                                        ) : (
                                          <p className=" text-red-700 dark:text-red-800 mt-1">
                                            Date not set
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                        <p className="text-red-700 dark:text-red-800">Fixture details missing.</p>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={fixtureIndex}
                                className={`p-4 rounded border text-left ${
                                  hasError
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <h4
                                    className={`text-md font-semibold mb-2 ${
                                      hasError ? 'text-red-700 dark:text-red-800' : 'text-gray-800 dark:text-gray-200'
                                    }`}
                                  >
                                    Fixture {fixtureIndex + 1}
                                  </h4>
                                  <button
                                    onClick={() => toggleFixtureCollapse(roundIndex, fixtureIndex)}
                                    className="text-blue-600 dark:text-blue-400 focus:outline-none"
                                  >
                                    <FaMinus />
                                  </button>
                                </div>

                                <div className="flex items-center space-x-4 mt-3">
                                <select
                                  value={fixture.homeTeam ? fixture.homeTeam._id : ''}
                                  onChange={(e) =>
                                    handleTeamSelectionForFixture(roundIndex, fixtureIndex, 'teamA', e.target.value)
                                  }
                                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 
                                            text-gray-800 dark:text-gray-200 rounded px-2 py-1 w-40"
                                >
                                  <option value="">Select Team A</option>
                                  {availableTeamsForHome.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {t.teamName}
                                    </option>
                                  ))}
                                </select>

                                <span className="text-gray-500 dark:text-gray-400">vs</span>

                                <select
                                  value={fixture.awayTeam ? fixture.awayTeam._id : ''}
                                  onChange={(e) =>
                                    handleTeamSelectionForFixture(roundIndex, fixtureIndex, 'teamB', e.target.value)
                                  }
                                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 
                                            text-gray-800 dark:text-gray-200 rounded px-2 py-1 w-40"
                                >
                                  <option value="">Select Team B</option>
                                  {availableTeamsForAway.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {t.teamName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                                <div className="flex items-center space-x-2 mt-4">
                                  <label
                                    htmlFor={`date-${roundIndex}-${fixtureIndex}`}
                                    className="font-medium text-gray-700 dark:text-gray-200"
                                  >
                                    Date/Time:
                                  </label>
                                  <input
                                    type="datetime-local"
                                    id={`date-${roundIndex}-${fixtureIndex}`}
                                    value={fixture.date}
                                    onChange={(e) =>
                                      handleDateChange(roundIndex, fixtureIndex, e.target.value)
                                    }
                                    className="border border-gray-300 dark:border-gray-600 
                                               bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                                               rounded px-2 py-1"
                                  />
                                </div>

                                {fixtureErrors.length > 0 && (
                                  <div className="text-red-600 mt-3 space-y-1 text-sm">
                                    {fixtureErrors.map((err, eidx) => (
                                      <p key={eidx}>{err.message}</p>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-4 flex justify-between">
                                  <button
                                    onClick={() => toggleSuggestions(roundIndex, fixtureIndex)}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 
                                               focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                  >
                                    {showSuggestions[key] ? 'Hide Suggestions' : 'Show Suggestions'}
                                  </button>
                                  <button
                                    onClick={() => handleResetFixture(roundIndex, fixtureIndex)}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 
                                               focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                  >
                                    Reset
                                  </button>
                                </div>

                                {showSuggestions[key] && (
                                  <div className="mt-4 border-t pt-4 border-gray-200 dark:border-gray-600">
                                    {matchups.length > 0 ? (
                                      <>
                                        <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                          Suggested Matchups:
                                        </h5>
                                        <ul className="list-disc list-inside ml-4 text-gray-700 dark:text-gray-300 mt-1">
                                          {matchups.map((m, idx2) => (
                                            <li key={idx2}>{m}</li>
                                          ))}
                                        </ul>
                                      </>
                                    ) : (
                                      <>
                                        <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                          No Suggestions Available
                                        </h5>
                                        <p className="text-gray-700 dark:text-gray-300 mt-1">
                                          No feasible matchups due to conflicts or duplicates.
                                        </p>
                                        {getUnfeasibleMatchupReasons[key] &&
                                          getUnfeasibleMatchupReasons[key].length > 0 && (
                                            <div className="mt-2">
                                              <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                Available Teams:
                                              </p>
                                              <ul className="list-disc list-inside ml-4 text-gray-700 dark:text-gray-300 mt-1">
                                                {getUnfeasibleMatchupReasons[key].map((r, rIdx) => (
                                                  <li key={rIdx}>
                                                    {r.teamA.teamName} vs {r.teamB.teamName}: {r.reason}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        {generateConflictSolutions(roundIndex, fixtureIndex).length > 0 ? (
                                          <div className="mt-2">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                                              Suggested Actions:
                                            </p>
                                            <ul className="list-disc list-inside ml-4 text-gray-700 dark:text-gray-300 mt-1">
                                              {generateConflictSolutions(roundIndex, fixtureIndex).map((c, cIdx) => (
                                                <li key={cIdx}>
                                                  Reset{' '}
                                                  <strong>
                                                    Round {c.conflictingFixture.roundIndex + 1}, Fixture{' '}
                                                    {c.conflictingFixture.fixtureIndex + 1}
                                                  </strong>{' '}
                                                  to free up teams.
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : (
                                          <div className="mt-2">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                                              Possible Solutions:
                                            </p>
                                            <ul className="list-disc list-inside ml-4 text-gray-700 dark:text-gray-300 mt-1">
                                              <li>Reset all fixtures from the current round.</li>
                                              <li>Open the suggestions panel to see all feasible solutions</li>
                                              <li>Refer to the Overall Matchup Tracker to choose fixtures.</li>
                                            </ul>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}

                                {fixture.homeTeam && fixture.awayTeam && fixture.stadium && (
                                  <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    <h5 className="font-medium text-gray-700 dark:text-gray-100 mb-2">
                                      Current Season ({season}) Fixture:
                                    </h5>
                                    <p className="text-gray-800 dark:text-gray-200">
                                      <strong>Home Team:</strong> {fixture.homeTeam.teamName}
                                    </p>
                                    <p className="text-gray-800 dark:text-gray-200">
                                      <strong>Away Team:</strong> {fixture.awayTeam.teamName}
                                    </p>
                                    <p className="text-gray-800 dark:text-gray-200">
                                      <strong>Stadium:</strong> {fixture.stadium.stadiumName}
                                    </p>
                                    <p className="text-gray-800 dark:text-gray-200">
                                      <strong>Location:</strong> {fixture.location}
                                    </p>
                                    <p className="text-blue-600 dark:text-blue-400 italic mt-2">
                                      This matchup must be played at {fixture.stadium.stadiumName}.
                                    </p>

                                    {fixture.previousFixture && (
                                      <div className="mt-4 border-t pt-2 border-gray-200 dark:border-gray-600">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-100 mb-1">
                                          Previous Season ({fixture.previousFixture.season}) Fixture:
                                        </h5>
                                        <p className="text-gray-800 dark:text-gray-200">
                                          {
                                            selectedTeams.find(
                                              (x) => x._id === fixture.previousFixture?.homeTeam
                                            )?.teamName
                                          }{' '}
                                          vs{' '}
                                          {
                                            selectedTeams.find(
                                              (x) => x._id === fixture.previousFixture?.awayTeam
                                            )?.teamName
                                          }
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    if (allConstraintsSatisfied) {
                      setStep('summary');
                    } else {
                      alert(
                        'Please fix the following issues:\n' +
                          validationErrors.map((v) => v.message).join('\n')
                      );
                    }
                  }}
                  disabled={loading}
                  className={`
                    mt-6 px-6 py-2 
                    rounded
                    focus:outline-none 
                    focus:ring-2 
                    focus:ring-blue-500
                    text-white
                    ${
                      loading
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                    }
                  `}
                >
                  Next
                </button>
              </>
            )}

            {step === 'summary' && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
                  Fixture Summary
                </h3>
                <div className="overflow-x-auto mx-auto max-w-3xl">
                  <table className="min-w-full text-left border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr>
                        <th className={tableHeaderClass}>Round</th>
                        <th className={tableHeaderClass}>Date</th>
                        <th className={tableHeaderClass}>Home Team</th>
                        <th className={tableHeaderClass}>Away Team</th>
                        <th className={tableHeaderClass}>Stadium</th>
                        {/* <th className={tableHeaderClass}>Location</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {fixtures.flat().map((fx, idx) => (
                        <tr
                          key={idx}
                          className="border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                        >
                          <td className={tableCellClass}>{fx.round}</td>
                          <td className={tableCellClass}>
                            {fx.date ? new Date(fx.date).toLocaleString() : 'N/A'}
                          </td>
                          <td className={tableCellClass}>{fx.homeTeam?.teamName || 'N/A'}</td>
                          <td className={tableCellClass}>{fx.awayTeam?.teamName || 'N/A'}</td>
                          <td className={tableCellClass}>{fx.stadium?.stadiumName || 'N/A'}</td>
                          {/* <td className={tableCellClass}>{fx.location || 'N/A'}</td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={() => setStep('input')}
                    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 
                               focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={saveFixtures}
                    disabled={loading}
                    className={`
                      px-6 py-2 rounded 
                      focus:outline-none 
                      focus:ring-2 
                      focus:ring-green-500
                      text-white
                      ${
                        loading
                          ? 'bg-green-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }
                    `}
                  >
                    {loading ? 'Saving...' : 'Save Fixtures'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-4 sticky top-4 space-y-4">
            {(step === 'input' || step === 'summary') && (
              <>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    Overall Matchup Tracker
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(matchupTracker).map(([k, scheduled], i) => {
                      const [tAId, tBId] = k.split('-');
                      const tA = selectedTeams.find((t) => t._id === tAId)?.teamName || 'Unknown';
                      const tB = selectedTeams.find((t) => t._id === tBId)?.teamName || 'Unknown';
                      return (
                        <li key={i} className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-200">
                            {tA} vs {tB}
                          </span>
                          {scheduled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Scheduled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Not Scheduled
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    Per-Round Team Tracker
                  </h3>
                  {Object.entries(perRoundTeamTracker).map(([roundNo, statuses]) => (
                    <div key={roundNo} className="mb-4">
                      <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-2 text-sm">
                        Round {roundNo}
                      </h4>
                      <ul className="space-y-1">
                        {selectedTeams.map((team) => (
                          <li
                            key={team._id}
                            className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200"
                          >
                            <span>{team.teamName}</span>
                            {statuses[team._id] ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Playing
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Not Playing
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ManualFixtureScheduler;
