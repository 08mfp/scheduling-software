// frontend/src/components/FixtureForm.tsx

import React, { useState, useEffect, useContext } from 'react';
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

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchTeams();
      fetchStadiums();
      if (id) {
        // Fetch the fixture data for editing
        axios
          .get(`http://localhost:5003/api/fixtures/${id}`)
          .then((response) => {
            const data = response.data;
            setFixture({
              round: data.round,
              date: data.date.substring(0, 16), // Get date and time
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
      }
    }
  }, [id, user]);

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

  // If the user is not authenticated or doesn't have admin role, redirect to unauthorized
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>{id ? 'Edit Fixture' : 'Add New Fixture'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Round:</label>
          <input
            type="number"
            name="round"
            min="1"
            max="5"
            value={fixture.round}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Date and Time:</label>
          <input
            type="datetime-local"
            name="date"
            value={fixture.date}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Season:</label>
          <input
            type="number"
            name="season"
            value={fixture.season}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Home Team:</label>
          <select name="homeTeam" value={fixture.homeTeam} onChange={handleChange} required>
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Away Team:</label>
          <select name="awayTeam" value={fixture.awayTeam} onChange={handleChange} required>
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Stadium:</label>
          <select name="stadium" value={fixture.stadium} onChange={handleChange} required>
            <option value="">Select a stadium</option>
            {stadiums.map((stadium) => (
              <option key={stadium._id} value={stadium._id}>
                {stadium.stadiumName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Location:</label>
          <input
            type="text"
            name="location"
            value={fixture.location}
            onChange={handleChange}
            required
          />
        </div>
        {isPastDate() && (
          <>
            <div>
              <label>Home Team Score:</label>
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
              <label>Away Team Score:</label>
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
        )}
        {!isPastDate() && <p>Scores are not required for future fixtures.</p>}
        <button type="submit">{id ? 'Update Fixture' : 'Add Fixture'}</button>
      </form>
    </div>
  );
};

export default FixtureForm;
