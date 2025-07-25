import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import { Player } from '../interfaces/Player';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const PlayersList: React.FC = () => {
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
  const { user } = useContext(AuthContext);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingDelayComplete, setLoadingDelayComplete] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterVisible, setIsFilterVisible] = useState<boolean>(false);
  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      const fetchStartTime = Date.now();
      try {
        const response = await axios.get<Player[]>(`${BACKEND_URL}/api/players`);
        setPlayers(response.data);
      } catch (err) {
        setError('Failed to load players. Please try again later.');
        console.error('There was an error fetching the players!', err);
      } finally {
        const elapsed = Date.now() - fetchStartTime;
        const remaining = 1000 - elapsed;

        if (remaining > 0) {
          setTimeout(() => {
            setLoadingDelayComplete(true);
            setLoading(false);
          }, remaining);
        } else {
          setLoadingDelayComplete(true);
          setLoading(false);
        }
      }
    };

    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchPlayers();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const uniqueTeams = useMemo(() => {
    const teamSet: Record<string, string> = {};
    players.forEach((player) => {
      if (player.team) {
        teamSet[player.team._id] = player.team.teamName;
      }
    });
    return Object.entries(teamSet);
  }, [players]);

  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...players];

    if (selectedTeams.length > 0) {
      result = result.filter((player) => {
        if (!player.team) return false;
        return selectedTeams.includes(player.team._id);
      });
    }

    if (debouncedSearchQuery.trim() !== '') {
      const tokens = debouncedSearchQuery.toLowerCase().split(' ');
      result = result.filter((player) => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        return tokens.every((t) => fullName.includes(t));
      });
    }

    result.sort((a, b) => {
      const nameA = a.firstName.toLowerCase();
      const nameB = b.firstName.toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [players, selectedTeams, debouncedSearchQuery, sortOrder]);

  const clearAllFilters = () => {
    setSelectedTeams([]);
    setSearchQuery('');
  };

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-6">
            <div className="flex flex-col items-center mt-6 space-y-4">
        <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="flex flex-col sm:flex-row justify-center items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="w-full sm:w-auto flex items-center space-x-2">
          <div className="w-16 h-8 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="w-48 h-8 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-32 h-8 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="w-32 h-8 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="flex flex-col items-center mt-6 space-y-4">
        <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
        {/* <div className="h-8 w-40 bg-gray-300 dark:bg-gray-700 rounded" /> */}
      </div>

      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 
                     flex flex-col sm:flex-row sm:justify-between sm:items-center 
                     bg-gray-50 dark:bg-gray-700 transition-colors duration-300"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20" />
            </div>
          </div>
          <div className="mt-4 sm:mt-0 w-24 h-8 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
      ))}
    </div>
  );

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const showSkeleton = loading || !loadingDelayComplete;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl w-full">
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Players</span>
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

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
          {showSkeleton ? (
            renderSkeleton()
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md 
                           hover:bg-purple-700 focus:outline-none 
                           focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 
                           transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
          <h1
            className="font-extrabold text-gray-900 dark:text-gray-100 mb-2"
            style={{ fontSize: '34px' }}
          >
            Players
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mb-2"
            style={{ fontSize: '16px' }}
          >
            This page allows you to explore detailed player profiles, including team statistics, and biographical information.
          </p>
          <br />
          <p
            className="text-sm text-gray-500 dark:text-gray-400 italic"
            style={{ fontSize: '12px' }}
          >
            Note: All information is presented for reference and may be updated or corrected at any time.
          </p>
          <br/>
        </div>
              <div className="flex flex-col sm:flex-row justify-center items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4">
                
                <div className="flex items-center relative">
                  <label className="mr-2 font-semibold flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                    <svg
                      className="w-5 h-5 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>Search:</span>
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="border border-gray-300 dark:border-gray-600 bg-white 
                               dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                               p-2 rounded w-48 sm:w-64 pr-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 
                                 text-gray-500 dark:text-gray-400 hover:text-gray-700 
                                 dark:hover:text-gray-300 focus:outline-none"
                      aria-label="Clear search"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex items-center">
                  <button
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="flex items-center px-4 py-2 bg-blue-500 dark:bg-blue-700 
                               text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 
                               transition-colors duration-200"
                  >
                    {sortOrder === 'asc' ? (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Sort Descending
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Sort Ascending
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center">
                  <button
                    onClick={() => setIsFilterVisible(!isFilterVisible)}
                    className="flex items-center px-4 py-2 bg-green-500 dark:bg-green-700 
                               text-white rounded hover:bg-green-600 dark:hover:bg-green-800 
                               transition-colors duration-200"
                  >
                    {isFilterVisible ? (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Hide Filters
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Show Filters
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isFilterVisible && (
                <div className="border border-gray-300 dark:border-gray-600 p-4 rounded mb-4">
                  <div className="mb-2">
                    <button
                      onClick={() => setIsTeamFilterOpen(!isTeamFilterOpen)}
                      className="w-full flex justify-between items-center px-2 py-1 
                                 bg-gray-100 dark:bg-gray-700 rounded"
                    >
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Filter by Team</span>
                      <svg
                        className={`w-5 h-5 transform transition-transform duration-200 ${
                          isTeamFilterOpen ? 'rotate-180' : 'rotate-0'
                        } text-gray-800 dark:text-gray-200`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isTeamFilterOpen && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {uniqueTeams.map(([teamId, teamName]) => (
                          <label
                            key={teamId}
                            className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTeams.includes(teamId)}
                              onChange={() => {
                                setSelectedTeams((prev) =>
                                  prev.includes(teamId)
                                    ? prev.filter((id) => id !== teamId)
                                    : [...prev, teamId]
                                );
                              }}
                              className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                            />
                            <span>{teamName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      onClick={clearAllFilters}
                      className="px-3 py-1 bg-red-500 dark:bg-red-700 text-white rounded 
                                 hover:bg-red-600 dark:hover:bg-red-800 text-sm"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center mt-6">
                {['admin', 'manager'].includes(user.role) && (
                  <Link to="/players/add" className="mt-4">
                    <button
                      className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md 
                                 hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 
                                 transition-colors duration-200"
                    >
                      Add New Player
                    </button>
                  </Link>
                )}
              </div>

              <div className="text-center mb-4 text-gray-700 dark:text-gray-300">
                {filteredAndSortedPlayers.length} players found.
              </div>

              <div className="space-y-6">
                {filteredAndSortedPlayers.map((player) => {
                  const teamName = player.team?.teamName || 'Unknown';
                  return (
                    <div
                      key={player._id}
                      className="border border-gray-200 dark:border-gray-600 
                                 rounded-lg p-4 flex flex-col sm:flex-row 
                                 sm:justify-between sm:items-center bg-gray-50 
                                 dark:bg-gray-700 transition-colors duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        {player.image ? (
                          <img
                            src={`${BACKEND_URL}${player.image}`}
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-16 h-16 object-cover rounded-full"
                          />
                        ) : (
                          <div
                            className="w-16 h-16 bg-gray-300 dark:bg-gray-600 
                                       rounded-full flex items-center justify-center 
                                       text-gray-700 dark:text-gray-200 text-xl font-bold"
                          >
                            {player.firstName.charAt(0)}
                            {player.lastName.charAt(0)}
                          </div>
                        )}

                        <div className="text-center sm:text-left">
                          <Link to={`/players/${player._id}`}>
                            <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                              {player.firstName} {player.lastName}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Age:</strong> {player.age}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Team:</strong> {teamName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0">
                        <Link to={`/players/${player._id}`}>
                          <button
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white 
                                       rounded-md focus:outline-none focus:ring-2 
                                       focus:ring-green-400 dark:focus:ring-green-600 
                                       transition-colors duration-200"
                          >
                            View Details
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {filteredAndSortedPlayers.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    No matching players found. Try adjusting your search or filters.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayersList;
