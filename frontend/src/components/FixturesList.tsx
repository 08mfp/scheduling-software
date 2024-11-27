// frontend/src/components/FixturesList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Define the Fixture interface
interface Fixture {
  _id: string;
  round: number;
  date: string;
  homeTeam: {
    _id: string;
    teamName: string;
  };
  awayTeam: {
    _id: string;
    teamName: string;
  };
  stadium: {
    _id: string;
    stadiumName: string;
  };
  location: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  season: number;
}

const FixturesList: React.FC = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [season, setSeason] = useState<number>(new Date().getFullYear());
  const [seasons, setSeasons] = useState<number[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState<boolean>(true);
  const [loadingFixtures, setLoadingFixtures] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get<number[]>('http://localhost:5003/api/fixtures/seasons');
        const fetchedSeasons = response.data;

        if (fetchedSeasons.length > 0) {
          const sortedSeasons = fetchedSeasons.sort((a, b) => b - a);
          setSeasons(sortedSeasons);
          setSeason(sortedSeasons[0]);
        }

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
    if (season) {
      fetchFixtures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  const fetchFixtures = async () => {
    setLoadingFixtures(true);
    try {
      const response = await axios.get<Fixture[]>(`http://localhost:5003/api/fixtures?season=${season}`);
      setFixtures(response.data);
      setLoadingFixtures(false);
    } catch (err) {
      console.error('There was an error fetching the fixtures!', err);
      setError('Failed to load fixtures.');
      setLoadingFixtures(false);
    }
  };

  const deleteFixture = async (id: string) => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this fixture.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this fixture?')) {
      try {
        await axios.delete(`http://localhost:5003/api/fixtures/${id}`);
        setFixtures(fixtures.filter((fixture) => fixture._id !== id));
      } catch (error) {
        console.error('There was an error deleting the fixture!', error);
        setError('Failed to delete fixture.');
      }
    }
  };

  if (loadingSeasons) {
    return <div>Loading seasons...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div>
      <h2>Fixtures for Season {season}</h2>

      {/* Season Selection Dropdown */}
      <label htmlFor="season-select">Select Season:</label>
      <select
        id="season-select"
        value={season}
        onChange={(e) => setSeason(parseInt(e.target.value))}
      >
        {seasons.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Show Add New Fixture button to admins */}
      {user && user.role === 'admin' && (
        <Link to="/fixtures/add">
          <button>Add New Fixture</button>
        </Link>
      )}

      {/* Render Loading State for Fixtures */}
      {loadingFixtures ? (
        <div>Loading fixtures...</div>
      ) : fixtures.length > 0 ? (
        fixtures.map((fixture) => (
          <div key={fixture._id} style={{ marginBottom: '20px' }}>
            <h3>
              Round {fixture.round}: {fixture.homeTeam.teamName} vs {fixture.awayTeam.teamName}
            </h3>
            <p>
              <strong>Date:</strong> {new Date(fixture.date).toLocaleString()}
            </p>
            <p>
              <strong>Stadium:</strong> {fixture.stadium.stadiumName}
            </p>
            <p>
              <strong>Location:</strong> {fixture.location}
            </p>
            {fixture.homeTeamScore != null && fixture.awayTeamScore != null ? (
              <p>
                <strong>Score:</strong> {fixture.homeTeamScore} - {fixture.awayTeamScore}
              </p>
            ) : (
              <p>Score not available</p>
            )}
            {/* Links to Edit and Delete Buttons */}
            {user && user.role === 'admin' && (
              <>
                <Link to={`/fixtures/edit/${fixture._id}`}>
                  <button>Edit</button>
                </Link>
                <button onClick={() => deleteFixture(fixture._id)}>Delete</button>
              </>
            )}
            <hr />
          </div>
        ))
      ) : (
        <div>No fixtures found for this season.</div>
      )}
    </div>
  );
};

export default FixturesList;
