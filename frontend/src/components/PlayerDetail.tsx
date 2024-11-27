// frontend/src/components/PlayerDetail.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';

const PlayerDetail: React.FC = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      axios
        .get(`http://localhost:5003/api/players/${id}`)
        .then((response) => {
          setPlayer(response.data);
        })
        .catch((error) => {
          console.error('There was an error fetching the player!', error);
        });
    }
  }, [id, user]);

  const deletePlayer = () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this player.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this player?')) {
      axios
        .delete(`http://localhost:5003/api/players/${id}`)
        .then(() => {
          navigate('/players');
        })
        .catch((error) => {
          console.error('There was an error deleting the player!', error);
        });
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!player) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>
        {player.firstName} {player.lastName}
      </h2>
      {player.image && (
        <div>
          <img src={`http://localhost:5003${player.image}`} alt="Player" width="200" />
        </div>
      )}
      <p>
        <strong>Age:</strong> {player.age}
      </p>
      <p>
        <strong>Date of Birth:</strong> {new Date(player.dateOfBirth).toLocaleDateString()}
      </p>
      <p>
        <strong>Team:</strong>{' '}
        <Link to={`/teams/${player.team._id}`}>{player.team.teamName}</Link>
      </p>
      {/* Show Edit button to admins and managers, Delete button to admins only */}
      {['admin', 'manager'].includes(user.role) && (
        <Link to={`/players/edit/${player._id}`}>
          <button>Edit</button>
        </Link>
      )}
      {user.role === 'admin' && <button onClick={deletePlayer}>Delete</button>}
    </div>
  );
};

export default PlayerDetail;
