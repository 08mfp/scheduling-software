// frontend/src/components/PlayersList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';

const PlayersList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchPlayers();
    }
  }, [user]);

  const fetchPlayers = () => {
    axios
      .get('http://localhost:5003/api/players')
      .then((response) => {
        setPlayers(response.data);
      })
      .catch((error) => {
        console.error('There was an error fetching the players!', error);
      });
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>Players</h2>
      {/* Show Add New Player button to admins and managers */}
      {['admin', 'manager'].includes(user.role) && (
        <Link to="/players/add">
          <button>Add New Player</button>
        </Link>
      )}
      {players.map((player) => (
        <div key={player._id}>
          <Link to={`/players/${player._id}`}>
            <h3>
              {player.firstName} {player.lastName}
            </h3>
          </Link>
          <p>
            <strong>Age:</strong> {player.age}
          </p>
          <p>
            <strong>Team:</strong> {player.team.teamName}
          </p>
          <hr />
        </div>
      ))}
    </div>
  );
};

export default PlayersList;
