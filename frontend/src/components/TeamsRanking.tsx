// frontend/src/components/TeamsRanking.tsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Team } from '../interfaces/Team';
import ConfirmModal from './ConfirmModal';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const TeamsRanking: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Introduce currentAction to track what the user is doing (here it's always updateRankings)
  const [currentAction, setCurrentAction] = useState<'updateRankings' | null>(null);
  
  // modalState to handle the modal type: 'confirm' | 'loading' | 'success' | 'error' | null
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);
  const [retryFn, setRetryFn] = useState<(() => void) | undefined>(undefined);
  
  // Countdown for success state (if we want auto-close)
  const [countdown, setCountdown] = useState<number>(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch (error) {
      console.error('There was an error fetching the teams!', error);
    }
  };

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

  const handleSave = () => {
    // User wants to save updated rankings
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
      
      // Auto-close modal after countdown if desired
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

  const handleRetry = () => {
    if (retryFn) retryFn();
  };

  const handleCancel = () => {
    setModalState(null);
    setCountdown(3);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // If not admin, redirect to unauthorized
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Determine modal title & message based on modalState and currentAction
  let modalTitle = '';
  let modalMessage = '';

  if (modalState === 'confirm') {
    modalTitle = 'Confirm Save';
    modalMessage = 'Are you sure you want to save the new rankings? This will affect future scheduling algorithms.';
  } else if (modalState === 'loading') {
    modalTitle = 'Saving...';
    modalMessage = 'Please wait while we update the rankings.';
  } else if (modalState === 'success') {
    // Since this page only does updateRankings, we know what to say:
    modalTitle = 'Success';
    modalMessage = 'Rankings updated successfully!';
  } else if (modalState === 'error') {
    modalTitle = 'Error';
    modalMessage = 'There was an error saving the new rankings. Would you like to retry?';
  }

  // Determine button texts
  const confirmText = modalState === 'confirm' ? 'Save' : undefined;
  const cancelText = (modalState === 'confirm' || modalState === 'error') ? 'Cancel' : undefined;
  const retryText = modalState === 'error' ? 'Retry' : undefined;
  const okText = modalState === 'success' ? 'OK' : undefined;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white shadow-md rounded-lg p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Team Rankings</h2>
          <button
            onClick={handleSave}
            className="mt-4 sm:mt-0 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Rankings
          </button>
        </div>

        <p className="mb-6 text-gray-700">Use the Up and Down buttons to reorder the teams.</p>

        <div className="space-y-4">
          {teams.map((team, index) => (
            <div
              key={team._id}
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm"
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
                  />
                )}
                <span className="text-xl font-semibold">{team.teamName}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => moveTeam(index, 'up')}
                  disabled={index === 0}
                  className={`p-2 rounded-md ${
                    index === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  aria-label={`Move ${team.teamName} up`}
                >
                  <FaArrowUp />
                </button>
                <button
                  onClick={() => moveTeam(index, 'down')}
                  disabled={index === teams.length - 1}
                  className={`p-2 rounded-md ${
                    index === teams.length - 1
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  aria-label={`Move ${team.teamName} down`}
                >
                  <FaArrowDown />
                </button>
              </div>
            </div>
          ))}
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
  );
};

export default TeamsRanking;
