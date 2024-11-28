// frontend/src/components/PlayerForm.tsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { Team } from '../interfaces/Team';
import { AuthContext } from '../contexts/AuthContext';

const PlayerForm: React.FC = () => {
  const [player, setPlayer] = useState<Partial<Player>>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    team: { _id: '', teamName: '' },
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager'].includes(user.role)) {
      axios.get('http://localhost:5003/api/teams').then((response) => {
        setTeams(response.data);
      });

      if (id) {
        // Fetch the player data for editing
        axios
          .get(`http://localhost:5003/api/players/${id}`)
          .then((response) => {
            setPlayer(response.data);
          })
          .catch((error) => {
            console.error('There was an error fetching the player!', error);
          });
      }
    }
  }, [id, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      image: undefined,
    }));
    setSelectedImage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('firstName', player.firstName || '');
    formData.append('lastName', player.lastName || '');
    formData.append('dateOfBirth', player.dateOfBirth || '');
    formData.append('team', player.team?._id || '');

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    if (removeImage) {
      formData.append('removeImage', 'true');
    }

    if (id) {
      // Update existing player
      axios
        .put(`http://localhost:5003/api/players/${id}`, formData)
        .then(() => {
          navigate('/players');
        })
        .catch((error) => {
          console.error('There was an error updating the player!', error);
        });
    } else {
      // Create new player
      axios
        .post('http://localhost:5003/api/players', formData)
        .then(() => {
          navigate('/players');
        })
        .catch((error) => {
          console.error('There was an error creating the player!', error);
        });
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>{id ? 'Edit Player' : 'Add New Player'}</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div>
          <label>First Name:</label>
          <input
            type="text"
            name="firstName"
            value={player.firstName || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Last Name:</label>
          <input
            type="text"
            name="lastName"
            value={player.lastName || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Image:</label>
          <input type="file" name="image" accept="image/*" onChange={handleImageChange} />
          {player.image && !removeImage && (
            <div>
              <img src={`http://localhost:5003${player.image}`} alt="Player" width="100" />
              <button type="button" onClick={handleRemoveImage}>
                Remove Image
              </button>
            </div>
          )}
        </div>
        <div>
          <label>Date of Birth:</label>
          <input
            type="date"
            name="dateOfBirth"
            value={player.dateOfBirth ? player.dateOfBirth.slice(0, 10) : ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Team:</label>
          <select
            name="team"
            value={player.team?._id || ''}
            onChange={(e) => {
              const teamId = e.target.value;
              const selectedTeam = teams.find((team) => team._id === teamId);
              setPlayer((prevPlayer) => ({
                ...prevPlayer,
                team: selectedTeam,
              }));
            }}
            required
          >
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.teamName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">{id ? 'Update Player' : 'Add Player'}</button>
      </form>
    </div>
  );
};

export default PlayerForm;
