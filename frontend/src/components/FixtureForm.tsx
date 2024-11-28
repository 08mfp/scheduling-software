// frontend/src/components/FixtureForm.tsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

interface Fixture {
  _id?: string;
  round: number;
  date: string; // Date and time in ISO format
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  location: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  season: number;
}

interface Team {
  _id: string;
  teamName: string;
}

interface Stadium {
  _id: string;
  stadiumName: string;
}

const FixtureForm: React.FC = () => {
  const [fixture, setFixture] = useState<Fixture>({
    round: 1,
    date: '',
    homeTeam: '',
    awayTeam: '',
    stadium: '',
    location: '',
    season: new Date().getFullYear(),
  });

  const [teams, setTeams] = useState<Team[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const { user } = useContext(AuthContext);

  const navigate = useNavigate();
  const { id } = useParams();

  // Ref to prevent multiple API calls in Strict Mode
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return; // Prevent duplicate fetches

    if (user && user.role === 'admin') {
      fetchTeams();
      fetchStadiums();

      if (id) {
        // Fetch the fixture data for editing
        fetchFixture(id);
      }

      hasFetched.current = true;
    }
  }, [id, user]);

  const fetchFixture = (fixtureId: string) => {
    axios
      .get(`http://localhost:5003/api/fixtures/${fixtureId}`)
      .then((response) => {
        const data = response.data;
        setFixture({
          round: data.round,
          date: data.date.substring(0, 16), // Format for datetime-local input
          homeTeam: data.homeTeam._id,
          awayTeam: data.awayTeam._id,
          stadium: data.stadium._id,
          location: data.location,
          homeTeamScore: data.homeTeamScore,
          awayTeamScore: data.awayTeamScore,
          season: data.season,
        });
      })
      .catch((error) => {
        console.error('There was an error fetching the fixture!', error);
      });
  };

  const fetchTeams = () => {
    axios
      .get('http://localhost:5003/api/teams')
      .then((response) => {
        setTeams(response.data);
      })
      .catch((error) => {
        console.error('There was an error fetching the teams!', error);
      });
  };

  const fetchStadiums = () => {
    axios
      .get('http://localhost:5003/api/stadiums')
      .then((response) => {
        setStadiums(response.data);
      })
      .catch((error) => {
        console.error('There was an error fetching the stadiums!', error);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFixture((prevFixture) => ({
      ...prevFixture,
      [name]: name === 'round' || name === 'season' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (id) {
      // Update existing fixture
      axios
        .put(`http://localhost:5003/api/fixtures/${id}`, fixture)
        .then(() => {
          navigate('/fixtures');
        })
        .catch((error) => {
          console.error('There was an error updating the fixture!', error);
        });
    } else {
      // Create new fixture
      axios
        .post('http://localhost:5003/api/fixtures', fixture)
        .then(() => {
          navigate('/fixtures');
        })
        .catch((error) => {
          console.error('There was an error creating the fixture!', error);
        });
    }
  };

  // Determine if the date is in the past
  const isPastDate = () => {
    const fixtureDate = new Date(fixture.date);
    const now = new Date();
    return fixtureDate < now;
  };

  // Helper functions to get team and stadium names by ID
  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t._id === teamId);
    return team ? team.teamName : 'Unknown Team';
  };

  const getStadiumName = (stadiumId: string) => {
    const stadium = stadiums.find((s) => s._id === stadiumId);
    return stadium ? stadium.stadiumName : 'Unknown Stadium';
  };

  // If the user is not authenticated or doesn't have admin role, redirect to unauthorized
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>{id ? 'Edit Fixture' : 'Add New Fixture'}</h2>
      <form onSubmit={handleSubmit}>
        {/* Round Label */}
        <div>
          <label><strong>Round:</strong></label>
          <span style={{ marginLeft: '10px' }}>{fixture.round}</span>
        </div>

        {/* Date and Time Input */}
        <div>
          <label><strong>Date and Time:</strong></label>
          <input
            type="datetime-local"
            name="date"
            value={fixture.date}
            onChange={handleChange}
            required
          />
        </div>

        {/* Season Input */}
        <div>
          <label><strong>Season:</strong></label>
          <span style={{ marginLeft: '10px' }}>{fixture.season}</span>
        </div>

        {/* Home Team Label */}
        <div>
          <label><strong>Home Team:</strong></label>
          <span style={{ marginLeft: '10px' }}>{getTeamName(fixture.homeTeam)}</span>
        </div>

        {/* Away Team Label */}
        <div>
          <label><strong>Away Team:</strong></label>
          <span style={{ marginLeft: '10px' }}>{getTeamName(fixture.awayTeam)}</span>
        </div>

        {/* Stadium Select */}
        <div>
          <label><strong>Stadium:</strong></label>
          <select name="stadium" value={fixture.stadium} onChange={handleChange} required>
            <option value="">Select a stadium</option>
            {stadiums.map((stadium) => (
              <option key={stadium._id} value={stadium._id}>
                {stadium.stadiumName}
              </option>
            ))}
          </select>
        </div>

        {/* Location Input */}
        <div>
          <label><strong>Location:</strong></label>
          <input
            type="text"
            name="location"
            value={fixture.location}
            onChange={handleChange}
            required
          />
        </div>

        {/* Score Fields Based on Date */}
        {isPastDate() ? (
          <>
            <div>
              <label><strong>Home Team Score:</strong></label>
              <input
                type="number"
                name="homeTeamScore"
                value={fixture.homeTeamScore ?? ''}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
            <div>
              <label><strong>Away Team Score:</strong></label>
              <input
                type="number"
                name="awayTeamScore"
                value={fixture.awayTeamScore ?? ''}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
          </>
        ) : (
          <p>Scores are not required for future fixtures.</p>
        )}

        <button type="submit">{id ? 'Update Fixture' : 'Add Fixture'}</button>
      </form>
    </div>
  );
};

export default FixtureForm;
