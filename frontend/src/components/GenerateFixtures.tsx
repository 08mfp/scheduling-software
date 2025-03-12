import React, { useState, useEffect, useContext, useRef } from 'react';
import axios, { CancelTokenSource } from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import {
  FaInfoCircle,
  FaSun,
  FaMoon,
  FaPlus,
  FaTimes,
  FaMinus
} from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import SplashScreen from './SplashScreen';

interface SplashScreenProps {
  show: boolean;
  onClose: () => void;
}

interface Stadium {
  _id: string;
  stadiumName: string;
  stadiumCity?: string;
}

interface Team {
  _id: string;
  teamName: string;
  teamRanking: number;
  teamLocation: string;
  teamCoach: string;
  stadium: string | Stadium;
  image?: string;
}

interface Fixture {
  _id?: string;
  round: number;
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  stadium: Stadium | null;
  location: string;
  season: number;
}

const TooltipIcon: React.FC<{ text: string }> = ({ text }) => (
  <div className="relative group inline-block ml-1 text-gray-400 cursor-pointer">
    <FaInfoCircle className="inline-block" />
    <div
      className="absolute bottom-full left-1/2 transform -translate-x-1/2 
                 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs 
                 px-2 py-1 rounded z-10 whitespace-normal max-w-xs"
      style={{ width: '200px' }}
    >
      {text}
    </div>
  </div>
);

const getTeamColor = (
  teamName: string
): { backgroundColor: string; textColor: string } => {
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const WaveLoader: React.FC = () => {
  return (
    <div className="wave-background p-6 rounded-md mb-4 w-full max-w-sm flex flex-col items-center">
      <div className="flex space-x-2 items-end mt-4">
        <div className="w-3 h-8 wave-bar animation-delay-0" />
        <div className="w-3 h-8 wave-bar animation-delay-1" />
        <div className="w-3 h-8 wave-bar animation-delay-2" />
        <div className="w-3 h-8 wave-bar animation-delay-3" />
        <div className="w-3 h-8 wave-bar animation-delay-4" />
      </div>
    </div>
  );
};

const LoadingText: React.FC = () => {
  const phrases = [
    'Initiating schedule generation...',
    'Analyzing constraints and teams...',
    'Validating data integrity...',
    'Applying scheduling algorithms...',
    'Optimizing fixture lists...',
    'Cross-checking stadium availability...',
    'Enforcing rest week logic...',
    'Minimizing travel distances...',
    'Finalizing round structure...',
    'Reviewing for conflicts...',
    'Performing final checks...',
    'Approaching completion...',
    'Preparing final output...',
    'Almost there...',
    'Just a moment...',
    'Final touches in progress...',
    'Generating final schedule...',
    'Polishing and verifying...',
    'Completing setup...',
    'Done!',
    'Done!',
    'Done!',
    'Done!'
  ];

  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phrases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-2xl font-bold text-gray-700 dark:text-gray-200 animate-pulse">
      {phrases[phaseIndex]}
    </div>
  );
};

const GenerateFixtures: React.FC = () => {

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('firstTimeGenerateFixtures');
    if (!hasVisited) {
      setShowSplash(true);
      localStorage.setItem('firstTimeGenerateFixtures', 'true');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const [season, setSeason] = useState<number>(new Date().getFullYear() + 1);
  const [algorithm, setAlgorithm] = useState<string>('random');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [summary, setSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [selectedRestWeeks, setSelectedRestWeeks] = useState<Set<number>>(new Set());
  const { user, apiKey } = useContext(AuthContext);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [cancelSource, setCancelSource] = useState<CancelTokenSource | null>(null);
  const [modalSaveState, setModalSaveState] = useState<'success' | 'error' | null>(null);
  const [saveCountdown, setSaveCountdown] = useState<number>(10);
  const saveCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeightsExpanded, setIsWeightsExpanded] = useState(false);
  const [runLocalSearch, setRunLocalSearch] = useState(false);

  // const [unifiedWeights, setUnifiedWeights] = useState({
  //   w1: 1.0,     // consecutiveAwayPenalty weight
  //   w2: 0.1,     // maxTravel weight
  //   w3: 1.0,     // competitiveness weight
  //   wFri: 2.0,   // broadcast penalty weight
  //   wTravelTotal: 0.05,
  //   wTravelFair: 0.05,
  //   wSlot: 0.5,
  //   wShortGap: 0.5,
  //   minGapDays: 6,
  //   ALPHA: 1,
  //   BETA: 2,
  //   FRIDAY_NIGHT_LIMIT: 2,
  //   FRIDAY_NIGHT_PENALTY: 5.0,
  //   TOP2_MISSED_SLOT_PENALTY: 15.0
  // });

  const defaultUnifiedWeights = {
    w1: 1.0,
    w2: 0.1,
    w3: 1.0,
    wFri: 2.0,
    wTravelTotal: 0.05,
    wTravelFair: 0.05,
    wSlot: 0.5,
    wShortGap: 0.5,
    minGapDays: 6,
    ALPHA: 1,
    BETA: 2,
    FRIDAY_NIGHT_LIMIT: 2,
    FRIDAY_NIGHT_PENALTY: 5.0,
    TOP2_MISSED_SLOT_PENALTY: 15.0,
  };

  function getRandomInRange(min: number, max: number, step: number) {
    const range = (max - min) / step;
    const randomIndex = Math.floor(Math.random() * (range + 1));
    return parseFloat((min + randomIndex * step).toFixed(3));
  }

  const [unifiedWeights, setUnifiedWeights] = useState(defaultUnifiedWeights);

const resetWeights = () => {
  setUnifiedWeights(defaultUnifiedWeights);
};

const shuffleWeights = () => {
  setUnifiedWeights({
    w1: getRandomInRange(0, 3, 0.5),
    w2: getRandomInRange(0, 2, 0.1),
    w3: getRandomInRange(0, 3, 0.25),
    wFri: getRandomInRange(0, 5, 0.5),
    wTravelTotal: getRandomInRange(0, 1, 0.05),
    wTravelFair: getRandomInRange(0, 1, 0.05),
    wSlot: getRandomInRange(0, 5, 0.5),
    wShortGap: getRandomInRange(0, 3, 0.25),
    minGapDays: Math.floor(getRandomInRange(3, 14, 1)),
    ALPHA: getRandomInRange(0.5, 3, 0.1),
    BETA: getRandomInRange(0.5, 3, 0.1),
    FRIDAY_NIGHT_LIMIT: Math.floor(getRandomInRange(0, 5, 1)),
    FRIDAY_NIGHT_PENALTY: getRandomInRange(1, 10, 1),
    TOP2_MISSED_SLOT_PENALTY: getRandomInRange(0, 25, 5),
  });
};

  useEffect(() => {
    if (user && user.role === 'admin') {
      const fetchTeams = async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/teams`);
          setTeams(response.data || []);
        } catch (error) {
          console.error('Error fetching teams:', error);
          setErrorMessage('Failed to load teams. Please try again later.');
        }
      };
      fetchTeams();
    }
  }, [user]);

  const handleTeamSelection = (teamId: string) => {
    setErrorMessage('');
    setSelectedTeamIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(teamId)) {
        newSelected.delete(teamId);
      } else {
        if (newSelected.size >= 6) {
          setErrorMessage('You can select up to 6 teams.');
          return prevSelected;
        }
        newSelected.add(teamId);
      }
      return newSelected;
    });
  };

  const handleRestWeekSelection = (round: number) => {
    setErrorMessage('');
    setSelectedRestWeeks((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(round)) {
        newSelected.delete(round);
      } else {
        if (newSelected.size >= 3) {
          setErrorMessage('Maximum 3 rest weeks allowed.');
          return prevSelected;
        }
        newSelected.add(round);
      }
      return newSelected;
    });
  };

  const validateSelection = (): boolean => {
    if (selectedTeamIds.size !== 6) {
      setErrorMessage('Please select exactly 6 teams.');
      return false;
    }
    return true;
  };

  const generateFixtures = async () => {
    if (cancelSource) {
      cancelSource.cancel('User started a new generation request');
    }

    setLoading(true);
    setErrorMessage('');
    setFixtures([]);
    setSummary([]);

    if (!validateSelection()) {
      setLoading(false);
      return;
    }

    const payload: any = {
      season,
      algorithm,
      teams: Array.from(selectedTeamIds),
      restWeeks: Array.from(selectedRestWeeks)
    };

    if (algorithm === 'unifiedScheduler') {
      payload.weights = unifiedWeights;
      payload.runLocalSearch = runLocalSearch;
      //! payload.PartialLocks should go herw
    }

    const source = axios.CancelToken.source();
    setCancelSource(source);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/provisional-fixtures/generate`,
        payload,
        {
          headers: { 'x-api-key': apiKey },
          cancelToken: source.token
        }
      );
      const generatedFixtures: Fixture[] = (response.data.fixtures || []).map((f: any) => ({
        ...f,
        date: new Date(f.date).toISOString().slice(0, 16)
      }));
      setFixtures(generatedFixtures);
      setSummary(response.data.summary || []);
    } catch (error: any) {
      console.error('Error generating fixtures:', error);
      if (axios.isCancel(error)) {
        console.log('Generation canceled:', error.message);
      } else {
        const backendMessage = error.response?.data?.message || 'Error generating fixtures';
        setErrorMessage(backendMessage);
        setFixtures([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveFixtures = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const fixturesToSave = fixtures.map((fx) => ({
        ...fx,
        date: new Date(fx.date)
      }));
      await axios.post(
        `${BACKEND_URL}/api/provisional-fixtures/save`,
        { season, fixtures: fixturesToSave },
        { headers: { 'x-api-key': apiKey } }
      );
      setFixtures([]);
      setSummary([]);
      setModalSaveState('success');
      setSaveCountdown(10);
    } catch (error: any) {
      console.error('Error saving fixtures:', error);
      const backendMessage =
        error.response?.data?.message || 'Error saving fixtures. Please try again.';
      setErrorMessage(backendMessage);
      setModalSaveState('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modalSaveState === 'success') {
      saveCountdownRef.current = setInterval(() => {
        setSaveCountdown((prev) => {
          if (prev <= 1) {
            if (saveCountdownRef.current) clearInterval(saveCountdownRef.current);
            setModalSaveState(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (saveCountdownRef.current) clearInterval(saveCountdownRef.current);
    };
  }, [modalSaveState]);

  const handleClearAll = () => {
    setFixtures([]);
    setSummary([]);
    setSelectedTeamIds(new Set());
    setSelectedRestWeeks(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDateChange = (index: number, newDate: string) => {
    setFixtures((prev) => {
      const updated = [...prev];
      updated[index].date = newDate;
      return updated;
    });
  };

  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  const fixturesByRound: { [round: number]: Fixture[] } = {};
  fixtures.forEach((fx) => {
    if (!fixturesByRound[fx.round]) {
      fixturesByRound[fx.round] = [];
    }
    fixturesByRound[fx.round].push(fx);
  });

  const autoRestWeeks =
    selectedRestWeeks.size === 0 && algorithm !== 'unifiedScheduler'
      ? new Set([2, 3])
      : new Set();

  return (
    <>
      <SplashScreen show={showSplash} onClose={() => setShowSplash(false)} />
      <style>
        {`
          @keyframes waveColor {
            0%   { transform: scaleY(0.3); background-color: #6366F1; }
            50%  { transform: scaleY(1);   background-color: #EC4899; }
            100% { transform: scaleY(0.3); background-color: #6366F1; }
          }
          .wave-bar {
            animation: waveColor 1.2s infinite ease-in-out;
          }
          .animation-delay-0 { animation-delay: 0s; }
          .animation-delay-1 { animation-delay: 0.1s; }
          .animation-delay-2 { animation-delay: 0.2s; }
          .animation-delay-3 { animation-delay: 0.3s; }
          .animation-delay-4 { animation-delay: 0.4s; }
        `}
      </style>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-7xl w-full mb-8">
          <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
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
                Generate Fixtures
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
          <h2 className="font-extrabold text-gray-900 dark:text-gray-100 mb-2 text-3xl">
            Generate Fixtures
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-2 text-base">
            This interface generates fixtures based on your selected algorithm while
            adhering to competition constraints.
          </p>
          <br />
          <p className="text-gray-500 dark:text-gray-400 italic text-xs">
            Note: Fixture generation is automated. Only date adjustments are allowed post-generation.
          </p>
          <br />

          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-6 mb-8 space-y-6">
            <div className="flex flex-col items-center">
              <label className="Select text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
                Enter Season:
              </label>
              <input
                type="number"
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value))}
                min={2000}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded px-3 py-1 w-60 text-center"
              />
            </div>

            {/* Algorithm Dropdown */}
            {/* <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Algorithm:
              </label>
              <select
                value={algorithm}
                onChange={(e) => {
                  const newAlg = e.target.value;
                  setAlgorithm(newAlg);
                  setErrorMessage('');
                  setSelectedTeamIds(new Set());
                  if (newAlg === 'unifiedScheduler') {
                    setShowUnifiedModal(true);
                  }
                }}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                           text-gray-800 dark:text-gray-200 rounded px-3 py-1 mt-2 w-60 text-center"
              >
                <option value="random">Random</option>
                <option value="round5Extravaganza">Round 5 Extravaganza</option>
                <option value="travelOptimized">Travel Optimized Scheduler</option>
                <option value="balancedTravel">Balanced Scheduler</option>
                <option value="unifiedScheduler">Unified Scheduler</option>
              </select>
            </div> */}

            <div className="flex flex-col items-center">
              <label className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
                Select Algorithm:
              </label>

              <div className="inline-flex space-x-2">
                <button
                  onClick={() => {
                    setAlgorithm('random');
                    setErrorMessage('');
                    setSelectedTeamIds(new Set());
                  }}
                  className={
                    algorithm === 'random'
                      ? 'px-4 py-2 bg-blue-600 text-white rounded'
                      : 'px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded'
                  }
                >
                  Random
                </button>

                <button
                  onClick={() => {
                    setAlgorithm('round5Extravaganza');
                    setErrorMessage('');
                    setSelectedTeamIds(new Set());
                  }}
                  className={
                    algorithm === 'round5Extravaganza'
                      ? 'px-4 py-2 bg-blue-600 text-white rounded'
                      : 'px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded'
                  }
                >
                  Round 5 Extravaganza
                </button>

                <button
                  onClick={() => {
                    setAlgorithm('travelOptimized');
                    setErrorMessage('');
                    setSelectedTeamIds(new Set());
                  }}
                  className={
                    algorithm === 'travelOptimized'
                      ? 'px-4 py-2 bg-blue-600 text-white rounded'
                      : 'px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded'
                  }
                >
                  Travel Optimized
                </button>

                <button
                  onClick={() => {
                    setAlgorithm('balancedTravel');
                    setErrorMessage('');
                    setSelectedTeamIds(new Set());
                  }}
                  className={
                    algorithm === 'balancedTravel'
                      ? 'px-4 py-2 bg-blue-600 text-white rounded'
                      : 'px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded'
                  }
                >
                  Balanced
                </button>

                <button
                  onClick={() => {
                    setAlgorithm('unifiedScheduler');
                    setErrorMessage('');
                    setSelectedTeamIds(new Set());
                    setShowUnifiedModal(true);
                  }}
                  className={
                    algorithm === 'unifiedScheduler'
                      ? 'px-4 py-2 bg-blue-600 text-white rounded'
                      : 'px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded'
                  }
                >
                  Unified Scheduler
                </button>
              </div>
            </div>

            {algorithm === 'unifiedScheduler' && (
  <div className="mt-4 px-4 py-3 bg-gray-100 dark:bg-gray-800 border rounded-md shadow-sm relative">
    <div className="absolute top-2 right-2">
      {isWeightsExpanded ? (
        <button
          onClick={() => setIsWeightsExpanded(false)}
          className="text-red-600 hover:text-red-800"
          aria-label="Minimize Advanced Options"
        >
          <FaTimes size={18} />
        </button>
      ) : (
        <button
          onClick={() => setIsWeightsExpanded(true)}
          className="text-green-600 hover:text-green-800"
          aria-label="Expand Advanced Options"
        >
          <FaPlus size={18} />
        </button>
      )}
    </div>

    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-4 text-center">
      Advanced Options for Unified Scheduler
    </h3>

    {!isWeightsExpanded && (
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Some advanced weighting controls for the Unified Scheduler are hidden. 
        Click the <span className="text-green-600 font-bold">+</span> to view.
      </p>
    )}

    {isWeightsExpanded && (
      <div>
        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={runLocalSearch}
            onChange={() => setRunLocalSearch((prev) => !prev)}
          />
          <span className="text-gray-700 dark:text-gray-200">
            Enable Local Search Optimization
            <TooltipIcon text="Uses extra optimization (simulated annealing) to refine the schedule." />
          </span>
        </label>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={resetWeights}
            className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={shuffleWeights}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Shuffle Weights
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              w1: Consec. Away
              <TooltipIcon text="Penalizes back-to-back away matches. Range 0–3, step=0.5." />
            </label>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={unifiedWeights.w1}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({ ...prev, w1: parseFloat(e.target.value) }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.w1.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              w2: Max Travel
              <TooltipIcon text="Focuses on the single team's worst travel. Range 0–2, step=0.1." />
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={unifiedWeights.w2}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({ ...prev, w2: parseFloat(e.target.value) }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.w2.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              w3: Competitive
              <TooltipIcon text="Pushes big matches later. Range 0–3, step=0.5." />
            </label>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={unifiedWeights.w3}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({ ...prev, w3: parseFloat(e.target.value) }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.w3.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              wFri: Friday Penalty
              <TooltipIcon text="Discourages extra Friday-night matches. Range 0–5, step=0.5." />
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={unifiedWeights.wFri}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({ ...prev, wFri: parseFloat(e.target.value) }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.wFri.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              wTravelTotal
              <TooltipIcon text="Adds cost for overall travel. Range 0–1, step=0.05." />
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={unifiedWeights.wTravelTotal}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  wTravelTotal: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.wTravelTotal.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              wTravelFair
              <TooltipIcon text="Penalizes unequal travel (std dev). Range 0–1, step=0.05." />
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={unifiedWeights.wTravelFair}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  wTravelFair: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.wTravelFair.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              wSlot
              <TooltipIcon text="Penalizes non-prime times. Range 0–5, step=0.5." />
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={unifiedWeights.wSlot}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  wSlot: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.wSlot.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              wShortGap
              <TooltipIcon text="Short-gap penalty if < minGapDays. Range 0–3, step=0.5." />
            </label>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={unifiedWeights.wShortGap}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  wShortGap: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.wShortGap.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              minGapDays
              <TooltipIcon text="Min rest days required. Range 3–14, step=1." />
            </label>
            <input
              type="range"
              min={3}
              max={14}
              step={1}
              value={unifiedWeights.minGapDays}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  minGapDays: parseInt(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.minGapDays}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              ALPHA
              <TooltipIcon text="In match interest: ALPHA*(6 - diff). Range 0.5–3, step=0.1." />
            </label>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={unifiedWeights.ALPHA}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  ALPHA: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.ALPHA.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              BETA
              <TooltipIcon text="In match interest: BETA*(12 - sum). Range 0.5–3, step=0.1." />
            </label>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={unifiedWeights.BETA}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  BETA: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.BETA.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              Friday Limit
              <TooltipIcon text="Max # of Friday matches allowed. Range 0–5, step=1." />
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={unifiedWeights.FRIDAY_NIGHT_LIMIT}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  FRIDAY_NIGHT_LIMIT: parseInt(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.FRIDAY_NIGHT_LIMIT}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              Fri Penalty
              <TooltipIcon text="Penalty if we exceed that Friday limit. Range 1–10, step=1." />
            </label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={unifiedWeights.FRIDAY_NIGHT_PENALTY}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  FRIDAY_NIGHT_PENALTY: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.FRIDAY_NIGHT_PENALTY.toFixed(1)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center mb-1 text-gray-700 dark:text-gray-200">
              #1 vs #2 Penalty
              <TooltipIcon text="Penalty if top-2 match not in Round 5 final slot. Range 0–25, step=5." />
            </label>
            <input
              type="range"
              min={0}
              max={25}
              step={5}
              value={unifiedWeights.TOP2_MISSED_SLOT_PENALTY}
              onChange={(e) =>
                setUnifiedWeights((prev) => ({
                  ...prev,
                  TOP2_MISSED_SLOT_PENALTY: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="mt-1 text-center text-gray-700 dark:text-gray-200">
              {unifiedWeights.TOP2_MISSED_SLOT_PENALTY.toFixed(0)}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
                Select 6 Teams:
              </h3>
              {errorMessage && (
                <p className="text-red-600 mb-2 text-center">{errorMessage}</p>
              )}
              <div className="inline-flex flex-wrap gap-4 justify-center">
                {teams.map((team) => {
                  const selected = selectedTeamIds.has(team._id);
                  const { backgroundColor, textColor } = getTeamColor(team.teamName);
                  return (
                    <button
                      key={team._id}
                      onClick={() => handleTeamSelection(team._id)}
                      disabled={!selected && selectedTeamIds.size >= 6}
                      className="
                        px-4 py-3 text-sm font-medium rounded-md
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-colors w-44 h-20 flex flex-col items-center
                        justify-center relative border border-black dark:border-white
                      "
                      style={{
                        backgroundColor,
                        color: textColor,
                        opacity: selected ? 1 : 0.85
                      }}
                    >
                      {team.image && (
                        <img
                          src={`${BACKEND_URL}${team.image}`}
                          alt={`${team.teamName} Logo`}
                          className="w-8 h-8 object-contain rounded-full mb-1"
                          style={{ backgroundColor: '#fff' }}
                        />
                      )}
                      <span className="whitespace-nowrap font-semibold">
                        {team.teamName}
                      </span>
                      {selected && <span className="text-xs font-bold">SELECTED</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300 text-center">
                {selectedTeamIds.size} of 6 teams selected.
              </p>
            </div>

            <div className="flex flex-col items-center mt-6">
              <button
                onClick={generateFixtures}
                disabled={loading}
                className={`
                  px-6 py-2 rounded text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${
                    loading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                  }
                `}
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>

              {loading && (
                <div className="mt-6 flex flex-col items-center">
                  <LoadingText />
                  <WaveLoader />
                </div>
              )}
            </div>

            <div className="text-center">
              <Link to="/teams-ranking" className="text-sm text-blue-600 hover:underline">
                Need to Update Team Rankings First?
              </Link>
            </div>
          </div>

          {errorMessage && <p className="text-red-600 mb-6 text-center">{errorMessage}</p>}

          {summary.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-4 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Summary
              </h3>
              <div
                className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded text-gray-800 dark:text-gray-100 overflow-hidden"
                style={{ maxHeight: '4rem', overflowY: 'hidden' }}
              >
                {summary.join('\n')}
              </div>
              <button
                onClick={() => setShowSummaryModal(true)}
                className="mt-2 inline-flex items-center text-green-700 dark:text-green-400 hover:underline"
              >
                <FaPlus className="mr-1" />
                Expand
              </button>
            </div>
          )}

          {fixtures && Object.keys(fixturesByRound).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Provisional Fixtures
              </h3>
              {Object.keys(fixturesByRound)
                .sort((a, b) => Number(a) - Number(b))
                .map((roundKey) => {
                  const round = Number(roundKey);
                  return (
                    <div key={round} className="mb-6">
                      <div className="px-4 py-2 rounded mb-2 font-bold bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100">
                        Round {round}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left border border-gray-300 dark:border-gray-600 mb-4 mx-auto">
                          <thead>
                            <tr>
                              <th className={tableHeaderClass}>Date &amp; Time</th>
                              <th className={tableHeaderClass}>Home Team</th>
                              <th className={tableHeaderClass}>Away Team</th>
                              <th className={tableHeaderClass}>Stadium</th>
                              <th className={tableHeaderClass}>Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fixturesByRound[round].map((fixture, i) => {
                              const globalIndex = fixtures.findIndex(
                                (f) =>
                                  f.homeTeam._id === fixture.homeTeam._id &&
                                  f.awayTeam._id === fixture.awayTeam._id &&
                                  f.round === fixture.round
                              );
                              return (
                                <tr
                                  key={`${fixture.homeTeam._id}-${fixture.awayTeam._id}-${fixture.round}-${i}`}
                                  className="border-b last:border-b-0 border-gray-200 dark:border-gray-600"
                                >
                                  <td className={tableCellClass}>
                                    <input
                                      type="datetime-local"
                                      value={fixture.date}
                                      onChange={(e) =>
                                        handleDateChange(globalIndex, e.target.value)
                                      }
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded px-2 py-1 w-full"
                                    />
                                  </td>
                                  <td className={tableCellClass}>
                                    {fixture.homeTeam.teamName}
                                  </td>
                                  <td className={tableCellClass}>
                                    {fixture.awayTeam.teamName}
                                  </td>
                                  <td className={tableCellClass}>
                                    {fixture.stadium
                                      ? fixture.stadium.stadiumName
                                      : 'Unknown'}
                                  </td>
                                  <td className={tableCellClass}>{fixture.location}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {(selectedRestWeeks.has(round) || autoRestWeeks.has(round)) && (
                        <div className="text-center mb-2 font-bold text-red-700 dark:text-red-500">
                          REST WEEK
                        </div>
                      )}
                    </div>
                  );
                })}
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={saveFixtures}
                  disabled={loading}
                  className={`
                    px-6 py-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-500
                    ${
                      loading
                        ? 'bg-green-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 transition-colors'
                    }
                  `}
                >
                  {loading ? 'Saving...' : 'Save Fixtures'}
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {showSummaryModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-6xl w-full relative">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="absolute top-4 right-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500"
                aria-label="Close Summary"
              >
                <FaTimes size={20} />
              </button>
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                Full Summary
              </h2>
              <div
                className="text-gray-700 dark:text-gray-200 overflow-y-auto"
                style={{ maxHeight: '60vh', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
              >
                {summary.join('\n')}
              </div>
            </div>
          </div>
        )}

{showUnifiedModal && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="unified-modal-title"
    aria-describedby="unified-modal-description"
    tabIndex={-1}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowUnifiedModal(false);
      }
    }}
  >

    <div className="relative w-full max-w-3xl max-h-full bg-white dark:bg-gray-700 rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-600 rounded-t">
        <h3
          id="unified-modal-title"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          Rest Weeks Hidden
        </h3>
        <button
          onClick={() => setShowUnifiedModal(false)}
          type="button"
          className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900
                     rounded-lg text-sm w-8 h-8 ml-auto flex items-center
                     justify-center dark:hover:bg-gray-600 dark:hover:text-white"
          aria-label="Close"
        >
          <svg
            className="w-3 h-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
      </div>

      <div id="unified-modal-description" className="p-4 md:p-5 space-y-4 text-lg">
        <p className="leading-relaxed text-gray-500 dark:text-gray-400">
          Rest weeks have been hidden because the unified scheduler places rest
          weeks based on a cost function and penalty system. The rest weeks have
          been strategically placed to alleviate travel fatigue for teams who
          may be consecutively traveling or traveling long distances.
        </p>
      </div>

      <div className="flex items-center p-4 md:p-5 border-t border-gray-200 dark:border-gray-600 rounded-b justify-end">
        <button
          onClick={() => setShowUnifiedModal(false)}
          type="button"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none
                     focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5
                     text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          I Understand
        </button>
      </div>
    </div>
  </div>
)}

        {modalSaveState && (
          <ConfirmModal
            isOpen={modalSaveState !== null}
            type={modalSaveState}
            title={
              modalSaveState === 'success'
                ? 'Saved Successfully'
                : 'Error Saving Fixtures'
            }
            message={
              modalSaveState === 'success'
                ? 'The fixtures have been saved successfully.'
                : errorMessage || 'An error occurred while saving.'
            }
            countdown={modalSaveState === 'success' ? saveCountdown : undefined}
            onCancel={() => setModalSaveState(null)}
          />
        )}
      </div>
    </>
  );
};

const tableHeaderClass =
  'border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-center';
const tableCellClass =
  'border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-200 text-center';

export default GenerateFixtures;