// frontend/src/components/PlayersList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const PlayersList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchPlayers();
    }
  }, [user]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get<Player[]>(`${BACKEND_URL}/api/players`);
      setPlayers(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to load players. Please try again later.');
      console.error('There was an error fetching the players!', error);
      setLoading(false);
    }
  };

  // Define the getTeamColor function to map team names to colors
  const getTeamColor = (teamName: string): string => {
    switch (teamName) {
      case 'England':
        return '#000000'; // black
      case 'France':
        return '#0033cc'; // French Blue
      case 'Ireland':
        return '#009933'; // Green
      case 'Scotland':
        return '#003366'; // Dark Blue
      case 'Italy':
        return '#0066cc'; // Azure Blue
      case 'Wales':
        return '#cc0000'; // Red
      default:
        return '#ffa500'; // Gray
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized page
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin h-12 w-12 border-4 border-purple-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchPlayers}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full bg-white shadow-md rounded-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Players</h2>
          {/* Show Add New Player button to admins and managers */}
          {['admin', 'manager'].includes(user.role) && (
            <Link to="/players/add" className="mt-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Add New Player
              </button>
            </Link>
          )}
        </div>
        {/* Players List */}
        <div className="space-y-6">
          {players.map((player) => {
            const teamName = player.team?.teamName || 'Unknown';
            const borderColor = getTeamColor(teamName);

            return (
              <div
                key={player._id}
                className="rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50"
                style={{ border: `4px solid ${borderColor}` }}
              >
                <div className="flex items-center space-x-4">
                  {/* Player image or Placeholder */}
                  {player.image ? (
                    <img
                      src={`${BACKEND_URL}${player.image}`}
                      alt={`${player.firstName} ${player.lastName} Avatar`}
                      className="w-16 h-16 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-gray-700">
                      {player.firstName.charAt(0)}
                      {player.lastName.charAt(0)}
                    </div>
                  )}
                  {/* Player Details */}
                  <div className="text-center sm:text-left">
                    <Link to={`/players/${player._id}`}>
                      <h3 className="text-xl font-semibold text-blue-600 hover:underline">
                        {player.firstName} {player.lastName}
                      </h3>
                    </Link>
                    <p className="text-gray-600">
                      <strong>Age:</strong> {player.age}
                    </p>
                    <p className="text-gray-600">
                      <strong>Team:</strong> {teamName}
                    </p>
                  </div>
                </div>
                {/* View Details Button */}
                <div className="mt-4 sm:mt-0">
                  <Link to={`/players/${player._id}`}>
                    <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
          {/* Display message if no players are found */}
          {players.length === 0 && (
            <div className="text-center text-gray-500">
              No players found. Please add a new player.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayersList;
