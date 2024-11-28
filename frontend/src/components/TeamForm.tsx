// frontend/src/components/TeamForm.tsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { Stadium } from '../interfaces/Stadium';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';

const TeamForm: React.FC = () => {
  const [team, setTeam] = useState<Partial<Team>>({
    teamName: '',
    teamRanking: 0,
    teamLocation: '',
    teamCoach: '',
    stadium: {
      _id: '',
      stadiumName: '',
      stadiumCity: '',
      stadiumCountry: '',
      latitude: 0,
      longitude: 0,
      stadiumCapacity: 0,
      surfaceType: 'Grass',
    },
  });
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.role === 'admin') {
      // Fetch stadiums for the dropdown
      axios
        .get('http://localhost:5003/api/stadiums')
        .then((response) => {
          setStadiums(response.data);
        })
        .catch((error) => {
          console.error('There was an error fetching the stadiums!', error);
        });

      if (id) {
        // Fetch the team data for editing
        axios
          .get(`http://localhost:5003/api/teams/${id}`)
          .then((response) => {
            setTeam(response.data);

            // Fetch players for the team
            axios
              .get(`http://localhost:5003/api/players?team=${id}`)
              .then((playerResponse) => {
                setPlayers(playerResponse.data);
              })
              .catch((error) => {
                console.error('There was an error fetching the players!', error);
              });
          })
          .catch((error) => {
            console.error('There was an error fetching the team!', error);
          });
      }
    }
  }, [id, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeam((prevTeam) => ({
      ...prevTeam,
      [name]: name === 'teamRanking' ? parseInt(value) : value,
    }));
  };

  const handleStadiumChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stadiumId = e.target.value;
    const selectedStadium = stadiums.find((stadium) => stadium._id === stadiumId);
    setTeam((prevTeam) => ({
      ...prevTeam,
      stadium: selectedStadium || prevTeam.stadium,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('teamName', team.teamName || '');
    formData.append('teamRanking', team.teamRanking?.toString() || '');
    formData.append('teamLocation', team.teamLocation || '');
    formData.append('teamCoach', team.teamCoach || '');
    formData.append('stadium', team.stadium?._id || '');

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    if (id) {
      // Update existing team
      axios
        .put(`http://localhost:5003/api/teams/${id}`, formData)
        .then(() => {
          navigate('/teams');
        })
        .catch((error) => {
          console.error('There was an error updating the team!', error);
        });
    } else {
      // Create new team
      axios
        .post('http://localhost:5003/api/teams', formData)
        .then(() => {
          navigate('/teams');
        })
        .catch((error) => {
          console.error('There was an error creating the team!', error);
        });
    }
  };

  // If the user is not authenticated or doesn't have admin role, show unauthorized message
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>{id ? 'Edit Team' : 'Add New Team'}</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div>
          <label>Team Name:</label>
          <input
            type="text"
            name="teamName"
            value={team.teamName || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Team Ranking:</label>
          <input
            type="number"
            name="teamRanking"
            value={team.teamRanking || 0}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Team Location:</label>
          <input
            type="text"
            name="teamLocation"
            value={team.teamLocation || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Home Stadium:</label>
          <select
            name="stadium"
            value={team.stadium?._id || ''}
            onChange={handleStadiumChange}
            required
          >
            <option value="">Select a stadium</option>
            {stadiums.map((stadium) => (
              <option key={stadium._id} value={stadium._id}>
                {stadium.stadiumName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Coach:</label>
          <input
            type="text"
            name="teamCoach"
            value={team.teamCoach || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Image:</label>
          <input type="file" name="image" accept="image/*" onChange={handleImageChange} />
          {team.image && (
            <div>
              <img src={`http://localhost:5003${team.image}`} alt="Team" width="100" />
            </div>
          )}
        </div>
        {/* Display the list of players with links to their edit pages */}
        {id && (
          <div>
            <h3>Players:</h3>
            {players.length > 0 ? (
              <ul>
                {players.map((player) => (
                  <li key={player._id}>
                    <Link to={`/players/${player._id}`}>
                      {player.firstName} {player.lastName}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No players found for this team.</p>
            )}
            <Link to="/players/add">
              <button>Add New Player</button>
            </Link>
          </div>
        )}
        <button type="submit">{id ? 'Update Team' : 'Add Team'}</button>
      </form>
    </div>
  );
};

export default TeamForm;
