// frontend/src/components/PlayerDetail.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const PlayerDetail: React.FC = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchPlayer();
    }
  }, [id, user]);

  const fetchPlayer = async () => {
    try {
      const response = await axios.get<Player>(`${BACKEND_URL}/api/players/${id}`);
      setPlayer(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load player details. Please try again later.');
      console.error('Error fetching player:', err);
      setLoading(false);
    }
  };

  const deletePlayer = async () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this player.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        await axios.delete(`${BACKEND_URL}/api/players/${id}`);
        navigate('/players');
      } catch (err) {
        setError('Failed to delete the player.');
        console.error('Error deleting player:', err);
      }
    }
  };

  const getTeamColor = (teamName: string): { borderColor: string } => {
    switch (teamName) {
      case 'England':
        return { borderColor: '#000000' }; // Black
      case 'France':
        return { borderColor: '#0033cc' }; // French Blue
      case 'Ireland':
        return { borderColor: '#009933' }; // Green
      case 'Scotland':
        return { borderColor: '#003366' }; // Dark Blue
      case 'Italy':
        return { borderColor: '#0066cc' }; // Azure Blue
      case 'Wales':
        return { borderColor: '#cc0000' }; // Red
      default:
        return { borderColor: '#cccccc' }; // Gray
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
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
          onClick={fetchPlayer}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-start justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500">No player found.</p>
      </div>
    );
  }

  const teamColor = getTeamColor(player.team.teamName);

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-4xl w-full bg-white shadow-lg rounded-lg p-10"
        style={{ border: `8px solid ${teamColor.borderColor}` }}
      >
        <div className="flex flex-col items-center mb-8">
          {player.image && (
            <img
              src={`${BACKEND_URL}${player.image}`}
              alt={`${player.firstName} ${player.lastName}`}
              className="w-48 h-48 object-cover rounded-full mb-6"
            />
          )}
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">
            {player.firstName} {player.lastName}
          </h2>
          <div className="flex items-center text-lg text-gray-600">
            <svg
              className="w-6 h-6 text-gray-800 mr-2"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                clipRule="evenodd"
              />
            </svg>
            <strong>Team:</strong>{' '}
            <Link to={`/teams/${player.team._id}`} className="text-purple-600 hover:underline">
              {player.team.teamName}
            </Link>
          </div>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-lg">
            <strong>Age:</strong> {player.age}
          </p>
          <p className="text-lg">
            <strong>Date of Birth:</strong>{' '}
            {new Date(player.dateOfBirth).toLocaleDateString()}
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          {['admin', 'manager'].includes(user.role) && (
            <Link to={`/players/edit/${player._id}`}>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Edit Player
              </button>
            </Link>
          )}
          {user.role === 'admin' && (
            <button
              onClick={deletePlayer}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete Player
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDetail;
