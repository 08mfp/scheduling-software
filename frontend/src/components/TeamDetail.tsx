import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import RankBadge from './RankBadge';
import {
  FaEdit,
  FaTrash,
  FaHome,
  FaSun,
  FaMoon,
} from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const TeamDetail: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [visiblePlayers, setVisiblePlayers] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchTeamAndPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchTeamAndPlayers = async () => {
    const startTime = Date.now();
    try {
      const teamResponse = await axios.get<Team>(`${BACKEND_URL}/api/teams/${id}`);
      setTeam(teamResponse.data);

      const playersResponse = await axios.get<{ players: Player[] }>(
        `${BACKEND_URL}/api/teams/${id}/players`
      );
      setPlayers(playersResponse.data.players);

      const elapsed = Date.now() - startTime;
      const remaining = 3000 - elapsed; 
      if (remaining > 0) {
        setTimeout(() => setIsLoading(false), remaining);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching team or players:', err);
      setError('Failed to load team details. Please try again later.');
      setIsLoading(false);
    }
  };

  const deleteTeam = async () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this team.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/teams/${id}`);
      setModalState('success');
    } catch (err) {
      console.error('Error deleting team:', err);
      setModalState('error');
    }
  };

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
        return { borderColor: '#ffa500' };
    }
  };

  useEffect(() => {
    if (modalState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setModalState(null);
            navigate('/teams');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [modalState, navigate]);

  const openConfirmModal = () => setModalState('confirm');
  const closeModal = () => {
    setModalState(null);
    setCountdown(10);
  };
  const handleConfirmDelete = () => {
    setModalState('loading');
    setTimeout(() => {
      deleteTeam();
    }, 3000);
  };
  const handleRetry = () => {
    setModalState('loading');
    setTimeout(() => {
      deleteTeam();
    }, 3000);
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const renderSkeleton = () => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8 animate-pulse">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 w-1/4 rounded"></div>
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="h-48 w-48 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-700 w-1/2 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/4 rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-20 rounded"></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-300 dark:bg-gray-700 w-40 mb-4 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-300 dark:bg-gray-700 h-56 rounded"></div>
          <div className="bg-gray-300 dark:bg-gray-700 h-56 rounded"></div>
          <div className="bg-gray-300 dark:bg-gray-700 h-56 rounded"></div>
        </div>
      </div>
    </div>
  );

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
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
              fetchTeamAndPlayers();
            }}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return renderSkeleton();
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-center text-gray-500 dark:text-gray-400">No team found.</p>
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8 transition-colors duration-300">
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link to="/teams" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
              <FaHome className="mr-1" />
              Teams
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              {team.teamName}
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

        <div className="flex flex-col items-center mb-8">
          {team.image && (
            <div className="relative inline-block mb-6">
              <img
                src={`${BACKEND_URL}${team.image}`}
                alt={`${team.teamName} Logo`}
                className="w-48 h-48 object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/images/default-team-logo.png';
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
          <h2 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 text-center">
            {team.teamName}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Rank
            </h3>
            <div className="flex flex-col items-center">
              <RankBadge rank={team.teamRanking} />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Coach
            </h3>
            <p className="text-xl text-gray-800 dark:text-gray-200 text-center">
              {team.teamCoach}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Location
            </h3>
            <p className="text-xl text-gray-800 dark:text-gray-200 text-center">
              {team.teamLocation}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Home Stadium
            </h3>
            <Link
              to={`/stadiums/${team.stadium._id}`}
              className="text-lg font-semibold text-purple-600 dark:text-purple-400 hover:underline mb-2 block text-center"
            >
              {team.stadium.stadiumName}
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
            Players
          </h3>
          {players.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.slice(0, visiblePlayers).map((player) => (
                <Link
                  key={player._id}
                  to={`/players/${player._id}`}
                  className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-md rounded-lg p-4 flex flex-col items-center text-center transition-colors duration-300"
                >
                  {player.image && (
                    <img
                      src={`${BACKEND_URL}${player.image}`}
                      alt={player.firstName}
                      className="w-24 h-24 rounded-full object-cover mb-4"
                      onError={(e) => {
                        e.currentTarget.src = '/images/default-player.png';
                      }}
                    />
                  )}
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {player.firstName} {player.lastName}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">No players found for this team.</p>
          )}

          <div className="mt-6 flex justify-center gap-4">
            {visiblePlayers < players.length && (
              <button
                onClick={handleSeeMore}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200"
              >
                See More
              </button>
            )}
            {visiblePlayers > 3 && (
              <button
                onClick={handleSeeLess}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200"
              >
                See Less
              </button>
            )}
          </div>
        </div>

        {user.role === 'admin' && (
          <div className="mt-10 flex justify-center gap-4">
            <Link to={`/teams/edit/${team._id}`}>
              <button className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 flex items-center">
                <FaEdit className="mr-2" />
                Edit
              </button>
            </Link>
            <button
              onClick={openConfirmModal}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200 flex items-center"
              aria-label="Delete Team"
            >
              <FaTrash className="mr-2" />
              Delete
            </button>
          </div>
        )}

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
              ? `The team has been deleted successfully. Redirecting in ${countdown} seconds...`
              : 'Failed to delete the team. Please try again.'
          }
          countdown={modalState === 'success' ? countdown : undefined}
          onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
          onCancel={
            modalState === 'success'
              ? () => navigate('/teams')
              : closeModal
          }
          onRetry={modalState === 'error' ? handleRetry : undefined}
        />
      </div>
    </div>
  );
};

export default TeamDetail;
