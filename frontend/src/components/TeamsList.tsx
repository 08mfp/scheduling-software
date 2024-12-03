// frontend/src/components/TeamsList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { AuthContext } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const TeamsList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get<Team[]>(`${BACKEND_URL}/api/teams`);
      setTeams(response.data);
    } catch (error) {
      console.error('There was an error fetching the teams!', error);
    }
  };

  // **Utility Function: Get Team Color**
  const getTeamColor = (teamName: string): { backgroundColor: string; textColor: string } => {
    switch (teamName) {
      case 'England':
        return { backgroundColor: '#ffffff', textColor: '#000000' }; // White background, black text
      case 'France':
        return { backgroundColor: '#0033cc', textColor: '#ffffff' }; // French Blue background, white text
      case 'Ireland':
        return { backgroundColor: '#009933', textColor: '#ffffff' }; // Green background, white text
      case 'Scotland':
        return { backgroundColor: '#003366', textColor: '#ffffff' }; // Dark Blue background, white text
      case 'Italy':
        return { backgroundColor: '#0066cc', textColor: '#ffffff' }; // Azure Blue background, white text
      case 'Wales':
        return { backgroundColor: '#cc0000', textColor: '#ffffff' }; // Red background, white text
      default:
        return { backgroundColor: '#cccccc', textColor: '#000000' }; // Gray background, black text for default/unknown
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized page
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full bg-white shadow-md rounded-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Teams</h2>
          {/* Show Add New Team button only to admins */}
          {user.role === 'admin' && (
            <Link to="/teams/add" className="mt-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Add New Team
              </button>
            </Link>
          )}
        </div>
        {/* Teams List */}
        <div className="space-y-6">
          {teams.map((team) => {
            const teamColor = getTeamColor(team.teamName);
            return (
              <div
                key={team._id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center"
                style={{
                  backgroundColor: teamColor.backgroundColor,
                  color: teamColor.textColor,
                }}
              >
                <div className="flex items-center space-x-4">
                  {/* Team Logo */}
                  <img
                    src={`${BACKEND_URL}${team.image}`}
                    alt={`${team.teamName} Logo`}
                    className="w-16 h-16 object-contain rounded-full"
                  />
                  {/* Team Details */}
                  <div>
                    <Link to={`/teams/${team._id}`}>
                      <h3
                        className="text-xl font-semibold hover:underline"
                        style={{
                          // Optional: Additional styling if needed
                        }}
                      >
                        {team.teamName}
                      </h3>
                    </Link>
                    <p className="text-sm">
                      <strong>Ranking:</strong> {team.teamRanking}
                    </p>
                    <p className="text-sm">
                      <strong>Stadium:</strong> {team.stadium?.stadiumName || 'N/A'}
                    </p>
                  </div>
                </div>
                {/* View Details Button */}
                <div className="mt-4 sm:mt-0">
                  <Link to={`/teams/${team._id}`}>
                    <button
                      className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{
                        backgroundColor: teamColor.textColor, // Use text color as button background for contrast
                        color: teamColor.backgroundColor, // Use background color as button text
                        border: `2px solid ${teamColor.backgroundColor}`,
                      }}
                    >
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
          {/* Display message if no teams are found */}
          {teams.length === 0 && (
            <div className="text-center text-gray-500">
              No teams found. Please add a new team.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsList;
