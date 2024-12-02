// frontend/src/components/FixturesList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Fixture } from '../interfaces/Fixture';
import { Team } from '../interfaces/Team';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const FixturesList: React.FC = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [season, setSeason] = useState<number>(new Date().getFullYear());
  const [seasons, setSeasons] = useState<number[]>([]);
  const [teamMap, setTeamMap] = useState<{ [key: string]: Team }>({});
  const [loadingSeasons, setLoadingSeasons] = useState<boolean>(true);
  const [loadingFixtures, setLoadingFixtures] = useState<boolean>(true);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useContext(AuthContext);

  // Fetch seasons
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

  // Fetch fixtures whenever the season changes
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
            // Assuming your backend supports fetching multiple teams by IDs
            // Adjust the query parameters based on your backend's implementation
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
      } catch (err) {
        console.error('Error fetching fixtures:', err);
        setError('Failed to load fixtures.');
        setLoadingFixtures(false);
      }
    };
    fetchFixtures();
  }, [season]);

  if (loadingSeasons || loadingFixtures || loadingTeams) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  // Group fixtures by round
  const groupedFixtures = fixtures.reduce((acc: { [key: number]: Fixture[] }, fixture) => {
    acc[fixture.round] = acc[fixture.round] || [];
    acc[fixture.round].push(fixture);
    return acc;
  }, {});

  return (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-center mb-6">Fixtures for Season {season}</h2>
    <div className="text-center mb-4">
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
    <div className="max-w-4xl mx-auto">
      {Object.entries(groupedFixtures).map(([round, fixtures]) => (
        <div key={round} className="mb-8">
          <h3 className="text-xl font-bold mb-4">Round {round}</h3>
          {fixtures.map((fixture) => {
            const homeTeam = teamMap[fixture.homeTeam._id];
            const awayTeam = teamMap[fixture.awayTeam._id];
            const stadiumName = fixture.stadium.stadiumName;
            const matchDate = new Date(fixture.date).toLocaleDateString();

            if (!homeTeam || !awayTeam) {
              return (
                <div key={fixture._id} className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                  Fixture data incomplete. Please contact support.
                </div>
              );
            }

            const homeTeamImage = homeTeam.image
              ? `${BACKEND_URL}${homeTeam.image}`
              : '/images/default-home-team-logo.png';
            const awayTeamImage = awayTeam.image
              ? `${BACKEND_URL}${awayTeam.image}`
              : '/images/default-away-team-logo.png';

            return (
              <div
                key={fixture._id}
                className="flex flex-col bg-white border rounded p-4 mb-4 shadow-md space-y-4"
              >
                {/* Home and Away Team Blocks */}
                <div className="flex justify-between items-center">
                  {/* Home Team */}
                  <div className="flex items-center space-x-4">
                    <img
                      src={homeTeamImage}
                      alt={`${homeTeam.teamName} logo`}
                      className="w-16 h-16"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.hasFallback) {
                          target.src = '/images/default-home-team-logo.png';
                          target.dataset.hasFallback = 'true';
                        }
                      }}
                      loading="lazy"
                    />
                    <Link to={`/teams/${homeTeam._id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                      {homeTeam.teamName}
                    </Link>
                  </div>
                  {/* Match Date */}
                  <div className="text-center text-gray-600 font-medium">
                    <div>{matchDate}</div>
                  </div>
                  {/* Away Team */}
                  <div className="flex items-center space-x-4">
                    <Link to={`/teams/${awayTeam._id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                      {awayTeam.teamName}
                    </Link>
                    <img
                      src={awayTeamImage}
                      alt={`${awayTeam.teamName} logo`}
                      className="w-16 h-16"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.hasFallback) {
                          target.src = '/images/default-away-team-logo.png';
                          target.dataset.hasFallback = 'true';
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                </div>
                {/* Stadium and Details */}
                <div className="text-center">
                  <Link to={`/stadiums/${fixture.stadium._id}`} className="text-gray-600 hover:underline">
                    {stadiumName}
                  </Link>
                </div>
                <div className="text-center">
                  <Link
                    to={`/fixtures/${fixture._id}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
);
};

export default FixturesList;
