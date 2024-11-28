// frontend/src/components/TeamDetail.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';

const TeamDetail: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      axios
        .get(`http://localhost:5003/api/teams/${id}`)
        .then((response) => {
          setTeam(response.data);
        })
        .catch((error) => {
          console.error('There was an error fetching the team!', error);
        });

      axios
        .get(`http://localhost:5003/api/teams/${id}/players`)
        .then((response) => {
          setPlayers(response.data.players);
        })
        .catch((error) => {
          console.error('There was an error fetching the players!', error);
        });
    }
  }, [id, user]);

  const deleteTeam = () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this team.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this team?')) {
      axios
        .delete(`http://localhost:5003/api/teams/${id}`)
        .then(() => {
          navigate('/teams');
        })
        .catch((error) => {
          console.error('There was an error deleting the team!', error);
        });
    }
  };

  // If the user is not authenticated or doesn't have the required role, show unauthorized message
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!team) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{team.teamName}</h2>
      {team.image && (
        <div>
          <img src={`http://localhost:5003${team.image}`} alt="Team" width="200" />
        </div>
      )}
      <p>
        <strong>Ranking:</strong> {team.teamRanking}
      </p>
      <p>
        <strong>Location:</strong> {team.teamLocation}
      </p>
      <p>
        <strong>Coach:</strong> {team.teamCoach}
      </p>
      <p>
        <strong>Home Stadium:</strong>{' '}
        <Link to={`/stadiums/${team.stadium._id}`}>{team.stadium.stadiumName}</Link>
      </p>
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
      {/* Show Edit and Delete buttons only to admins */}
      {user.role === 'admin' && (
        <>
          <Link to={`/teams/edit/${team._id}`}>
            <button>Edit Team</button>
          </Link>
          <button onClick={deleteTeam}>Delete Team</button>
        </>
      )}
    </div>
  );
};

export default TeamDetail;
