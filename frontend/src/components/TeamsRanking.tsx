// frontend/src/components/TeamsRanking.tsx

import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Team } from '../interfaces/Team';
import ConfirmModal from './ConfirmModal';
import { FaArrowUp, FaArrowDown, FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const getTeamColor = (teamName: string): { backgroundColor: string; textColor: string } => {
  switch (teamName) {
    case 'England':
      return { backgroundColor: '#ffffff', textColor: '#000000' };
    case 'France':
      return { backgroundColor: '#0033cc', textColor: '#ffffff' };
    case 'Ireland':
      return { backgroundColor: '#009933', textColor: '#ffffff' };
    case 'Scotland':
      return { backgroundColor: '#003366', textColor: '#ffffff' };
    case 'Italy':
      return { backgroundColor: '#0066cc', textColor: '#ffffff' };
    case 'Wales':
      return { backgroundColor: '#cc0000', textColor: '#ffffff' };
    default:
      return { backgroundColor: '#ffa500', textColor: '#000000' };
  }
};

const TeamsRanking: React.FC = () => {
  //-----------------------
  // 1) DARK MODE HOOKS
  //-----------------------
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  //-----------------------
  // 2) AUTH & BASIC STATES
  //-----------------------
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState<Team[]>([]);
  const [originalTeams, setOriginalTeams] = useState<Team[]>([]);

  // Action states (always 'updateRankings' for this page)
  const [currentAction, setCurrentAction] = useState<'updateRankings' | null>(null);

  // Modal state
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(
    null
  );
  const [retryFn, setRetryFn] = useState<(() => void) | undefined>(undefined);

  // Countdown for success state (auto-close)
  const [countdown, setCountdown] = useState<number>(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  //-----------------------
  // 3) FETCH TEAMS
  //-----------------------
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get<Team[]>(`${BACKEND_URL}/api/teams`);
      const sortedTeams = [...response.data].sort(
        (a, b) => (a.teamRanking || Infinity) - (b.teamRanking || Infinity)
      );
      setTeams(sortedTeams);
      setOriginalTeams(sortedTeams);
    } catch (error) {
      console.error('There was an error fetching the teams!', error);
    }
  };

  //-----------------------
  // 4) REORDER & RESET
  //-----------------------
  const moveTeam = (index: number, direction: 'up' | 'down') => {
    const newTeams = [...teams];
    if (direction === 'up' && index > 0) {
      [newTeams[index - 1], newTeams[index]] = [newTeams[index], newTeams[index - 1]];
    } else if (direction === 'down' && index < newTeams.length - 1) {
      [newTeams[index + 1], newTeams[index]] = [newTeams[index], newTeams[index + 1]];
    }

    const updatedTeams = newTeams.map((team, idx) => ({
      ...team,
      teamRanking: idx + 1,
    }));
    setTeams(updatedTeams);
  };

  const handleReset = () => {
    // Revert to original database order
    setTeams(originalTeams);
  };

  //-----------------------
  // 5) SAVE
  //-----------------------
  const handleSave = () => {
    setCurrentAction('updateRankings');
    setModalState('confirm');
  };

  const handleConfirm = async () => {
    setModalState('loading');
    try {
      const updates = teams.map((team) =>
        axios.put(`${BACKEND_URL}/api/teams/${team._id}`, { teamRanking: team.teamRanking })
      );
      await Promise.all(updates);

      setModalState('success');
      setRetryFn(undefined);

      // Auto-close modal after countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setModalState(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error updating rankings:', error);
      setModalState('error');
      setRetryFn(() => handleConfirm);
    }
  };

  //-----------------------
  // 6) MODAL HANDLERS
  //-----------------------
  const handleRetry = () => {
    if (retryFn) retryFn();
  };

  const handleCancel = () => {
    setModalState(null);
    setCountdown(3);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  //-----------------------
  // 7) AUTH CHECK
  //-----------------------
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  //-----------------------
  // 8) MODAL TEXT
  //-----------------------
  let modalTitle = '';
  let modalMessage = '';

  if (modalState === 'confirm') {
    modalTitle = 'Confirm Save';
    modalMessage =
      'Are you sure you want to save the new rankings? This will affect future scheduling algorithms.';
  } else if (modalState === 'loading') {
    modalTitle = 'Saving...';
    modalMessage = 'Please wait while we update the rankings.';
  } else if (modalState === 'success') {
    modalTitle = 'Success';
    modalMessage = 'Rankings updated successfully!';
  } else if (modalState === 'error') {
    modalTitle = 'Error';
    modalMessage = 'There was an error saving the new rankings. Would you like to retry?';
  }

  const confirmText = modalState === 'confirm' ? 'Save' : undefined;
  const cancelText = modalState === 'confirm' || modalState === 'error' ? 'Cancel' : undefined;
  const retryText = modalState === 'error' ? 'Retry' : undefined;
  const okText = modalState === 'success' ? 'OK' : undefined;

  //-----------------------
  // 9) RENDER
  //-----------------------
  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 
                 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8
                 transition-colors duration-300"
    >
      {/* Navbar (Breadcrumb + Dark Mode) */}
      <div className="max-w-7xl w-full mb-8">
        <div
          className="flex justify-between items-center px-4 py-2
                     bg-gray-100 dark:bg-gray-800 rounded-md"
        >
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/ Admin /</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Teams Ranking
            </span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 
                       text-gray-800 dark:text-gray-200 rounded-md 
                       hover:bg-gray-300 dark:hover:bg-gray-600 
                       transition-colors duration-200 focus:outline-none 
                       focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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
      </div>

      {/* Main Card */}
      {/* <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 transition-colors duration-300"> */}
      <div className="max-w-7xl w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 transition-colors duration-300">
      {/* Title & Description */}
      <div className="mb-6">
      <h2
        className="font-extrabold text-gray-900 dark:text-gray-100 mb-2"
        style={{ fontSize: '34px' }}
      >
        Team Rankings
      </h2>
      <p
        className="mt-2 text-gray-700 dark:text-gray-300 mb-2"
        style={{ fontSize: '16px' }}
      >
        Reorder teams by clicking the Up and Down arrows. Save changes when ready,
        or reset to discard unsaved changes. Updated rankings will affect future scheduling algorithms.
      </p>
      <br />
      <p
        className="mt-1 text-sm text-gray-500 dark:text-gray-400 italic"
        style={{ fontSize: '12px' }}
      >
        Note: Changes update the rankings immediately and are logged for auditing.
      </p>
      <br/>
      </div>



        {/* Teams List */}
        < div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-6 mb-8 space-y-6">
        <div className="space-y-4">
          {teams.map((team, index) => {
            const { backgroundColor, textColor } = getTeamColor(team.teamName);
            return (
              <div
                key={team._id}
                className="flex items-center justify-between p-4 rounded-lg shadow-sm transition-colors"
                style={{ backgroundColor, color: textColor }}
              >
                {/* Ranking Number */}
                <div className="flex items-center justify-center w-12">
                  <span className="text-lg font-semibold">{team.teamRanking}</span>
                </div>

                {/* Team Information */}
                <div className="flex items-center space-x-4 flex-grow">
                  {team.image && (
                    <img
                      src={`${BACKEND_URL}${team.image}`}
                      alt={`${team.teamName} Logo`}
                      className="w-12 h-12 object-contain rounded-full"
                      style={{ backgroundColor: '#fff' }} // optional white BG behind the image
                    />
                  )}
                  <span className="text-xl font-semibold">{team.teamName}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => moveTeam(index, 'up')}
                    disabled={index === 0}
                    className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 
                                focus:ring-blue-500 ${
                                  index === 0
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                    aria-label={`Move ${team.teamName} up`}
                    style={{ color: index === 0 ? undefined : '#fff' }} // ensure text is white
                  >
                    <FaArrowUp />
                  </button>
                  <button
                    onClick={() => moveTeam(index, 'down')}
                    disabled={index === teams.length - 1}
                    className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 
                                focus:ring-blue-500 ${
                                  index === teams.length - 1
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                    aria-label={`Move ${team.teamName} down`}
                    style={{ color: index === teams.length - 1 ? undefined : '#fff' }}
                  >
                    <FaArrowDown />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons: Reset & Save - Centered below teams */}
        <div className="flex justify-center space-x-6 mt-8">
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-600 text-white rounded-md 
                       hover:bg-red-700 focus:outline-none focus:ring-2 
                       focus:ring-red-400 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-md 
                       hover:bg-blue-700 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 transition-colors"
          >
            Save Rankings
          </button>
        </div>
      </div>

      {/* Confirm/Loading/Success/Error Modal */}
      <ConfirmModal
        isOpen={modalState !== null}
        type={modalState || 'confirm'}
        title={modalTitle}
        message={modalMessage}
        countdown={modalState === 'success' ? countdown : undefined}
        confirmText={confirmText}
        cancelText={cancelText}
        retryText={retryText}
        okText={okText}
        onConfirm={modalState === 'confirm' ? handleConfirm : undefined}
        onCancel={handleCancel}
        onRetry={modalState === 'error' ? handleRetry : undefined}
      />
    </div>
    </div>
  );
};

export default TeamsRanking;
