// frontend/src/components/FixturesList.tsx

import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Fixture } from '../interfaces/Fixture';
import { Team } from '../interfaces/Team';
// import { Stadium } from '../interfaces/Stadium'; // Ensure this interface exists

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

export interface Stadium {
  _id: string;
  stadiumName: string;
  stadiumCity?: string;      // Made optional
  stadiumCountry?: string;  // Made optional
  latitude?: number;        // Made optional
  longitude?: number;       // Made optional
  stadiumCapacity?: number; // Made optional
  surfaceType?: 'Grass' | 'Artificial Turf'; // Made optional
}

const FixturesList: React.FC = () => {
  // **State Variables**

  // Basic Data
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [season, setSeason] = useState<number>(new Date().getFullYear());
  const [seasons, setSeasons] = useState<number[]>([]);
  const [teamMap, setTeamMap] = useState<{ [key: string]: Team }>({});
  
  // Loading and Error States
  const [loadingSeasons, setLoadingSeasons] = useState<boolean>(true);
  const [loadingFixtures, setLoadingFixtures] = useState<boolean>(true);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // **Filters State**
  
  // Team and Round Filters
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedRounds, setSelectedRounds] = useState<number[]>([]);
  
  // Date Range Filter
  const [startDate, setStartDate] = useState<string>(''); // Format: YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>('');     // Format: YYYY-MM-DD

  // Venue/Stadium Filter
  const [selectedStadiums, setSelectedStadiums] = useState<string[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]); // Using Stadium interface with optional fields

  // Home/Away Team Filter
  const [teamRole, setTeamRole] = useState<'home' | 'away' | 'both'>('both');

  // Filter Visibility
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // **Search State**
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // **Sort Order State**
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // 'asc' for ascending, 'desc' for descending

  // **Filtered Fixtures State**
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);

  // **Context**
  const { user } = useContext(AuthContext);

  // **Utility Function: Get Team Color**
  const getTeamColor = (teamName: string): { backgroundColor: string; textColor: string } => {
    switch (teamName) {
      case 'England':
        return { backgroundColor: '#ffffff', textColor: '#000000' }; // White background, black text
      case 'France':
        return { backgroundColor: '#0033cc', textColor: '#ffffff' }; // French Blue background, white text
      case 'Ireland':
        return { backgroundColor: '#009933', textColor: '#ffffff' }; // Green background, white text
      case 'Scotland':
        return { backgroundColor: '#003366', textColor: '#ffffff' }; // Dark Blue background, white text
      case 'Italy':
        return { backgroundColor: '#0066cc', textColor: '#ffffff' }; // Azure Blue background, white text
      case 'Wales':
        return { backgroundColor: '#cc0000', textColor: '#ffffff' }; // Red background, white text
      default:
        return { backgroundColor: '#cccccc', textColor: '#000000' }; // Gray background, black text for default/unknown
    }
  };

  // **Fetch Seasons**
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get<number[]>(`${BACKEND_URL}/api/fixtures/seasons`);
        setSeasons(response.data);
        setSeason(response.data[0]); // Default to the most recent season
        setLoadingSeasons(false);
      } catch (err) {
        console.error('Error fetching seasons:', err);
        setError('Failed to load seasons.');
        setLoadingSeasons(false);
      }
    };
    fetchSeasons();
  }, []);

  // **Fetch Fixtures and Teams**
  useEffect(() => {
    const fetchFixtures = async () => {
      setLoadingFixtures(true);
      try {
        const response = await axios.get<Fixture[]>(`${BACKEND_URL}/api/fixtures?season=${season}`);
        console.log('Fetched Fixtures:', response.data); // Debug the fixture data
        setFixtures(response.data);
        setLoadingFixtures(false);

        // Extract unique team IDs from fixtures
        const teamIdsSet = new Set<string>();
        response.data.forEach((fixture) => {
          teamIdsSet.add(fixture.homeTeam._id);
          teamIdsSet.add(fixture.awayTeam._id);
        });
        const uniqueTeamIds = Array.from(teamIdsSet);

        // Fetch team details for these unique IDs
        if (uniqueTeamIds.length > 0) {
          setLoadingTeams(true);
          try {
            const teamsResponse = await axios.get<Team[]>(`${BACKEND_URL}/api/teams`, {
              params: { ids: uniqueTeamIds.join(',') }, // Example: ?ids=1,2,3
            });
            console.log('Fetched Teams:', teamsResponse.data); // Debug the team data

            // Create a mapping from team ID to Team
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

        // Extract unique stadiums from fixtures
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
      }
    };
    fetchFixtures();
  }, [season]);

  // **Debounce Search Query**
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // **Extract Search Tokens**
  const searchTokens = useMemo(() => {
    return debouncedSearchQuery
      .toLowerCase()
      .split(' ')
      .filter(token => !['v', 'vs'].includes(token));
  }, [debouncedSearchQuery]);

  // **Highlight Utility Function**
  const highlightText = (text: string, tokens: string[]): React.ReactNode => {
    if (!tokens || tokens.length === 0) return text;

    // Escape regex special characters in tokens
    const escapedTokens = tokens.map(token => token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    // Create a regex that matches any of the tokens
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    // Split the text based on the regex
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

  // **Filter Fixtures Based on Selected Filters and Search Query**
  useEffect(() => {
    let filtered = fixtures;

    // **Team Filter with Home/Away Role**
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

    // **Round Filter**
    if (selectedRounds.length > 0) {
      filtered = filtered.filter((fixture) => selectedRounds.includes(fixture.round));
    }

    // **Date Range Filter**
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((fixture) => new Date(fixture.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((fixture) => new Date(fixture.date) <= end);
    }

    // **Stadium Filter**
    if (selectedStadiums.length > 0) {
      filtered = filtered.filter((fixture) =>
        selectedStadiums.includes(fixture.stadium._id)
      );
    }

    // **Search Filter**
    if (debouncedSearchQuery.trim() !== '') {
      // Split query into tokens and remove 'v' and 'vs'
      const tokens = searchTokens;

      if (tokens.length > 0) {
        filtered = filtered.filter((fixture: Fixture) => {
          const homeTeamName = teamMap[fixture.homeTeam._id]?.teamName.toLowerCase() || '';
          const awayTeamName = teamMap[fixture.awayTeam._id]?.teamName.toLowerCase() || '';
          const stadiumName = fixture.stadium.stadiumName.toLowerCase() || '';

          // Check if all tokens are present in home/away team names or stadium name
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

  // **Handler Functions**

  // Team Selection Handler
  const handleTeamSelection = (teamId: string) => {
    setSelectedTeams((prevSelected) =>
      prevSelected.includes(teamId)
        ? prevSelected.filter((id) => id !== teamId)
        : [...prevSelected, teamId]
    );
  };

  // Round Selection Handler
  const handleRoundSelection = (round: number) => {
    setSelectedRounds((prevSelected) =>
      prevSelected.includes(round)
        ? prevSelected.filter((r) => r !== round)
        : [...prevSelected, round]
    );
  };

  // Stadium Selection Handler
  const handleStadiumSelection = (stadiumId: string) => {
    setSelectedStadiums((prevSelected) =>
      prevSelected.includes(stadiumId)
        ? prevSelected.filter((id) => id !== stadiumId)
        : [...prevSelected, stadiumId]
    );
  };

  // Clear All Filters Handler
  const clearAllFilters = () => {
    setSelectedTeams([]);
    setSelectedRounds([]);
    setStartDate('');
    setEndDate('');
    setSelectedStadiums([]);
    setTeamRole('both');
    setSearchQuery(''); // Reset search query
  };

  // **Grouping Fixtures by Round using useMemo**
  const groupedFixtures = useMemo<{ [key: number]: Fixture[] }>(() => {
    return filteredFixtures.reduce((acc: { [key: number]: Fixture[] }, fixture: Fixture) => {
      acc[fixture.round] = acc[fixture.round] || [];
      acc[fixture.round].push(fixture);
      return acc;
    }, {} as { [key: number]: Fixture[] });
  }, [filteredFixtures]);

  // **Filter Section Collapsible States**
  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState<boolean>(false);
  const [isRoundFilterOpen, setIsRoundFilterOpen] = useState<boolean>(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState<boolean>(false);
  const [isStadiumFilterOpen, setIsStadiumFilterOpen] = useState<boolean>(false);
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState<boolean>(false);

  // **Sort Toggle Handler**
  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

  // **Sort the Round Numbers Based on Sort Order**
  const sortedRoundNumbers = useMemo<number[]>(() => {
    const rounds = Object.keys(groupedFixtures)
      .map((round) => parseInt(round))
      .filter((round) => !isNaN(round));
    return sortOrder === 'asc'
      ? rounds.sort((a, b) => a - b)
      : rounds.sort((a, b) => b - a);
  }, [groupedFixtures, sortOrder]);

  // **Early Returns for Loading and Error States**
  // **Important:** All Hooks are called before these returns

  if (loadingSeasons || loadingFixtures || loadingTeams) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full bg-white shadow-md rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Fixtures for Season {season}</h2>
        
        {/* **Season Dropdown, Search Bar, Sort Button, and Filter Toggle Container** */}
        <div className="flex flex-col sm:flex-row justify-center items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Season Dropdown */}
          <div className="flex items-center">
            <label className="mr-2 font-semibold">Season:</label>
            <select
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value))}
              className="border border-gray-300 p-2 rounded"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* **Search Bar with Search Icon and Clear Button** */}
          <div className="flex items-center relative">
            <label className="mr-2 font-semibold flex items-center space-x-2">
              {/* Search Icon */}
              <svg
                className="w-5 h-5 text-gray-500"
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
              className="border border-gray-300 p-2 rounded w-48 sm:w-64 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Clear search"
              >
                {/* 'X' Icon */}
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

          {/* **Sort Button** */}
          <div className="flex items-center">
            <button
              onClick={toggleSortOrder}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                    {/* Up Arrow Icon */}
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
                    {/* Down Arrow Icon */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Sort Ascending
                </>
              )}
            </button>
          </div>

          {/* **Filter Toggle Button** */}
          <div className="flex items-center">
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
                    {/* Up Arrow Icon */}
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
                    {/* Down Arrow Icon */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show Filters
                </>
              )}
            </button>
          </div>
        </div>

        {/* **Filter Section** */}
        {isFilterVisible && (
          <div className="border border-gray-300 p-4 rounded mb-4">
            {/* **Team Filter** */}
            <div className="mb-2">
              <button
                onClick={() => setIsTeamFilterOpen(!isTeamFilterOpen)}
                className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 rounded"
              >
                <span className="font-semibold">Filter by Team</span>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isTeamFilterOpen ? 'rotate-180' : 'rotate-0'
                  }`}
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
                    <label key={team._id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={team._id}
                        onChange={() => handleTeamSelection(team._id)}
                        checked={selectedTeams.includes(team._id)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{team.teamName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* **Round Filter** */}
            <div className="mb-2">
              <button
                onClick={() => setIsRoundFilterOpen(!isRoundFilterOpen)}
                className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 rounded"
              >
                <span className="font-semibold">Filter by Round</span>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isRoundFilterOpen ? 'rotate-180' : 'rotate-0'
                  }`}
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
                    <label key={round} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={round}
                        onChange={() => handleRoundSelection(round)}
                        checked={selectedRounds.includes(round)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">Round {round}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* **Date Range Filter** */}
            <div className="mb-2">
              <button
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 rounded"
              >
                <span className="font-semibold">Filter by Date</span>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isDateFilterOpen ? 'rotate-180' : 'rotate-0'
                  }`}
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
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* **Venue/Stadium Filter** */}
            <div className="mb-2">
              <button
                onClick={() => setIsStadiumFilterOpen(!isStadiumFilterOpen)}
                className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 rounded"
              >
                <span className="font-semibold">Filter by Stadium</span>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isStadiumFilterOpen ? 'rotate-180' : 'rotate-0'
                  }`}
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
                    <label key={stadium._id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={stadium._id}
                        onChange={() => handleStadiumSelection(stadium._id)}
                        checked={selectedStadiums.includes(stadium._id)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{stadium.stadiumName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* **Home/Away Team Filter** */}
            <div className="mb-2">
              <button
                onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                className="w-full flex justify-between items-center px-2 py-1 bg-gray-100 rounded"
              >
                <span className="font-semibold">Filter by Team Role</span>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isRoleFilterOpen ? 'rotate-180' : 'rotate-0'
                  }`}
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
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="teamRole"
                      value="both"
                      checked={teamRole === 'both'}
                      onChange={() => setTeamRole('both')}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Both</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="teamRole"
                      value="home"
                      checked={teamRole === 'home'}
                      onChange={() => setTeamRole('home')}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Home</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="teamRole"
                      value="away"
                      checked={teamRole === 'away'}
                      onChange={() => setTeamRole('away')}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Away</span>
                  </label>
                </div>
              )}
            </div>

            {/* **Clear All Filters Button** */}
            <div className="mt-4 text-center">
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* **Optional: Display Number of Fixtures Found** */}
        <div className="text-center mb-4">
          <span className="text-gray-700">
            {filteredFixtures.length} fixtures found.
          </span>
        </div>

        {/* **Fixtures List** */}
        <div className="w-full">
          {sortedRoundNumbers.map((round) => (
            <div key={round} className="mb-8">
              <h3 className="text-xl font-bold mb-4">Round {round}</h3>
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
                    className="flex flex-col bg-white border rounded p-4 mb-4 shadow-md space-y-4"
                  >
                    {/* **Teams Row** */}
                    <div className="flex justify-between items-center space-x-4">
                      {/* Home Team Block */}
                      <Link
                        to={`/teams/${homeTeam?._id}`}
                        className="flex justify-center items-center space-x-2 p-2 rounded border border-black"
                        style={{
                          backgroundColor: homeTeamStyle.backgroundColor,
                          color: homeTeamStyle.textColor, // Text color
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
                      </Link>

                      {/* vs Text */}
                      <span className="text-gray-800 font-bold">vs</span>

                      {/* Away Team Block */}
                      <Link
                        to={`/teams/${awayTeam?._id}`}
                        className="flex justify-center items-center space-x-2 p-2 rounded border border-black"
                        style={{
                          backgroundColor: awayTeamStyle.backgroundColor,
                          color: awayTeamStyle.textColor, // Text color
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
                      </Link>
                    </div>

                    {/* **Match Details Row** */}
                    <div className="flex flex-col items-center sm:flex-row sm:justify-between mt-4 space-y-2 sm:space-y-0">
                      {/* Stadium */}
                      <Link
                        to={`/stadiums/${fixture.stadium._id}`}
                        className="text-black font-bold hover:underline text-sm"
                      >
                        {highlightText(stadiumName, searchTokens)}
                      </Link>

                      {/* Date and Time */}
                      <div className="flex flex-col sm:flex-row sm:items-center space-x-0 sm:space-x-2 text-black font-bold text-sm">
                        <span>{matchDateStr}</span>
                        <span>{matchTimeStr}</span>
                      </div>

                      {/* View Details Button */}
                      <Link
                        to={`/fixtures/${fixture._id}`}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
  );
};

export default FixturesList;
