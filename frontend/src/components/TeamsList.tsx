// frontend/src/components/TeamsList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { AuthContext } from '../contexts/AuthContext';

const TeamsList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchTeams();
    }
  }, [user]);

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

  // If the user is not authenticated or doesn't have the required role, show unauthorized message
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>Teams</h2>
      {/* Show Add New Team button only to admins */}
      {user.role === 'admin' && (
        <Link to="/teams/add">
          <button>Add New Team</button>
        </Link>
      )}
      {teams.map((team) => (
        <div key={team._id}>
          <Link to={`/teams/${team._id}`}>
            <h3>{team.teamName}</h3>
          </Link>
          <p>
            <strong>Ranking:</strong> {team.teamRanking}
          </p>
          <p>
            <strong>Stadium:</strong> {team.stadium?.stadiumName || 'N/A'}
          </p>
          <hr />
        </div>
      ))}
    </div>
  );
};

export default TeamsList;
