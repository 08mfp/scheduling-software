import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import { FaHome, FaEdit, FaTrash, FaSun, FaMoon } from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const PlayerDetail: React.FC = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Modal state: 'confirm' | 'loading' | 'success' | 'error' | null
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchPlayer();
    }
  }, [id, user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchPlayer = async () => {
    const startTime = Date.now();
    try {
      const response = await axios.get<Player>(`${BACKEND_URL}/api/players/${id}`);
      setPlayer(response.data);

      // Show skeleton for at least 3 seconds
      const elapsed = Date.now() - startTime;
      const remaining = 3000 - elapsed;
      if (remaining > 0) {
        setTimeout(() => setIsLoading(false), remaining);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError('Failed to load player details. Please try again later.');
      console.error('Error fetching player:', err);
      setIsLoading(false);
    }
  };

  const deletePlayer = async () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this player.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/players/${id}`);
      setModalState('success');
    } catch (err) {
      console.error('Error deleting player:', err);
      setModalState('error');
    }
  };

  // Handle countdown for success modal
  useEffect(() => {
    if (modalState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setModalState(null);
            navigate('/players'); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [modalState, navigate]);

  const openConfirmModal = () => setModalState('confirm');
  const closeModal = () => {
    setModalState(null);
    setCountdown(3);
  };

  const handleConfirmDelete = () => {
    setModalState('loading');
    setTimeout(() => {
      deletePlayer();
    }, 3000);
  };

  const handleRetry = () => {
    setModalState('loading');
    setTimeout(() => {
      deletePlayer();
    }, 3000);
  };

  // If the user is not authenticated or doesn't have the required role, redirect
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const getTeamColor = (teamName: string): { borderColor: string } => {
    switch (teamName) {
      case 'England':
        return { borderColor: '#000000' };
      case 'France':
        return { borderColor: '#0033cc' };
      case 'Ireland':
        return { borderColor: '#009933' };
      case 'Scotland':
        return { borderColor: '#003366' };
      case 'Italy':
        return { borderColor: '#0066cc' };
      case 'Wales':
        return { borderColor: '#cc0000' };
      default:
        return { borderColor: '#cccccc' };
    }
  };

  const renderSkeleton = () => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8 animate-pulse">
        {/* Top bar skeleton */}
        <div className="h-6 bg-gray-300 dark:bg-gray-700 w-1/4 rounded"></div>
        
        {/* Player Header Skeleton */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="h-48 w-48 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-700 w-1/2 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/4 rounded"></div>
        </div>

        {/* Details Skeleton */}
        <div className="space-y-4 text-center">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/4 mx-auto rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/3 mx-auto rounded"></div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center">
        <div
          className="bg-red-100 dark:bg-red-800 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded relative max-w-md text-center"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchPlayer();
            }}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-center text-gray-500 dark:text-gray-400">No player found.</p>
      </div>
    );
  }

  const teamColor = getTeamColor(player.team.teamName);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8 transition-colors duration-300">
        
        {/* Top bar with breadcrumb and dark mode toggle */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link to="/players" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
              <FaHome className="mr-1" />
              Players
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              {player.firstName} {player.lastName}
            </span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                       rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 
                       focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <>
                <FaSun className="mr-2" />
                Light Mode
              </>
            ) : (
              <>
                <FaMoon className="mr-2" />
                Dark Mode
              </>
            )}
          </button>
        </div>

        {/* Player Header with subtle accent line and ring */}
        <div className="flex flex-col items-center mb-8">
          {player.image && (
            <div className="relative inline-block mb-6">
              <img
                src={`${BACKEND_URL}${player.image}`}
                alt={`${player.firstName} ${player.lastName}`}
                className="w-48 h-48 object-cover rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/images/default-player.png';
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow: `0 0 0 4px ${teamColor.borderColor}`
                }}
              />
            </div>
          )}
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 text-center">
            {player.firstName} {player.lastName}
          </h2>
          <hr
            className="w-24 mt-3"
            style={{
              borderColor: teamColor.borderColor,
              borderWidth: '2px',
              borderStyle: 'solid'
            }}
          />
        </div>

        {/* Player Details */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center text-lg text-gray-600 dark:text-gray-300 mb-4">
            <svg
              className="w-6 h-6 text-gray-800 dark:text-gray-200 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                clipRule="evenodd"
              />
            </svg>
            <strong className="mr-1">Team:</strong>
            <Link to={`/teams/${player.team._id}`} className="text-purple-600 dark:text-purple-400 hover:underline">
              {player.team.teamName}
            </Link>
          </div>

          <p className="text-lg text-gray-800 dark:text-gray-200 mb-2">
            <strong>Age:</strong> {player.age}
          </p>
          <p className="text-lg text-gray-800 dark:text-gray-200">
            <strong>Date of Birth:</strong> {new Date(player.dateOfBirth).toLocaleDateString()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {['admin', 'manager'].includes(user.role) && (
            <Link to={`/players/edit/${player._id}`}>
              <button className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 flex items-center">
                <FaEdit className="mr-2" />
                Edit
              </button>
            </Link>
          )}
          {user.role === 'admin' && (
            <button
              onClick={openConfirmModal}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200 flex items-center"
              aria-label="Delete Player"
            >
              <FaTrash className="mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

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
            ? 'Are you sure you want to delete this player? This action cannot be undone.'
            : modalState === 'loading'
            ? 'Deleting the player... Please wait.'
            : modalState === 'success'
            ? `The player has been deleted successfully. Redirecting in ${countdown} seconds...`
            : 'Failed to delete the player. Please try again.'
        }
        countdown={modalState === 'success' ? countdown : undefined}
        onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
        onCancel={
          modalState === 'success'
            ? () => navigate('/players')
            : closeModal
        }
        onRetry={modalState === 'error' ? handleRetry : undefined}
      />
    </div>
  );
};

export default PlayerDetail;
