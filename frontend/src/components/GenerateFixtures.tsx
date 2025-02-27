import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

// ICONS
import { FaInfoCircle, FaSun, FaMoon, FaPlus, FaTimes } from 'react-icons/fa';

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
  image?: string; // optional badge path
}

// For color-coding the team buttons
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const GenerateFixtures: React.FC = () => {
  // ---------------------
  // 1) DARK MODE
  // ---------------------
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

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // ---------------------
  // 2) MAIN STATES
  // ---------------------
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

  // For the summary modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // ---------------------
  // 3) FETCH TEAMS
  // ---------------------
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

  // ---------------------
  // 4) HANDLERS
  // ---------------------
  // Toggle a team's selection
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

  // Toggle a rest week
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

  // Generate fixtures
  const generateFixtures = async () => {
    setLoading(true);
    setErrorMessage('');
    setFixtures([]);
    setSummary([]);

    if (!validateSelection()) {
      setLoading(false);
      return;
    }

    const payload = {
      season,
      algorithm,
      teams: Array.from(selectedTeamIds),
      restWeeks: Array.from(selectedRestWeeks),
    };

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/provisional-fixtures/generate`,
        payload,
        { headers: { 'x-api-key': apiKey } }
      );
      const generatedFixtures: Fixture[] = (response.data.fixtures || []).map((f: any) => ({
        ...f,
        date: new Date(f.date).toISOString().slice(0, 16),
      }));
      setFixtures(generatedFixtures);
      setSummary(response.data.summary || []);
    } catch (error: any) {
      console.error('Error generating fixtures:', error);
      const backendMessage = error.response?.data?.message || 'Error generating fixtures';
      setErrorMessage(backendMessage);
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  // Save fixtures
  const saveFixtures = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const fixturesToSave = fixtures.map((fx) => ({
        ...fx,
        date: new Date(fx.date),
      }));
      await axios.post(
        `${BACKEND_URL}/api/provisional-fixtures/save`,
        { season, fixtures: fixturesToSave },
        { headers: { 'x-api-key': apiKey } }
      );
      alert('Fixtures saved successfully!');
      setFixtures([]);
      setSummary([]);
    } catch (error: any) {
      console.error('Error saving fixtures:', error);
      const backendMessage = error.response?.data?.message || 'Error saving fixtures. Please try again.';
      setErrorMessage(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear all and scroll to top
  const handleClearAll = () => {
    setFixtures([]);
    setSummary([]);
    setSelectedTeamIds(new Set());
    setSelectedRestWeeks(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle fixture date/time changes
  const handleDateChange = (index: number, newDate: string) => {
    setFixtures((prev) => {
      const updated = [...prev];
      updated[index].date = newDate;
      return updated;
    });
  };

  // If not admin, redirect
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Group fixtures by round
  const fixturesByRound: { [round: number]: Fixture[] } = {};
  fixtures.forEach((fx) => {
    if (!fixturesByRound[fx.round]) {
      fixturesByRound[fx.round] = [];
    }
    fixturesByRound[fx.round].push(fx);
  });

  // ---------------------
  // 5) RENDER
  // ---------------------
  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 
                 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8
                 transition-colors duration-300"
    >
      {/* Navbar (Breadcrumb + Dark Mode) */}
      <div className="max-w-4xl w-full mb-8">
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
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Generate Fixtures
            </span>
          </nav>

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

      {/* Main Card */}
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 transition-colors duration-300">
        {/* Page Title */}
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
          Generate Fixtures
        </h2>
        {/* Description under Title */}
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          This interface is used to generate fixtures based on your selected algorithm while
          adhering to competition constraints. Once generated, you can only modify fixture dates
          to avoid violating Six Nations rules. If you are not satisfied with the provisional
          schedule, feel free to run the generator again.
        </p>

        {/* Controls Card */}
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-6 mb-8 space-y-6">
          {/* Team Selection (reordered to appear above Algorithm) */}
         
                   {/* Season (centered) */}
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

          {/* Algorithm (centered) */}
          <div className="flex flex-col items-center">
            <label
              htmlFor="algorithm"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            >
              Algorithm:
            </label>
            <select
              id="algorithm"
              value={algorithm}
              onChange={(e) => {
                setAlgorithm(e.target.value);
                setErrorMessage('');
                setSelectedTeamIds(new Set());
              }}
              className="border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 
                         rounded px-3 py-1 mt-2 w-60 text-center"
            >
              <option value="random">Random</option>
              <option value="round5Extravaganza">Round 5 Extravaganza</option>
              <option value="travelOptimized">Travel Optimized Scheduler</option>
            </select>
          </div>

                    {/* Rest Weeks */}
                    <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Rest Weeks (select up to 3 rounds):
            </label>
            <div className="flex flex-wrap gap-4 justify-center mt-2">
              {[1, 2, 3, 4, 5].map((round) => (
                <button
                  key={round}
                  onClick={() => handleRestWeekSelection(round)}
                  className={`
                    px-4 py-2 rounded text-sm font-medium focus:outline-none 
                    focus:ring-2 focus:ring-blue-500 transition-colors
                    ${
                      selectedRestWeeks.has(round)
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  Round {round}
                </button>
              ))}
            </div>
          </div>



          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
              Select 6 Teams
            </h3>
            {errorMessage && <p className="text-red-600 mb-2 text-center">{errorMessage}</p>}

            <div className="inline-flex flex-wrap gap-4 justify-center">
              {teams.map((team) => {
                const selected = selectedTeamIds.has(team._id);
                const { backgroundColor, textColor } = getTeamColor(team.teamName);
                return (
                    <button
                    key={team._id}
                    onClick={() => handleTeamSelection(team._id)}
                    disabled={!selected && selectedTeamIds.size >= 6}
                    className={`
                      px-4 py-3 text-sm font-medium rounded-md focus:outline-none 
                      focus:ring-2 focus:ring-blue-500 transition-colors
                      w-44 h-20 flex flex-col items-center justify-center
                      relative border border-black dark:border-white
                    `}
                    style={{
                      backgroundColor: backgroundColor,
                      color: textColor,
                      opacity: selected ? 1 : 0.85,
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
                    <span className="whitespace-nowrap font-semibold">{team.teamName}</span>
                    {selected && (
                      <span className="text-xs font-bold">
                      SELECTED
                      </span>
                    )}
                    </button>
                );
              })}
            </div>

            <p className="mt-4 text-gray-600 dark:text-gray-300 text-center">
              {selectedTeamIds.size} of 6 teams selected.
            </p>
          </div>



          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={generateFixtures}
              disabled={loading}
              className={`
                mt-6 px-6 py-2 rounded text-white 
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
          </div>
        </div>

        {errorMessage && (
          <p className="text-red-600 mb-6 text-center">{errorMessage}</p>
        )}

        {/* Summary (collapsible via modal) */}
        {summary.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Summary
            </h3>
            {/* Small container with partial/collapsed view */}
            <div
              className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded text-gray-800 dark:text-gray-100 overflow-hidden"
              style={{ maxHeight: '4rem', overflowY: 'hidden' }}
            >
              {summary.join('\n')}
            </div>

            {/* Expand button (green plus) */}
            <button
              onClick={() => setShowSummaryModal(true)}
              className="mt-2 inline-flex items-center text-green-700 dark:text-green-400 hover:underline"
            >
              <FaPlus className="mr-1" />
              Expand
            </button>
          </div>
        )}

        {/* Fixtures Table */}
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
                                    className="border border-gray-300 dark:border-gray-600 
                                               bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 
                                               rounded px-2 py-1 w-full"
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
                                <td className={tableCellClass}>
                                  {fixture.location}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {selectedRestWeeks.has(round) && (
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
                  px-6 py-2 rounded text-white 
                  focus:outline-none focus:ring-2 focus:ring-green-500
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
                className="px-6 py-2 bg-red-600 hover:bg-red-700 
                           text-white rounded focus:outline-none 
                           focus:ring-2 focus:ring-red-400 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Full Summary */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-xl w-full relative">
            {/* Close/Minimize button (red cross) */}
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-4 right-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500"
              aria-label="Close Summary"
            >
              <FaTimes size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Full Summary</h2>
            {/* Use pre-wrap or break-words to ensure wrapping */}
            <div
              className="text-gray-700 dark:text-gray-200 overflow-y-auto"
              style={{ maxHeight: '60vh', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
            >
              {summary.join('\n')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------
// Table CSS Classes
// ---------------------
const tableHeaderClass =
  'border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-center';
const tableCellClass =
  'border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-200 text-center';

export default GenerateFixtures;
