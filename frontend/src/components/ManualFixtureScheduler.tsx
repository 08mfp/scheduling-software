// ManualFixtureScheduler.tsx

import React, { useState, useEffect, useMemo, useContext } from 'react';
import axios from 'axios';
import { Team, Fixture } from '../interfaces/ManualFixture';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';


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
  

  const ManualFixtureScheduler: React.FC<ManualFixtureSchedulerProps> = ({ initialFixtures }) => {
  const [season, setSeason] = useState<number>(new Date().getFullYear() + 1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[][]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [constraintChecks, setConstraintChecks] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<'input' | 'summary'>('input');
  

  // Authentication Context
  const { user, apiKey } = useContext(AuthContext);

  
  // State for overall matchup tracker
  const [matchupTracker, setMatchupTracker] = useState<{ [key: string]: boolean }>({});

  // State for per-round team tracker
  const [perRoundTeamTracker, setPerRoundTeamTracker] = useState<{ [round: number]: { [teamId: string]: boolean } }>({});

  // State to track visibility of suggestions per fixture
  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({});

  // State to track conflicting rounds
  const [conflictingRounds, setConflictingRounds] = useState<{ round1: number; round2: number }[]>([]);

  // State for conflict suggestions
  const [conflictSuggestions, setConflictSuggestions] = useState<{ [key: string]: ConflictSuggestion[] }>({});

  // State for unfeasible matchup reasons
  const [unfeasibleMatchupReasons, setUnfeasibleMatchupReasons] = useState<{ [key: string]: UnfeasibleMatchupReason[] }>({});

  // Fetch teams and initialize fixtures and trackers on component mount
  useEffect(() => {
    if (user && user.role === 'admin') {
      const fetchTeams = async () => {
        try {
          const response = await axios.get('http://localhost:5003/api/teams', {
            headers: {
              'x-api-key': apiKey,
            },
          });
          const teamData: Team[] = response.data || [];
          setTeams(teamData);
          initializeMatchupTracker(teamData);
          initializePerRoundTeamTracker(teamData);
        } catch (error) {
          console.error('Error fetching teams:', error);
        }
      };
      fetchTeams();
      initializeFixtures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Initialize fixtures with 5 rounds and 3 fixtures per round
  const initializeFixtures = () => {
    const initialFixtures: Fixture[][] = [];
    for (let round = 1; round <= 5; round++) {
      const roundFixtures: Fixture[] = [];
      for (let i = 0; i < 3; i++) {
        roundFixtures.push({
          round,
          date: '',
          homeTeam: null,
          awayTeam: null,
          stadium: null,
          location: '',
          touched: false, // Initialize as not touched
        });
      }
      initialFixtures.push(roundFixtures);
    }
    setFixtures(initialFixtures);
  };

  // Initialize overall matchup tracker
  const initializeMatchupTracker = (teamList: Team[]) => {
    const tracker: { [key: string]: boolean } = {};
    for (let i = 0; i < teamList.length; i++) {
      for (let j = i + 1; j < teamList.length; j++) {
        const teamA = teamList[i];
        const teamB = teamList[j];
        const matchupKey = `${teamA._id}-${teamB._id}`;
        tracker[matchupKey] = false; // Initially not scheduled
      }
    }
    setMatchupTracker(tracker);
  };

  // Initialize per-round team tracker
  const initializePerRoundTeamTracker = (teamList: Team[]) => {
    const perRoundTracker: { [round: number]: { [teamId: string]: boolean } } = {};
    for (let round = 1; round <= 5; round++) {
      perRoundTracker[round] = {};
      teamList.forEach(team => {
        perRoundTracker[round][team._id] = false; // Initially not scheduled
      });
    }
    setPerRoundTeamTracker(perRoundTracker);
  };

  // Update both overall and per-round trackers
  const updateTrackers = (fixturesToCheck: Fixture[][]) => {
    // Update overall matchup tracker
    const overallTracker: { [key: string]: boolean } = {};
    // Initialize all matchups as not scheduled
    teams.forEach((teamA, i) => {
      teams.slice(i + 1).forEach(teamB => {
        const matchupKey = `${teamA._id}-${teamB._id}`;
        overallTracker[matchupKey] = false;
      });
    });

    for (let roundFixtures of fixturesToCheck) {
      for (let fixture of roundFixtures) {
        if (fixture.homeTeam && fixture.awayTeam) {
          const teamAId = fixture.homeTeam._id;
          const teamBId = fixture.awayTeam._id;
          const matchupKey = [teamAId, teamBId].sort().join('-');

          if (overallTracker.hasOwnProperty(matchupKey)) {
            overallTracker[matchupKey] = true;
          }
        }
      }
    }
    setMatchupTracker(overallTracker);

    // Update per-round team tracker
    const newPerRoundTracker: { [round: number]: { [teamId: string]: boolean } } = {};
    fixturesToCheck.forEach((roundFixtures, roundIndex) => {
      const roundNumber = roundIndex + 1;
      newPerRoundTracker[roundNumber] = {};
      teams.forEach(team => {
        newPerRoundTracker[roundNumber][team._id] = false; // Initialize as not scheduled
      });
      roundFixtures.forEach(fixture => {
        if (fixture.homeTeam && fixture.awayTeam) {
          newPerRoundTracker[roundNumber][fixture.homeTeam._id] = true;
          newPerRoundTracker[roundNumber][fixture.awayTeam._id] = true;
        }
      });
    });
    setPerRoundTeamTracker(newPerRoundTracker);
  };

  // Handle team selection for home and away teams
  const handleTeamSelection = async (
    roundIndex: number,
    fixtureIndex: number,
    teamType: 'teamA' | 'teamB',
    teamId: string
  ) => {
    const newFixtures = [...fixtures];
    const fixture = { ...newFixtures[roundIndex][fixtureIndex] };

    // Find the selected team
    const selectedTeam = teams.find(team => team._id === teamId);
    if (teamType === 'teamA') {
      fixture.homeTeam = selectedTeam || { _id: teamId, teamName: 'Unknown Team' } as Team;
    } else {
      fixture.awayTeam = selectedTeam || { _id: teamId, teamName: 'Unknown Team' } as Team;
    }

    // Reset stadium and location since home/away may change
    fixture.stadium = null;
    fixture.location = '';
    fixture.touched = true; // Mark fixture as touched

    // If both teams are selected, fetch home/away info
    if (fixture.homeTeam && fixture.awayTeam) {
      try {
        const response = await axios.get(
          'http://localhost:5003/api/manual-fixtures/previous-fixture',
          {
            params: {
              season,
              teamAId: fixture.homeTeam._id,
              teamBId: fixture.awayTeam._id,
            },
          }
        );
        const data = response.data;
        fixture.homeTeam = data.homeTeam;
        fixture.awayTeam = data.awayTeam;
        fixture.stadium = data.stadium;
        fixture.location = data.location;
        fixture.previousFixture = data.previousFixture;
        // Update fixtures
        newFixtures[roundIndex][fixtureIndex] = fixture;
        setFixtures(newFixtures);
        // Re-validate constraints
        checkConstraints(newFixtures);
        // Update trackers
        updateTrackers(newFixtures);
      } catch (error) {
        console.error('Error fetching previous fixture:', error);
      }
    } else {
      // Update fixtures
      newFixtures[roundIndex][fixtureIndex] = fixture;
      setFixtures(newFixtures);
      // Re-validate constraints
      checkConstraints(newFixtures);
      // Update trackers
      updateTrackers(newFixtures);
    }
  };

  // Handle date change for fixtures
  const handleDateChange = (roundIndex: number, fixtureIndex: number, date: string) => {
    const newFixtures = [...fixtures];
    const fixture = { ...newFixtures[roundIndex][fixtureIndex] };
    fixture.date = date;
    fixture.touched = true; // Mark fixture as touched
    newFixtures[roundIndex][fixtureIndex] = fixture;
    setFixtures(newFixtures);
    checkConstraints(newFixtures);
    // Update trackers since date might influence constraints
    updateTrackers(newFixtures);
  };

  // Handle resetting a fixture to default
  const handleResetFixture = (roundIndex: number, fixtureIndex: number) => {
    const newFixtures = [...fixtures];
    const fixtureToReset = newFixtures[roundIndex][fixtureIndex];

    // Reset the fixture
    newFixtures[roundIndex][fixtureIndex] = {
      round: roundIndex + 1,
      date: '',
      homeTeam: null,
      awayTeam: null,
      stadium: null,
      location: '',
      touched: false,
    };
    setFixtures(newFixtures);
    // Re-validate constraints
    checkConstraints(newFixtures);
    // Update trackers based on the new fixtures
    updateTrackers(newFixtures);
  };

  // Check if the date is within the allowed range
  const isDateWithinAllowedRange = (dateString: string): boolean => {
    const date = new Date(dateString);
    const month = date.getUTCMonth(); // January = 0
    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay(); // Sunday = 0
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    // Games must be in February or March
    if (month !== 1 && month !== 2) {
      return false;
    }

    // Friday, Saturday, Sunday only
    if (dayOfWeek === 5) { // Friday
      return hours >= 18;
    } else if (dayOfWeek === 6) { // Saturday
      return true;
    } else if (dayOfWeek === 0) { // Sunday
      return hours < 20 || (hours === 20 && minutes === 0);
    } else {
      return false;
    }
  };

  // Get the weekend (Saturday) date as a string
  const getWeekend = (date: Date): string => {
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    // Adjust date to Saturday
    const dayOfWeek = date.getUTCDay(); // Sunday = 0
    const saturdayOffset = (6 - dayOfWeek + 7) % 7;
    const saturday = new Date(Date.UTC(year, month, day + saturdayOffset));
    return `${saturday.getUTCFullYear()}-${saturday.getUTCMonth()}-${saturday.getUTCDate()}`;
  };

  // Get the previous weekend (Saturday) date as a string
  const getPreviousWeekend = (date: Date): string => {
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    // Adjust date to previous Saturday
    const dayOfWeek = date.getUTCDay(); // Sunday = 0
    const saturdayOffset = -((dayOfWeek + 1) % 7) - 1;
    const previousSaturday = new Date(Date.UTC(year, month, day + saturdayOffset));
    return `${previousSaturday.getUTCFullYear()}-${previousSaturday.getUTCMonth()}-${previousSaturday.getUTCDate()}`;
  };

  // Get the week of the month (1-5)
  const getWeekOfMonth = (date: Date): number => {
    const day = date.getUTCDate();
    return Math.ceil(day / 7);
  };

  // Validate constraints based on fixtures
  const checkConstraints = (fixturesToCheck: Fixture[][]) => {
    const errors: ValidationError[] = [];
    const constraints: { [key: string]: boolean } = {};

    const touchedFixturesWithIndices: { fixture: Fixture; roundIndex: number; fixtureIndex: number }[] = [];

    for (let roundIndex = 0; roundIndex < fixturesToCheck.length; roundIndex++) {
      const roundFixtures = fixturesToCheck[roundIndex];
      for (let fixtureIndex = 0; fixtureIndex < roundFixtures.length; fixtureIndex++) {
        const fixture = roundFixtures[fixtureIndex];
        if (fixture.touched) {
          touchedFixturesWithIndices.push({ fixture, roundIndex, fixtureIndex });
        }
      }
    }

    if (touchedFixturesWithIndices.length === 0) {
      // No fixtures have been touched, skip validation
      setConstraintChecks(constraints);
      setValidationErrors(errors);
      setConflictingRounds([]);
      setConflictSuggestions({});
      setUnfeasibleMatchupReasons({});
      return;
    }

    // Check playsOncePerRound and teamPlaysOnlyOncePerRound
    let playsOncePerRound = true;
    let teamPlaysOnlyOncePerRound = true;

    for (let roundIndex = 0; roundIndex < fixturesToCheck.length; roundIndex++) {
      const roundFixtures = fixturesToCheck[roundIndex];
      const teamIdsInRound = new Map<string, { fixtureIndex: number }>();
      let roundTouched = false;

      for (let fixtureIndex = 0; fixtureIndex < roundFixtures.length; fixtureIndex++) {
        const fixture = roundFixtures[fixtureIndex];
        if (!fixture.touched) continue; // Skip untouched fixtures
        roundTouched = true;

        if (fixture.homeTeam) {
          const existing = teamIdsInRound.get(fixture.homeTeam._id);
          if (existing) {
            teamPlaysOnlyOncePerRound = false;
            // Avoid adding this error if the fixture already has a self-play error
            const hasSelfPlayError = errors.some(
              error =>
                error.fixtureIndices?.roundIndex === roundIndex &&
                error.fixtureIndices.fixtureIndex === fixtureIndex &&
                error.message.includes('cannot play against itself')
            );
            if (!hasSelfPlayError) {
              errors.push({
                message: `Team ${fixture.homeTeam.teamName || fixture.homeTeam._id} is scheduled to play more than once in Round ${fixture.round}.`,
                fixtureIndices: { roundIndex, fixtureIndex },
              });
            }
          } else {
            teamIdsInRound.set(fixture.homeTeam._id, { fixtureIndex });
          }
        }

        if (fixture.awayTeam) {
          const existing = teamIdsInRound.get(fixture.awayTeam._id);
          if (existing) {
            teamPlaysOnlyOncePerRound = false;
            // Avoid adding this error if the fixture already has a self-play error
            const hasSelfPlayError = errors.some(
              error =>
                error.fixtureIndices?.roundIndex === roundIndex &&
                error.fixtureIndices.fixtureIndex === fixtureIndex &&
                error.message.includes('cannot play against itself')
            );
            if (!hasSelfPlayError) {
              errors.push({
                message: `Team ${fixture.awayTeam.teamName || fixture.awayTeam._id} is scheduled to play more than once in Round ${fixture.round}.`,
                fixtureIndices: { roundIndex, fixtureIndex },
              });
            }
          } else {
            teamIdsInRound.set(fixture.awayTeam._id, { fixtureIndex });
          }
        }
      }

      // Each round should have exactly number of fixtures * 2 teams
      const totalTeamsInRound = teamIdsInRound.size;
      if (roundTouched) {
        const expectedTeams = fixturesToCheck[roundIndex].length * 2;
        if (totalTeamsInRound !== expectedTeams) {
          playsOncePerRound = false;
          errors.push({
            message: `Round ${roundIndex + 1} does not have all teams scheduled.`,
          });
        }
      }
    }

    constraints['playsOncePerRound'] = playsOncePerRound;
    constraints['teamPlaysOnlyOncePerRound'] = teamPlaysOnlyOncePerRound;

    // Check noSelfPlay and noDuplicateMatchups
    let validMatchups = true;
    let noSelfPlay = true;
    const matchupSet = new Map<string, { fixtureIndices: { roundIndex: number; fixtureIndex: number } }>();
    const conflictSuggestionsMap: { [key: string]: ConflictSuggestion[] } = {};

    for (let { fixture, roundIndex, fixtureIndex } of touchedFixturesWithIndices) {
      if (fixture.homeTeam && fixture.awayTeam) {
        const teamAId = fixture.homeTeam._id;
        const teamBId = fixture.awayTeam._id;
        if (teamAId === teamBId) {
          noSelfPlay = false;
          // Avoid adding duplicate errors
          if (!errors.some(
            error =>
              error.fixtureIndices?.roundIndex === roundIndex &&
              error.fixtureIndices.fixtureIndex === fixtureIndex &&
              error.message.includes('cannot play against itself')
          )) {
            errors.push({
              message: `Team ${fixture.homeTeam.teamName || teamAId} is scheduled to play against itself.`,
              fixtureIndices: { roundIndex, fixtureIndex },
            });
          }
          continue; // Skip further checks for this fixture
        }
        const matchupKey = [teamAId, teamBId].sort().join('-');
        if (matchupSet.has(matchupKey)) {
          validMatchups = false;
          errors.push({
            message: `Duplicate matchup found between teams ${fixture.homeTeam.teamName || teamAId} and ${fixture.awayTeam.teamName || teamBId}.`,
            fixtureIndices: { roundIndex, fixtureIndex },
          });

          // Suggest resetting one of the conflicting fixtures
          const conflictingFixture = matchupSet.get(matchupKey)!.fixtureIndices;
          const suggestion: ConflictSuggestion = {
            fixtureToReset: { roundIndex, fixtureIndex },
            conflictingFixture: { roundIndex: conflictingFixture.roundIndex, fixtureIndex: conflictingFixture.fixtureIndex },
          };

          if (!conflictSuggestionsMap[`${roundIndex}-${fixtureIndex}`]) {
            conflictSuggestionsMap[`${roundIndex}-${fixtureIndex}`] = [];
          }
          conflictSuggestionsMap[`${roundIndex}-${fixtureIndex}`].push(suggestion);
        } else {
          matchupSet.set(matchupKey, { fixtureIndices: { roundIndex, fixtureIndex } });
        }
      }
    }

    constraints['eachTeamPlaysEachOther'] = validMatchups;
    constraints['noSelfPlay'] = noSelfPlay;

    // Check datesWithinAllowedRange and conflicting weekends
    let validDates = true;
    let datesInFebMarch = true;
    let roundDateMap = new Map<number, Date>(); // Map round number to date

    for (let { fixture, roundIndex, fixtureIndex } of touchedFixturesWithIndices) {
      if (fixture.date) {
        const date = new Date(fixture.date);
        if (!isDateWithinAllowedRange(fixture.date)) {
          validDates = false;
          errors.push({
            message: `Fixture between ${fixture.homeTeam?.teamName || fixture.homeTeam?._id} and ${fixture.awayTeam?.teamName || fixture.awayTeam?._id} has an invalid date/time.`,
            fixtureIndices: { roundIndex, fixtureIndex },
          });
        }

        const month = date.getUTCMonth(); // 0-based index
        if (month !== 1 && month !== 2) {
          datesInFebMarch = false;
          errors.push({
            message: `Fixture between ${fixture.homeTeam?.teamName || fixture.homeTeam?._id} and ${fixture.awayTeam?.teamName || fixture.awayTeam?._id} must be scheduled in February or March.`,
            fixtureIndices: { roundIndex, fixtureIndex },
          });
        }

        // Map round to date
        if (!roundDateMap.has(fixture.round)) {
          roundDateMap.set(fixture.round, date);
        } else {
          // Ensure all fixtures in the same round are on the same weekend
          const existingDate = roundDateMap.get(fixture.round)!;
          const existingWeekend = getWeekend(existingDate);
          const currentWeekend = getWeekend(date);
          if (existingWeekend !== currentWeekend) {
            validDates = false;
            errors.push({
              message: `All fixtures in Round ${fixture.round} must be on the same weekend.`,
              fixtureIndices: { roundIndex, fixtureIndex },
            });
          }
        }
      } else {
        validDates = false;
        errors.push({
          message: `Fixture between ${fixture.homeTeam?.teamName || fixture.homeTeam?._id} and ${fixture.awayTeam?.teamName || fixture.awayTeam?._id} is missing a date/time.`,
          fixtureIndices: { roundIndex, fixtureIndex },
        });
      }
    }

    // Identify conflicting rounds based on weekends
    const weekendToRoundsMap = new Map<string, number[]>();

    roundDateMap.forEach((date, round) => {
      const weekend = getWeekend(date);
      if (weekendToRoundsMap.has(weekend)) {
        weekendToRoundsMap.get(weekend)!.push(round);
      } else {
        weekendToRoundsMap.set(weekend, [round]);
      }
    });

    const conflictingRoundsList: { round1: number; round2: number }[] = [];

    weekendToRoundsMap.forEach((rounds, weekend) => {
      if (rounds.length > 1) {
        for (let i = 0; i < rounds.length; i++) {
          for (let j = i + 1; j < rounds.length; j++) {
            conflictingRoundsList.push({ round1: rounds[i], round2: rounds[j] });
            errors.push({
              message: `Rounds ${rounds[i]} and ${rounds[j]} are scheduled on the same weekend (${weekend}).`,
            });
          }
        }
      }
    });

    if (conflictingRoundsList.length > 0) {
      constraints['conflictingRounds'] = false;
    } else {
      constraints['conflictingRounds'] = true;
    }

    constraints['datesWithinAllowedRange'] =
      validDates &&
      datesInFebMarch;

    // Ensure rounds are in order and scheduled after previous rounds
    let roundsInOrder = true;
    for (let round = 2; round <= fixturesToCheck.length; round++) {
      const prevRoundDate = roundDateMap.get(round - 1);
      const currentRoundDate = roundDateMap.get(round);
      if (prevRoundDate && currentRoundDate) {
        if (currentRoundDate <= prevRoundDate) {
          roundsInOrder = false;
          errors.push({
            message: `Round ${round} must be scheduled after Round ${round - 1}.`,
          });
        }
      }
    }

    constraints['roundsInOrder'] = roundsInOrder;

    // Ensure Round 1 is in the first week of February
    let round1InFirstWeek = true;
    const round1Date = roundDateMap.get(1);
    if (round1Date) {
      const weekOfMonth = getWeekOfMonth(round1Date);
      if (weekOfMonth !== 1) {
        round1InFirstWeek = false;
        errors.push({
          message: `Round 1 must be scheduled in the first week of February.`,
        });
      }
    }

    constraints['round1InFirstWeek'] = round1InFirstWeek;

    // Ensure no rounds are scheduled in the weekend before Round 1
    let noRoundsBeforeRound1 = true;
    if (round1Date) {
      const previousWeekend = getPreviousWeekend(round1Date);
      weekendToRoundsMap.forEach((rounds, weekend) => {
        if (weekend === previousWeekend) {
          rounds.forEach(round => {
            errors.push({
              message: `No rounds can be scheduled in the weekend before Round 1. Round ${round} is scheduled then.`,
            });
          });
          noRoundsBeforeRound1 = false;
        }
      });
    }

    constraints['noRoundsBeforeRound1'] = noRoundsBeforeRound1;

    // All fixtures must be touched to proceed
    const allFixturesTouched = fixturesToCheck.every(roundFixtures =>
      roundFixtures.every(fixture => fixture.touched)
    );
    constraints['allFixturesTouched'] = allFixturesTouched;

    // Update conflicting rounds state
    setConflictingRounds(conflictingRoundsList);

    // Update conflict suggestions state
    setConflictSuggestions(conflictSuggestionsMap);

    setConstraintChecks(constraints);
    setValidationErrors(errors);
  };

  // Save fixtures to backend
  const saveFixtures = async () => {
    setLoading(true);
    const allFixtures = fixtures.flat();

    // Prepare data to send to backend
    const fixturesToSave = allFixtures.map(fixture => ({
      round: fixture.round,
      date: fixture.date,
      homeTeam: fixture.homeTeam?._id,
      awayTeam: fixture.awayTeam?._id,
      stadium: fixture.stadium?._id,
      location: fixture.location,
      season,
    }));

    try {
      // Validate fixtures first
      const validateResponse = await axios.post('http://localhost:5003/api/manual-fixtures/validate', {
        fixtures: fixturesToSave,
        season,
      });

      if (validateResponse.data.message === 'Fixtures are valid') {
        // Save fixtures
        const saveResponse = await axios.post('http://localhost:5003/api/manual-fixtures/save', {
          fixtures: fixturesToSave,
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

  // Check if all constraints are satisfied
  const allConstraintsSatisfied = useMemo(() => {
    return Object.values(constraintChecks).every(
      (value) => value !== false
    );
  }, [constraintChecks]);

  // Function to suggest possible matchups for a fixture
  const suggestMatchups = (roundIndex: number, fixtureIndex: number): string[] => {
    const suggestions: string[] = [];
    const roundNumber = roundIndex + 1;
    const scheduledTeams = Object.keys(perRoundTeamTracker[roundNumber] || {}).filter(
      (teamId) => perRoundTeamTracker[roundNumber][teamId]
    );
    const availableTeams = teams.filter(team => !scheduledTeams.includes(team._id));

    for (let i = 0; i < availableTeams.length; i++) {
      for (let j = i + 1; j < availableTeams.length; j++) {
        const teamA = availableTeams[i];
        const teamB = availableTeams[j];
        // Check if this matchup has already been scheduled
        const matchupKey = [teamA._id, teamB._id].sort().join('-');
        if (
          !matchupTracker[matchupKey]
        ) {
          suggestions.push(`${teamA.teamName} vs ${teamB.teamName}`);
        }
      }
    }

    return suggestions;
  };

  // Function to toggle suggestions visibility for a fixture
  const toggleSuggestions = (roundIndex: number, fixtureIndex: number) => {
    const key = `${roundIndex}-${fixtureIndex}`;
    setShowSuggestions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Function to generate suggestions when no feasible matchups are available
  const generateConflictSolutions = (roundIndex: number, fixtureIndex: number): ConflictSuggestion[] => {
    const key = `${roundIndex}-${fixtureIndex}`;
    return conflictSuggestions[key] || [];
  };

  // Function to generate unfeasible matchup reasons
  const getUnfeasibleMatchupReasons = useMemo(() => {
    const reasons: { [key: string]: UnfeasibleMatchupReason[] } = {};
    for (let roundIndex = 0; roundIndex < fixtures.length; roundIndex++) {
      for (let fixtureIndex = 0; fixtureIndex < fixtures[roundIndex].length; fixtureIndex++) {
        const key = `${roundIndex}-${fixtureIndex}`;
        if (showSuggestions[key] && !suggestMatchups(roundIndex, fixtureIndex).length) {
          const roundNumber = roundIndex + 1;
          const fixture = fixtures[roundIndex][fixtureIndex];
          const scheduledTeams = Object.keys(perRoundTeamTracker[roundNumber] || {}).filter(
            (teamId) => perRoundTeamTracker[roundNumber][teamId]
          );
          const availableTeams = teams.filter(team => !scheduledTeams.includes(team._id));
          const unfeasibleReasons: UnfeasibleMatchupReason[] = [];

          for (let i = 0; i < availableTeams.length; i++) {
            for (let j = i + 1; j < availableTeams.length; j++) {
              const teamA = availableTeams[i];
              const teamB = availableTeams[j];
              const matchupKey = [teamA._id, teamB._id].sort().join('-');

              if (matchupTracker[matchupKey]) {
                unfeasibleReasons.push({
                  teamA,
                  teamB,
                  reason: 'These teams have already played each other in another round.',
                });
              } else {
                unfeasibleReasons.push({
                  teamA,
                  teamB,
                  reason: 'Unknown reason (possibly a scheduling conflict).',
                });
              }
            }
          }

          reasons[key] = unfeasibleReasons;
        }
      }
    }
    return reasons;
  }, [fixtures, perRoundTeamTracker, teams, matchupTracker, showSuggestions]);

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto', display: 'flex' }}>
      {/* Fixture Scheduling Interface */}
      <div style={{ flex: 2, marginRight: '20px' }}>
        <h2>Manual Fixture Scheduler</h2>

        {/* Season Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="season">Season:</label>
          <input
            type="number"
            id="season"
            value={season}
            onChange={(e) => setSeason(parseInt(e.target.value))}
            min={2000}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>

        {step === 'input' && (
          <>
            {/* Display Constraint Checks */}
            <div style={{ marginBottom: '20px' }}>
              <h3>Constraints</h3>
              <ul>
                <li>
                  {constraintChecks['playsOncePerRound'] && constraintChecks['teamPlaysOnlyOncePerRound'] ? '✅' : '❌'} Each team plays exactly once in each round
                </li>
                <li>
                  {constraintChecks['eachTeamPlaysEachOther'] ? '✅' : '❌'} Each team plays every other team exactly once overall
                </li>
                <li>
                  {constraintChecks['noSelfPlay'] ? '✅' : '❌'} No team plays against itself
                </li>
                <li>
                  {constraintChecks['datesWithinAllowedRange'] ? '✅' : '❌'} Dates and times are within allowed ranges
                </li>
                <li>
                  {constraintChecks['roundsInOrder'] ? '✅' : '❌'} Rounds are scheduled in chronological order
                </li>
                <li>
                  {constraintChecks['round1InFirstWeek'] ? '✅' : '❌'} Round 1 is scheduled in the first week of February
                </li>
                <li>
                  {constraintChecks['noRoundsBeforeRound1'] ? '✅' : '❌'} No rounds are scheduled in the weekend before Round 1
                </li>
                <li>
                  {constraintChecks['conflictingRounds'] ? '✅' : '❌'} No conflicting rounds scheduled on the same weekend
                </li>
                <li>
                  {constraintChecks['allFixturesTouched'] ? '✅' : '❌'} All fixtures are filled
                </li>
              </ul>
            </div>

            {/* Display Validation Errors */}
            {validationErrors.length > 0 && (
              <div style={{ color: 'red', marginBottom: '20px' }}>
                <h4>Validation Errors:</h4>
                <ul>
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fixtures Input */}
            {fixtures.map((roundFixtures, roundIndex) => {
              const isConflicting = conflictingRounds.some(
                conflict => conflict.round1 === roundIndex + 1 || conflict.round2 === roundIndex + 1
              );
              return (
                <div key={roundIndex} style={{ marginBottom: '30px' }}>
                  <h3
                    style={{
                      backgroundColor: isConflicting ? '#f8d7da' : '#f1f1f1',
                      padding: '10px',
                      borderRadius: '5px',
                      border: isConflicting ? '1px solid #f5c6cb' : '1px solid #ccc',
                    }}
                  >
                    Round {roundIndex + 1} {isConflicting && '(Conflicting Round)'}
                  </h3>
                  {roundFixtures.map((fixture, fixtureIndex) => {
                    // Find errors related to this fixture
                    const fixtureErrors = validationErrors.filter(
                      (error) =>
                        error.fixtureIndices &&
                        error.fixtureIndices.roundIndex === roundIndex &&
                        error.fixtureIndices.fixtureIndex === fixtureIndex
                    );

                    // Suggest possible matchups
                    const matchups = suggestMatchups(roundIndex, fixtureIndex);

                    // Generate a unique key for suggestions visibility
                    const suggestionsKey = `${roundIndex}-${fixtureIndex}`;

                    // Check if fixture has validation errors
                    const hasError = fixtureErrors.length > 0;

                    return (
                      <div
                        key={fixtureIndex}
                        style={{
                          marginBottom: '15px',
                          border: hasError ? '2px solid #dc3545' : '1px solid #ccc',
                          padding: '10px',
                          borderRadius: '5px',
                          backgroundColor: hasError ? '#f8d7da' : '#fff',
                        }}
                      >
                        <h4
                          style={{
                            color: hasError ? '#721c24' : '#000',
                          }}
                        >
                          Fixture {fixtureIndex + 1}
                        </h4>
                        {/* Team Selection */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <select
                            value={fixture.homeTeam ? fixture.homeTeam._id : ''}
                            onChange={(e) => handleTeamSelection(roundIndex, fixtureIndex, 'teamA', e.target.value)}
                            style={{ marginRight: '10px', padding: '5px' }}
                          >
                            <option value="">Select Team A</option>
                            {teams.map(team => (
                              <option key={team._id} value={team._id}>{team.teamName}</option>
                            ))}
                          </select>
                          <span style={{ margin: '0 10px' }}>vs</span>
                          <select
                            value={fixture.awayTeam ? fixture.awayTeam._id : ''}
                            onChange={(e) => handleTeamSelection(roundIndex, fixtureIndex, 'teamB', e.target.value)}
                            style={{ marginLeft: '10px', padding: '5px' }}
                          >
                            <option value="">Select Team B</option>
                            {teams.map(team => (
                              <option key={team._id} value={team._id}>{team.teamName}</option>
                            ))}
                          </select>
                        </div>
                        {/* Display error if team plays itself */}
                        {fixture.homeTeam && fixture.awayTeam && fixture.homeTeam._id === fixture.awayTeam._id && (
                          <p style={{ color: 'red' }}>A team cannot play against itself.</p>
                        )}
                        {/* Date Selection */}
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                          <label htmlFor={`date-${roundIndex}-${fixtureIndex}`}>Date and Time:</label>
                          <input
                            type="datetime-local"
                            id={`date-${roundIndex}-${fixtureIndex}`}
                            value={fixture.date}
                            onChange={(e) => handleDateChange(roundIndex, fixtureIndex, e.target.value)}
                            style={{ marginLeft: '10px', padding: '5px' }}
                          />
                          {fixture.date && (
                            <span style={{ marginLeft: '10px' }}>
                              {isDateWithinAllowedRange(fixture.date) ? '✅' : '❌'}
                            </span>
                          )}
                        </div>
                        {/* Reset Button */}
                        <button
                          onClick={() => handleResetFixture(roundIndex, fixtureIndex)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            marginTop: '10px',
                            marginRight: '10px',
                          }}
                        >
                          Reset
                        </button>
                        {/* Display Fixture-specific Validation Errors */}
                        {fixtureErrors.length > 0 && (
                          <div style={{ color: 'red', marginTop: '10px' }}>
                            {fixtureErrors.map((error, idx) => (
                              <p key={idx}>{error.message}</p>
                            ))}
                          </div>
                        )}
                        {/* Suggestions Toggle Button */}
                        <button
                          onClick={() => toggleSuggestions(roundIndex, fixtureIndex)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#17a2b8',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            marginTop: '10px',
                          }}
                        >
                          {showSuggestions[suggestionsKey] ? 'Hide Suggestions' : 'Show Suggestions'}
                        </button>
                        {/* Suggested Matchups or Explanatory Message */}
                        {showSuggestions[suggestionsKey] && (
                          <div style={{ marginTop: '10px' }}>
                            {matchups.length > 0 ? (
                              <>
                                <h5>Suggested Matchups:</h5>
                                <ul>
                                  {matchups.map((matchup, idx) => (
                                    <li key={idx}>{matchup}</li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <>
                                <h5>No Suggestions Available</h5>
                                <p>
                                  No feasible matchups are available for this fixture due to existing scheduling conflicts or duplicate matchups.
                                </p>
                                {/* Detailed Explanation */}
                                {unfeasibleMatchupReasons[`${roundIndex}-${fixtureIndex}`] && unfeasibleMatchupReasons[`${roundIndex}-${fixtureIndex}`].length > 0 && (
                                  <>
                                    <p><strong>Available Teams:</strong></p>
                                    <ul>
                                      {unfeasibleMatchupReasons[`${roundIndex}-${fixtureIndex}`].map((reason, idx) => (
                                        <li key={idx}>
                                          {reason.teamA.teamName} vs {reason.teamB.teamName}: {reason.reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                )}
                                {/* Check if there are conflict suggestions */}
                                {generateConflictSolutions(roundIndex, fixtureIndex).length > 0 ? (
                                  <>
                                    <p>
                                      <strong>Suggested Actions:</strong>
                                    </p>
                                    <ul>
                                      {generateConflictSolutions(roundIndex, fixtureIndex).map((suggestion, idx) => (
                                        <li key={idx}>
                                          Reset <strong>Round {suggestion.conflictingFixture.roundIndex}, Fixture {suggestion.conflictingFixture.fixtureIndex + 1}</strong> to free up teams.
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                ) : (
                                  <>
                                    <p>
                                      <strong>Possible Solutions:</strong>
                                    </p>
                                    <ul>
                                      <li>Reset conflicting fixtures to free up teams.</li>
                                      <li>Adjust the season or rounds to accommodate all matchups.</li>
                                      <li>Ensure that each team plays every other team only once.</li>
                                    </ul>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {/* Display Home/Away and Stadium */}
                        {fixture.homeTeam && fixture.awayTeam && fixture.stadium && (
                          <div style={{ marginTop: '10px' }}>
                            <h5>Current Season ({season}) Fixture:</h5>
                            <p>
                              Home Team: {fixture.homeTeam.teamName}
                            </p>
                            <p>
                              Away Team: {fixture.awayTeam.teamName}
                            </p>
                            <p>
                              Stadium: {fixture.stadium.stadiumName}
                            </p>
                            <p>
                              Location: {fixture.location}
                            </p>
                            <p style={{ color: 'blue', fontStyle: 'italic' }}>
                              Note: Due to the requirement of alternating stadiums, this matchup has to be played at {fixture.stadium.stadiumName}.
                            </p>
                            {fixture.previousFixture && (
                              <div style={{ marginTop: '10px' }}>
                                <h5>Previous Season ({fixture.previousFixture.season}) Fixture:</h5>
                                <p>
                                  {teams.find(team => team._id === fixture.previousFixture?.homeTeam)?.teamName ?? 'Unknown Team'} vs{' '}
                                  {teams.find(team => team._id === fixture.previousFixture?.awayTeam)?.teamName ?? 'Unknown Team'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => {
                if (allConstraintsSatisfied) {
                  setStep('summary');
                } else {
                  alert('Please fix the following issues before proceeding:\n' + validationErrors.map(e => e.message).join('\n'));
                }
              }}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '20px',
              }}
            >
              Next
            </button>
          </>
        )}

        {step === 'summary' && (
          <>
            {/* Summary Components */}
            <h3>Fixture Summary</h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '10px',
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Round</th>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Home Team</th>
                  <th style={tableHeaderStyle}>Away Team</th>
                  <th style={tableHeaderStyle}>Stadium</th>
                  <th style={tableHeaderStyle}>Location</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.flat().map((fixture, index) => (
                  <tr key={index}>
                    <td style={tableCellStyle}>{fixture.round}</td>
                    <td style={tableCellStyle}>{fixture.date ? new Date(fixture.date).toLocaleString() : 'N/A'}</td>
                    <td style={tableCellStyle}>{fixture.homeTeam?.teamName || 'N/A'}</td>
                    <td style={tableCellStyle}>{fixture.awayTeam?.teamName || 'N/A'}</td>
                    <td style={tableCellStyle}>{fixture.stadium?.stadiumName || 'N/A'}</td>
                    <td style={tableCellStyle}>{fixture.location || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Back and Save Buttons */}
            <button
              onClick={() => setStep('input')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '20px',
                marginRight: '10px',
              }}
            >
              Back
            </button>
            <button
              onClick={saveFixtures}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '20px',
              }}
            >
              {loading ? 'Saving...' : 'Save Fixtures'}
            </button>
          </>
        )}
      </div>

      {/* Matchup Tracker Interfaces */}
      <div style={{ flex: 1 }}>
        {/* Overall Matchup Tracker */}
        <div style={{ marginBottom: '30px' }}>
          <h3>Overall Matchup Tracker</h3>
          <ul>
            {Object.entries(matchupTracker).map(([matchupKey, scheduled], index) => {
              const [teamAId, teamBId] = matchupKey.split('-');
              const teamAName = teams.find(team => team._id === teamAId)?.teamName || 'Unknown Team';
              const teamBName = teams.find(team => team._id === teamBId)?.teamName || 'Unknown Team';
              return (
                <li key={index}>
                  {scheduled ? '✅' : '❌'} {teamAName} vs {teamBName}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Per-Round Team Tracker */}
        <div>
          <h3>Per-Round Team Tracker</h3>
          {Object.entries(perRoundTeamTracker).map(([round, teamStatuses]) => (
            <div key={round} style={{ marginBottom: '20px' }}>
              <h4>Round {round}</h4>
              <ul>
                {teams.map(team => (
                  <li key={team._id}>
                    {teamStatuses[team._id] ? '✅' : '❌'} {team.teamName}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Styles for table headers and cells
const tableHeaderStyle: React.CSSProperties = {
  border: '1px solid #dee2e6',
  padding: '8px',
  backgroundColor: '#f1f1f1',
  textAlign: 'left',
};

const tableCellStyle: React.CSSProperties = {
  border: '1px solid #dee2e6',
  padding: '8px',
};

export default ManualFixtureScheduler;
