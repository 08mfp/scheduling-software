// frontend/src/components/TeamDetail.tsx

import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal'; // Import ConfirmModal
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaHome,
} from 'react-icons/fa'; // Removed FaRedo, FaCube, FaMap

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const TeamDetail: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [visiblePlayers, setVisiblePlayers] = useState(3); // Number of players to show initially
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Modal state: 'confirm' | 'loading' | 'success' | 'error' | null
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);

  // Countdown state for success modal
  const [countdown, setCountdown] = useState<number>(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchTeamAndPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const fetchTeamAndPlayers = async () => {
    try {
      const teamResponse = await axios.get<Team>(`${BACKEND_URL}/api/teams/${id}`);
      setTeam(teamResponse.data);

      const playersResponse = await axios.get<{ players: Player[] }>(
        `${BACKEND_URL}/api/teams/${id}/players`
      );
      setPlayers(playersResponse.data.players);

      setLoading(false);
    } catch (err) {
      setError('Failed to load team details. Please try again later.');
      console.error('Error fetching team or players:', err);
      setLoading(false);
    }
  };

  const deleteTeam = async () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this team.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/teams/${id}`);
      // After successful deletion, show success modal
      setModalState('success');
    } catch (err) {
      setError('Failed to delete the team.');
      console.error('Error deleting team:', err);
      setModalState('error');
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
        return { borderColor: '#ffa500' }; // Orange
    }
  };

  // Handle countdown for success modal
  useEffect(() => {
    if (modalState === 'success') {
      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setModalState(null); // Close the modal
            navigate('/teams'); // Navigate back after countdown
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup on unmount or when modalState changes
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [modalState, navigate]);

  // Handlers for modal actions
  const openConfirmModal = () => setModalState('confirm');
  const closeModal = () => {
    setModalState(null);
    setCountdown(10); // Reset countdown
  };
  const handleConfirmDelete = () => {
    setModalState('loading');
    // Ensure loading lasts at least 3 seconds
    setTimeout(() => {
      deleteTeam();
    }, 3000);
  };
  const handleRetry = () => {
    setModalState('loading');
    // Ensure loading lasts at least 3 seconds
    setTimeout(() => {
      deleteTeam();
    }, 3000);
  };

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-lg text-gray-700">Loading Team Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md text-center"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={fetchTeamAndPlayers}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-center text-gray-500">No team found.</p>
      </div>
    );
  }

  const teamColor = getTeamColor(team.teamName);

  const handleSeeMore = () => {
    setVisiblePlayers((prev) => Math.min(prev + 3, players.length));
  };
  const handleSeeLess = () => {
    setVisiblePlayers(3);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-5xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8"
        style={{ border: `8px solid ${teamColor.borderColor}` }}
      >
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2">
          <Link to={`/teams`} className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Teams
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-700">{team.teamName}</span>
        </div>

        {/* Team Header */}
        <div className="flex flex-col items-center mb-8">
          {team.image && (
            <img
              src={`${BACKEND_URL}${team.image}`}
              alt={`${team.teamName} Logo`}
              className="w-48 h-48 object-contain rounded-full mb-6"
            />
          )}
          <h2 className="text-5xl font-extrabold text-gray-900 mb-4 text-center">
            {team.teamName}
          </h2>
          <div className="flex items-center text-lg text-gray-600">
            <svg
              className="w-6 h-6 text-gray-800 mr-2"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M5 9a7 7 0 1 1 8 6.93V21a1 1 0 1 1-2 0v-5.07A7.001 7.001 0 0 1 5 9Zm5.94-1.06A1.5 1.5 0 0 1 12 7.5a1 1 0 1 0 0-2A3.5 3.5 0 0 0 8.5 9a1 1 0 0 0 2 0c0-.398.158-.78.44-1.06Z"
                clipRule="evenodd"
              />
            </svg>
            <strong>Location:</strong> {team.teamLocation}
          </div>
        </div>

        {/* Team Details */}
        <div className="space-y-6 text-center">
          <p className="text-lg">
            <strong>Ranking:</strong> {team.teamRanking}
          </p>
          <p className="text-lg">
            <strong>Coach:</strong> {team.teamCoach}
          </p>
          <p className="text-lg">
            <strong>Home Stadium:</strong>{' '}
            <Link to={`/stadiums/${team.stadium._id}`} className="text-purple-600 hover:underline">
              {team.stadium.stadiumName}
            </Link>
          </p>
        </div>

        {/* Players Section */}
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Players</h3>
          {players.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.slice(0, visiblePlayers).map((player) => (
                <Link
                  key={player._id}
                  to={`/players/${player._id}`}
                  className="bg-gray-50 hover:bg-gray-100 shadow-md rounded-lg p-4 flex flex-col items-center text-center"
                >
                  {player.image && (
                    <img
                      src={`${BACKEND_URL}${player.image}`}
                      alt={player.firstName}
                      className="w-24 h-24 rounded-full object-cover mb-4"
                    />
                  )}
                  <p className="text-lg font-semibold text-gray-800">
                    {player.firstName} {player.lastName}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No players found for this team.</p>
          )}

          {/* See More / See Less Buttons */}
          <div className="mt-6 flex justify-center gap-4">
            {visiblePlayers < players.length && (
              <button
                onClick={handleSeeMore}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                See More
              </button>
            )}
            {visiblePlayers > 3 && (
              <button
                onClick={handleSeeLess}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                See Less
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {user.role === 'admin' && (
          <div className="mt-10 flex justify-center gap-4">
            <Link to={`/teams/edit/${team._id}`}>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Edit Team
              </button>
            </Link>
            <button
              onClick={openConfirmModal}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
              aria-label="Delete Team"
            >
              Delete Team
            </button>
          </div>
        )}

        {/* Confirm/Loading/Success/Error Modal */}
        <ConfirmModal
          isOpen={modalState !== null}
          type={modalState || 'confirm'}
          title={
            modalState === 'confirm'
              ? 'Confirm Deletion'
              : modalState === 'loading'
              ? 'Processing...'
              : modalState === 'success'
              ? 'Deleted Successfully'
              : 'Deletion Failed'
          }
          message={
            modalState === 'confirm'
              ? 'Are you sure you want to delete this team? This action cannot be undone.'
              : modalState === 'loading'
              ? 'Deleting the team... Please wait.'
              : modalState === 'success'
              ? 'The team has been deleted successfully.'
              : 'Failed to delete the team. Please try again.'
          }
          countdown={modalState === 'success' ? countdown : undefined}
          onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
          onCancel={
            modalState === 'success'
              ? () => navigate('/teams') // Navigate after success
              : closeModal
          }
          onRetry={modalState === 'error' ? handleRetry : undefined}
        />
      </div>
    </div>
  );
};

export default TeamDetail;
