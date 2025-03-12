import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import { Team } from '../interfaces/Team';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const TeamsList: React.FC = () => {

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

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(true);
  const [loadingDelayComplete, setLoadingDelayComplete] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [sortField, setSortField] = useState<'name' | 'ranking' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchTeams = async () => {
      setLoadingTeams(true);
      const fetchStartTime = Date.now();

      try {
        const response = await axios.get<Team[]>(`${BACKEND_URL}/api/teams`);
        setTeams(response.data);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams.');
      } finally {
        const elapsed = Date.now() - fetchStartTime;
        const remaining = 2000 - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            setLoadingDelayComplete(true);
            setLoadingTeams(false);
          }, remaining);
        } else {
          setLoadingDelayComplete(true);
          setLoadingTeams(false);
        }
      }
    };
    fetchTeams();
  }, []);

  const filteredAndSortedTeams = useMemo(() => {
    let filtered = [...teams];
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(team =>
        team.teamName.toLowerCase().includes(query)
      );
    }
    if (sortField === 'name') {
      filtered.sort((a, b) => {
        const nameA = a.teamName.toLowerCase();
        const nameB = b.teamName.toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (sortField === 'ranking') {
      filtered.sort((a, b) => {
        const rankA = a.teamRanking ?? 9999;
        const rankB = b.teamRanking ?? 9999;
        return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
      });
    }
    return filtered;
  }, [teams, debouncedSearchQuery, sortField, sortOrder]);


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

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const showSkeleton = loadingTeams || !loadingDelayComplete;
  const renderSkeleton = () => (
    <div className="animate-pulse space-y-6">
            <div className="flex flex-col items-center mt-6 space-y-4">
        <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-8 w-28 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-8 w-36 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="flex flex-col items-center mb-6 space-y-3">
        <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 
                     flex flex-col sm:flex-row sm:justify-between sm:items-center 
                     bg-gray-50 dark:bg-gray-700 transition-colors duration-300 mb-2"
        >
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 
                    flex items-start justify-center py-12 px-4 
                    sm:px-6 lg:px-8 transition-colors duration-300"
    >
      <div className="max-w-6xl w-full">
        <div className="flex justify-between items-center mb-8 px-4 py-2 
                        bg-gray-100 dark:bg-gray-800 rounded-md"
        >
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Teams</span>
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
            <div className="text-center text-red-500 py-10">{error}</div>
          ) : (
            <>
        <div className="text-center">
          <h1
            className="font-extrabold text-gray-900 dark:text-gray-100 mb-2"
            style={{ fontSize: '34px' }}
          >
            Teams
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mb-2"
            style={{ fontSize: '16px' }}
          >
            This page allows you to access comprehensive team data, including rankings, performance stats, player profiles, coaching information, stadium details, and more.
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
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
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
                    placeholder="Search teams..."
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

                <div>
                  <button
                    onClick={() => {
                      if (sortField === 'name') {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('name');
                        setSortOrder('asc');
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-green-500 dark:bg-green-700 
                               text-white rounded hover:bg-green-600 dark:hover:bg-green-800 
                               transition-colors duration-200"
                  >
                    {sortField === 'name' ? (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {sortOrder === 'asc' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                        Sort by Name ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Sort by Name
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (sortField === 'ranking') {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField('ranking');
                        setSortOrder('asc');
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-purple-500 dark:bg-purple-700 
                               text-white rounded hover:bg-purple-600 dark:hover:bg-purple-800 
                               transition-colors duration-200"
                  >
                    {sortField === 'ranking' ? (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {sortOrder === 'asc' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                        Sort by Ranking ({sortOrder === 'asc' ? 'Low-High' : 'High-Low'})
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Sort by Ranking
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center mt-6">
                {user.role === 'admin' && (
                  <Link to="/teams/add" className="mt-4">
                    <button
                      className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md 
                                 hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 
                                 transition-colors duration-200"
                    >
                      Add New Team
                    </button>
                  </Link>
                )}
              </div>

              <div className="space-y-6">
                {filteredAndSortedTeams.map((team) => {
                  const teamColor = getTeamColor(team.teamName);
                  return (
                    <div
                      key={team._id}
                      className="border border-gray-200 dark:border-gray-600 
                                 rounded-lg p-4 flex flex-col sm:flex-row 
                                 sm:justify-between sm:items-center 
                                 bg-gray-50 dark:bg-gray-700 transition-colors duration-300"
                      style={{
                        backgroundColor: teamColor.backgroundColor,
                        color: teamColor.textColor,
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={`${BACKEND_URL}${team.image}`}
                          alt={`${team.teamName} Logo`}
                          className="w-16 h-16 object-contain rounded-full"
                          loading="lazy"
                        />
                        <div>
                          <Link to={`/teams/${team._id}`}>
                            <h3 className="text-xl font-semibold hover:underline">
                              {team.teamName}
                            </h3>
                          </Link>
                          <p className="text-sm">
                            <strong>Ranking:</strong> {team.teamRanking}
                          </p>
                          <p className="text-sm">
                            <strong>Stadium:</strong> {team.stadium?.stadiumName || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0">
                        <Link to={`/teams/${team._id}`}>
                          <button
                            className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{
                              backgroundColor: teamColor.textColor,
                              color: teamColor.backgroundColor,
                              border: `2px solid ${teamColor.backgroundColor}`,
                            }}
                          >
                            View Details
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {filteredAndSortedTeams.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    No teams found. Please add a new team.
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

export default TeamsList;
