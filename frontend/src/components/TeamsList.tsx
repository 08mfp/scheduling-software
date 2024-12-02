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

  const fetchTeams = async () => {
    try {
      const response = await axios.get<Team[]>('http://localhost:5003/api/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('There was an error fetching the teams!', error);
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized page
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white shadow-md rounded-lg p-8">
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
          {teams.map((team) => (
            <div
              key={team._id}
              className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                {/* Team Logo */}
                <img
                  src={`http://localhost:5003${team.image}`}
                  alt={`${team.teamName} Logo`}
                  className="w-16 h-16 object-contain rounded-full"
                />
                {/* Team Details */}
                <div>
                  <Link to={`/teams/${team._id}`}>
                    <h3 className="text-xl font-semibold text-blue-600 hover:underline">
                      {team.teamName}
                    </h3>
                  </Link>
                  <p className="text-gray-600">
                    <strong>Ranking:</strong> {team.teamRanking}
                  </p>
                  <p className="text-gray-600">
                    <strong>Stadium:</strong> {team.stadium?.stadiumName || 'N/A'}
                  </p>
                </div>
              </div>
              {/* View Details Button */}
              <div className="mt-4 sm:mt-0">
                <Link to={`/teams/${team._id}`}>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400">
                    View Details
                  </button>
                </Link>
              </div>
            </div>
          ))}
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
