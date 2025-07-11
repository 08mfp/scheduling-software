import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import { Fixture } from '../interfaces/Fixture';
import { Team } from '../interfaces/Team';
import RankBadge from './RankBadge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

export interface Stadium {
  _id: string;
  stadiumName: string;
  stadiumCity?: string;
  stadiumCountry?: string;
  latitude?: number;
  longitude?: number;
  stadiumCapacity?: number;
  surfaceType?: 'Grass' | 'Artificial Turf';
}

const FixturesList: React.FC = () => {

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [season, setSeason] = useState<number>(new Date().getFullYear());
  const [seasons, setSeasons] = useState<number[]>([]);
  const [teamMap, setTeamMap] = useState<{ [key: string]: Team }>({});
  const [loadingSeasons, setLoadingSeasons] = useState<boolean>(true);
  const [loadingFixtures, setLoadingFixtures] = useState<boolean>(true);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRounds, setSelectedRounds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStadiums, setSelectedStadiums] = useState<string[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [teamRole, setTeamRole] = useState<'home' | 'away' | 'both'>('both');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [loadingDelayComplete, setLoadingDelayComplete] = useState<boolean>(false);
  const { user } = useContext(AuthContext);

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
        return { backgroundColor: '#cccccc', textColor: '#000000' };
    }
  };

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

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get<number[]>(`${BACKEND_URL}/api/fixtures/seasons`);
        setSeasons(response.data);
        setSeason(response.data[0]);
        setLoadingSeasons(false);
      } catch (err) {
        console.error('Error fetching seasons:', err);
        setError('Failed to load seasons.');
        setLoadingSeasons(false);
      }
    };
    fetchSeasons();
  }, []);

  useEffect(() => {
    const fetchFixtures = async () => {
      setLoadingFixtures(true);
      const fetchStartTime = Date.now();

      try {
        const response = await axios.get<Fixture[]>(`${BACKEND_URL}/api/fixtures?season=${season}`);
        console.log('Fetched Fixtures:', response.data);
        setFixtures(response.data);
        setLoadingFixtures(false);

        const teamIdsSet = new Set<string>();
        response.data.forEach((fixture) => {
          teamIdsSet.add(fixture.homeTeam._id);
          teamIdsSet.add(fixture.awayTeam._id);
        });
        const uniqueTeamIds = Array.from(teamIdsSet);

        if (uniqueTeamIds.length > 0) {
          setLoadingTeams(true);
          try {
            const teamsResponse = await axios.get<Team[]>(`${BACKEND_URL}/api/teams`, {
              params: { ids: uniqueTeamIds.join(',') },
            });
            console.log('Fetched Teams:', teamsResponse.data); 

            const fetchedTeamMap: { [key: string]: Team } = {};
            teamsResponse.data.forEach((team) => {
              fetchedTeamMap[team._id] = team;
            });
            setTeamMap(fetchedTeamMap);
            setLoadingTeams(false);
          } catch (teamErr) {
            console.error('Error fetching teams:', teamErr);
            setError('Failed to load team details.');
            setLoadingTeams(false);
          }
        }

        const uniqueStadiumsMap: { [key: string]: Stadium } = {};
        response.data.forEach((fixture) => {
          uniqueStadiumsMap[fixture.stadium._id] = fixture.stadium;
        });
        const uniqueStadiums = Object.values(uniqueStadiumsMap);
        setStadiums(uniqueStadiums);
      } catch (err) {
        console.error('Error fetching fixtures:', err);
        setError('Failed to load fixtures.');
        setLoadingFixtures(false);
      } finally {
        const elapsed = Date.now() - fetchStartTime;
        const remaining = 2000 - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            setLoadingDelayComplete(true);
          }, remaining);
        } else {
          setLoadingDelayComplete(true);
        }
      }
    };
    fetchFixtures();
  }, [season]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const searchTokens = useMemo(() => {
    return debouncedSearchQuery
      .toLowerCase()
      .split(' ')
      .filter(token => !['v', 'vs'].includes(token));
  }, [debouncedSearchQuery]);

  const highlightText = (text: string, tokens: string[]): React.ReactNode => {
    if (!tokens || tokens.length === 0) return text;

    const escapedTokens = tokens.map(token => token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          tokens.some(token => token.toLowerCase() === part.toLowerCase()) ? (
            <span key={index} className="bg-yellow-300 animate-highlight">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  useEffect(() => {
    let filtered = fixtures;

    if (selectedTeams.length > 0) {
      if (teamRole === 'home') {
        filtered = filtered.filter((fixture) => selectedTeams.includes(fixture.homeTeam._id));
      } else if (teamRole === 'away') {
        filtered = filtered.filter((fixture) => selectedTeams.includes(fixture.awayTeam._id));
      } else {
        filtered = filtered.filter(
          (fixture) =>
            selectedTeams.includes(fixture.homeTeam._id) ||
            selectedTeams.includes(fixture.awayTeam._id)
        );
      }
    }

    if (selectedRounds.length > 0) {
      filtered = filtered.filter((fixture) => selectedRounds.includes(fixture.round));
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((fixture) => new Date(fixture.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((fixture) => new Date(fixture.date) <= end);
    }

    if (selectedStadiums.length > 0) {
      filtered = filtered.filter((fixture) =>
        selectedStadiums.includes(fixture.stadium._id)
      );
    }

    if (debouncedSearchQuery.trim() !== '') {
      const tokens = searchTokens;

      if (tokens.length > 0) {
        filtered = filtered.filter((fixture: Fixture) => {
          const homeTeamName = teamMap[fixture.homeTeam._id]?.teamName.toLowerCase() || '';
          const awayTeamName = teamMap[fixture.awayTeam._id]?.teamName.toLowerCase() || '';
          const stadiumName = fixture.stadium.stadiumName.toLowerCase() || '';

          return tokens.every(token =>
            homeTeamName.includes(token) ||
            awayTeamName.includes(token) ||
            stadiumName.includes(token)
          );
        });
      }
    }

    setFilteredFixtures(filtered);
  }, [
    selectedTeams,
    selectedRounds,
    selectedStadiums,
    startDate,
    endDate,
    teamRole,
    debouncedSearchQuery,
    searchTokens,
    fixtures,
    teamMap,
  ]);

  const handleTeamSelection = (teamId: string) => {
    setSelectedTeams((prevSelected) =>
      prevSelected.includes(teamId)
        ? prevSelected.filter((id) => id !== teamId)
        : [...prevSelected, teamId]
    );
  };

  const handleRoundSelection = (round: number) => {
    setSelectedRounds((prevSelected) =>
      prevSelected.includes(round)
        ? prevSelected.filter((r) => r !== round)
        : [...prevSelected, round]
    );
  };

  const handleStadiumSelection = (stadiumId: string) => {
    setSelectedStadiums((prevSelected) =>
      prevSelected.includes(stadiumId)
        ? prevSelected.filter((id) => id !== stadiumId)
        : [...prevSelected, stadiumId]
    );
  };

  const clearAllFilters = () => {
    setSelectedTeams([]);
    setSelectedRounds([]);
    setStartDate('');
    setEndDate('');
    setSelectedStadiums([]);
    setTeamRole('both');
    setSearchQuery(''); 
  };

  const groupedFixtures = useMemo<{ [key: number]: Fixture[] }>(() => {
    return filteredFixtures.reduce((acc: { [key: number]: Fixture[] }, fixture: Fixture) => {
      acc[fixture.round] = acc[fixture.round] || [];
      acc[fixture.round].push(fixture);
      return acc;
    }, {} as { [key: number]: Fixture[] });
  }, [filteredFixtures]);

  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState<boolean>(false);
  const [isRoundFilterOpen, setIsRoundFilterOpen] = useState<boolean>(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState<boolean>(false);
  const [isStadiumFilterOpen, setIsStadiumFilterOpen] = useState<boolean>(false);
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState<boolean>(false);

  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

  const sortedRoundNumbers = useMemo<number[]>(() => {
    const rounds = Object.keys(groupedFixtures)
      .map((round) => parseInt(round))
      .filter((round) => !isNaN(round));
    return sortOrder === 'asc'
      ? rounds.sort((a, b) => a - b)
      : rounds.sort((a, b) => b - a);
  }, [groupedFixtures, sortOrder]);

  const renderSkeleton = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center mt-6 space-y-4">
        <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="flex justify-center space-x-4">
        <div className="h-10 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-10 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-10 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-10 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>

      {isFilterVisible && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
          ))}
        </div>
      )}

      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded shadow-md space-y-4 animate-pulse">
          <div className="flex justify-between items-center space-x-4">
            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="h-6 w-1/2 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center space-x-4">
            <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 w-1/4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loadingSeasons || loadingFixtures || loadingTeams || !loadingDelayComplete) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full">
          <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
            <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
              <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <FaInfoCircle className="mr-1" />
                Home
              </Link>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Fixtures</span>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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
            {renderSkeleton()}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full">
          <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
            <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
              <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <FaInfoCircle className="mr-1" />
                Home
              </Link>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Fixtures</span>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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
            <div className="text-center text-red-500 py-10">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Fixtures</span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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
        <div className="text-center">
          <h1
            className="font-extrabold text-gray-900 dark:text-gray-100 mb-2"
            style={{ fontSize: '34px' }}
          >
            Fixtures
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mb-2"
            style={{ fontSize: '16px' }}
          >
            This page allows you to review past rugby fixtures, explore detailed statistics—including score rankings, locations, and stadium information—and check upcoming match schedules.
          </p>
          <br />
          <p
            className="text-sm text-gray-500 dark:text-gray-400 italic"
            style={{ fontSize: '12px' }}
          >
            Note: All details are for reference only; please verify with official sources.
          </p>
          <br/>
        </div>
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-center items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center">
                <label className="mr-2 font-semibold text-gray-800 dark:text-gray-200">Season:</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(parseInt(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center relative">
                <label className="mr-2 font-semibold flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search:</span>
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search fixtures..."
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded w-48 sm:w-64 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    aria-label="Clear search"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center">
                <button
                  onClick={toggleSortOrder}
                  className="flex items-center px-4 py-2 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 transition-colors duration-200"
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
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
                        xmlns="http://www.w3.org/2000/svg"
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
                  className="flex items-center px-4 py-2 bg-green-500 dark:bg-green-700 text-white rounded hover:bg-green-600 dark:hover:bg-green-800 transition-colors duration-200"
                >
                  {isFilterVisible ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
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
                        xmlns="http://www.w3.org/2000/svg"
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
                    className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Filter by Team</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        isTeamFilterOpen ? 'rotate-180' : 'rotate-0'
                      } text-gray-800 dark:text-gray-200`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isTeamFilterOpen && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.values(teamMap).map((team) => (
                        <label key={team._id} className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            value={team._id}
                            onChange={() => handleTeamSelection(team._id)}
                            checked={selectedTeams.includes(team._id)}
                            className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-sm">{team.teamName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <button
                    onClick={() => setIsRoundFilterOpen(!isRoundFilterOpen)}
                    className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Filter by Round</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        isRoundFilterOpen ? 'rotate-180' : 'rotate-0'
                      } text-gray-800 dark:text-gray-200`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isRoundFilterOpen && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5].map((round) => (
                        <label key={round} className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            value={round}
                            onChange={() => handleRoundSelection(round)}
                            checked={selectedRounds.includes(round)}
                            className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-sm">Round {round}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <button
                    onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                    className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Filter by Date</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        isDateFilterOpen ? 'rotate-180' : 'rotate-0'
                      } text-gray-800 dark:text-gray-200`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isDateFilterOpen && (
                    <div className="mt-2 flex flex-col sm:flex-row sm:space-x-4">
                      <div className="mb-2 sm:mb-0">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <button
                    onClick={() => setIsStadiumFilterOpen(!isStadiumFilterOpen)}
                    className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Filter by Stadium</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        isStadiumFilterOpen ? 'rotate-180' : 'rotate-0'
                      } text-gray-800 dark:text-gray-200`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isStadiumFilterOpen && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {stadiums.map((stadium) => (
                        <label key={stadium._id} className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            value={stadium._id}
                            onChange={() => handleStadiumSelection(stadium._id)}
                            checked={selectedStadiums.includes(stadium._id)}
                            className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-sm">{stadium.stadiumName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <button
                    onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                    className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Filter by Team Role</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${
                        isRoleFilterOpen ? 'rotate-180' : 'rotate-0'
                      } text-gray-800 dark:text-gray-200`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isRoleFilterOpen && (
                    <div className="mt-2 flex space-x-4">
                      <label className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          name="teamRole"
                          value="both"
                          checked={teamRole === 'both'}
                          onChange={() => setTeamRole('both')}
                          className="form-radio h-4 w-4 text-blue-600 dark:text-blue-400"
                        />
                        <span className="text-sm">Both</span>
                      </label>
                      <label className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          name="teamRole"
                          value="home"
                          checked={teamRole === 'home'}
                          onChange={() => setTeamRole('home')}
                          className="form-radio h-4 w-4 text-blue-600 dark:text-blue-400"
                        />
                        <span className="text-sm">Home</span>
                      </label>
                      <label className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          name="teamRole"
                          value="away"
                          checked={teamRole === 'away'}
                          onChange={() => setTeamRole('away')}
                          className="form-radio h-4 w-4 text-blue-600 dark:text-blue-400"
                        />
                        <span className="text-sm">Away</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-1 bg-red-500 dark:bg-red-700 text-white rounded hover:bg-red-600 dark:hover:bg-red-800 text-sm"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}

            <div className="text-center mb-4">
              <span className="text-gray-700 dark:text-gray-300">
                {filteredFixtures.length} fixtures found.
              </span>
            </div>

            <div className="w-full">
              {sortedRoundNumbers.map((round) => (
                <div key={round} className="mb-8">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Round {round}</h3>
                  {groupedFixtures[round].map((fixture: Fixture) => {
                    const homeTeam = teamMap[fixture.homeTeam._id];
                    const awayTeam = teamMap[fixture.awayTeam._id];
                    const stadiumName = fixture.stadium.stadiumName;
                    const matchDate = new Date(fixture.date);
                    const matchDateStr = matchDate.toLocaleDateString();
                    const matchTimeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const homeTeamStyle = getTeamColor(homeTeam?.teamName || '');
                    const awayTeamStyle = getTeamColor(awayTeam?.teamName || '');
                    return (
                      <div
                        key={fixture._id}
                        className="flex flex-col bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-4 mb-4 shadow-md space-y-4 transition-colors duration-300"
                      >
                        <div className="flex justify-between items-center space-x-4">
                          <Link
                            to={`/teams/${homeTeam?._id}`}
                            className="flex flex-col items-center p-2 rounded border border-black dark:border-gray-200"
                            style={{
                              backgroundColor: homeTeamStyle.backgroundColor,
                              color: homeTeamStyle.textColor,
                              flex: '1 1 45%',
                            }}
                          >
                            <img
                              src={`${BACKEND_URL}${homeTeam?.image || '/images/default-home-team-logo.png'}`}
                              alt={`${homeTeam?.teamName} logo`}
                              className="w-8 h-8"
                            />
                            <span className="font-semibold text-center text-2xl">
                              {highlightText(homeTeam?.teamName || '', searchTokens)}
                            </span>
                            <RankBadge rank={homeTeam ? homeTeam.teamRanking : 'N/A'} />
                          </Link>

                          <span className="text-gray-800 dark:text-gray-200 font-bold">vs</span>
                          <Link
                            to={`/teams/${awayTeam?._id}`}
                            className="flex flex-col items-center p-2 rounded border border-black dark:border-gray-200"
                            style={{
                              backgroundColor: awayTeamStyle.backgroundColor,
                              color: awayTeamStyle.textColor,
                              flex: '1 1 45%',
                            }}
                          >
                            <img
                              src={`${BACKEND_URL}${awayTeam?.image || '/images/default-away-team-logo.png'}`}
                              alt={`${awayTeam?.teamName} logo`}
                              className="w-8 h-8"
                            />
                            <span className="font-semibold text-center text-2xl">
                              {highlightText(awayTeam?.teamName || '', searchTokens)}
                            </span>
                            <RankBadge rank={awayTeam ? awayTeam.teamRanking : 'N/A'} />
                          </Link>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                          <Link
                            to={`/stadiums/${fixture.stadium._id}`}
                            className="text-gray-800 dark:text-gray-200 font-bold hover:underline text-sm"
                          >
                            {highlightText(stadiumName, searchTokens)}
                          </Link>

                          <div className="flex flex-col sm:flex-row sm:items-center space-x-0 sm:space-x-2 text-gray-800 dark:text-gray-200 font-bold text-sm">
                            <span>{matchDateStr}</span>
                            <span>{matchTimeStr}</span>
                          </div>
                          <Link
                            to={`/fixtures/${fixture._id}`}
                            className="px-3 py-1 bg-blue-500 dark:bg-blue-700 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-800 text-sm"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixturesList;
