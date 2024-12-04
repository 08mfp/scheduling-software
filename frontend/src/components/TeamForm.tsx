// frontend/src/components/TeamForm.tsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { Team } from '../interfaces/Team';
import { Stadium } from '../interfaces/Stadium';
import { Player } from '../interfaces/Player';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal'; // Import ConfirmModal
import { FaArrowLeft, FaTrash, FaHome, FaTimes } from 'react-icons/fa'; // Added FaTimes

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const TeamForm: React.FC = () => {
  const [team, setTeam] = useState<Partial<Team>>({
    teamName: '',
    teamRanking: 0,
    teamLocation: '',
    teamCoach: '',
    stadium: {
      _id: '',
      stadiumName: '',
      stadiumCity: '',
      stadiumCountry: '',
      latitude: 0,
      longitude: 0,
      stadiumCapacity: 0,
      surfaceType: 'Grass',
    },
  });
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  // Modal state: 'confirm' | 'loading' | 'success' | 'error' | null
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);

  // Countdown state for success modal
  const [countdown, setCountdown] = useState<number>(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchStadiums();

      if (id) {
        // Fetch the team data for editing
        fetchTeam();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const fetchStadiums = async () => {
    try {
      const response = await axios.get<Stadium[]>(`${BACKEND_URL}/api/stadiums`);
      setStadiums(response.data);
    } catch (err) {
      console.error('There was an error fetching the stadiums!', err);
      setError('Failed to load stadiums. Please try again later.');
    }
  };

  const fetchTeam = async () => {
    try {
      const teamResponse = await axios.get<Team>(`${BACKEND_URL}/api/teams/${id}`);
      setTeam(teamResponse.data);

      // Fetch players for the team
      const playersResponse = await axios.get<Player[]>(`${BACKEND_URL}/api/teams/${id}/players`);
      setPlayers(playersResponse.data);
    } catch (err) {
      console.error('There was an error fetching the team!', err);
      setError('Failed to load team details. Please try again later.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeam((prevTeam) => ({
      ...prevTeam,
      [name]: name === 'teamRanking' ? parseInt(value) : value,
    }));
  };

  const handleStadiumChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stadiumId = e.target.value;
    const selectedStadium = stadiums.find((stadium) => stadium._id === stadiumId);
    setTeam((prevTeam) => ({
      ...prevTeam,
      stadium: selectedStadium || prevTeam.stadium,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('teamName', team.teamName || '');
    formData.append('teamRanking', team.teamRanking?.toString() || '');
    formData.append('teamLocation', team.teamLocation || '');
    formData.append('teamCoach', team.teamCoach || '');
    formData.append('stadium', team.stadium?._id || '');

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      if (id) {
        // Update existing team
        await axios.put(`${BACKEND_URL}/api/teams/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setModalState('success');
      } else {
        // Create new team
        await axios.post(`${BACKEND_URL}/api/teams`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setModalState('success');
      }
    } catch (err) {
      console.error('There was an error submitting the form!', err);
      setError('Failed to submit the form. Please try again.');
      setModalState('error');
    } finally {
      setLoading(false);
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

  const deleteTeam = async () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this team.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/teams/${id}`);
      setModalState('success');
    } catch (err) {
      console.error('There was an error deleting the team!', err);
      setError('Failed to delete the team. Please try again.');
      setModalState('error');
    }
  };

  // If the user is not authenticated or doesn't have admin role, show unauthorized message
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mb-6">
          <Link to="/teams" className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Teams
          </Link>
          {id && team.teamName ? (
            <>
              <span className="text-gray-500">/</span>
              <Link to={`/teams/${id}`} className="text-gray-700 hover:underline">
                {team.teamName}
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Edit Team</span>
            </>
          ) : (
            <>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Add Team</span>
            </>
          )}
        </div>

        {/* Image Display */}
        <div className="flex flex-col items-center">
          {id && team.image ? (
            <img
              src={`${BACKEND_URL}${team.image}`}
              alt={`${team.teamName} Logo`}
              className="w-48 h-48 object-contain rounded-full mb-6"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-200 rounded-full mb-6 flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {id ? 'Edit Team' : 'Add New Team'}
          </h2>
          {error && (
            <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center">
              <span className="block sm:inline">{error}</span>
              <button
                onClick={() => setError(null)}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                aria-label="Close"
              >
                <svg
                  className="fill-current h-6 w-6 text-red-500"
                  role="button"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <title>Close</title>
                  <path
                    fillRule="evenodd"
                    d="M14.348 5.652a.5.5 0 0 1 .072.638l-5 5a.5.5 0 0 1-.638.072l-5-5a.5.5 0 1 1 .638-.072l4.646 4.646 4.646-4.646a.5.5 0 0 1 .638-.072z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Team Name */}
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700">
                Team Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="teamName"
                id="teamName"
                value={team.teamName || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Team Ranking */}
            <div>
              <label htmlFor="teamRanking" className="block text-sm font-medium text-gray-700">
                Team Ranking<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="teamRanking"
                id="teamRanking"
                value={team.teamRanking || 0}
                onChange={handleChange}
                required
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Team Location */}
            <div>
              <label htmlFor="teamLocation" className="block text-sm font-medium text-gray-700">
                Team Location<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="teamLocation"
                id="teamLocation"
                value={team.teamLocation || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Team Coach */}
            <div>
              <label htmlFor="teamCoach" className="block text-sm font-medium text-gray-700">
                Team Coach<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="teamCoach"
                id="teamCoach"
                value={team.teamCoach || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Home Stadium */}
            <div className="sm:col-span-2">
              <label htmlFor="stadium" className="block text-sm font-medium text-gray-700">
                Home Stadium<span className="text-red-500">*</span>
              </label>
              <select
                name="stadium"
                id="stadium"
                value={team.stadium?._id || ''}
                onChange={handleStadiumChange}
                required
                className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a stadium</option>
                {stadiums.map((stadium) => (
                  <option key={stadium._id} value={stadium._id}>
                    {stadium.stadiumName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Team Image
            </label>
            <div className="mt-1 flex items-center">
              <input
                type="file"
                name="image"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered file-input-primary w-full max-w-xs"
              />
            </div>
            {id && team.image && !selectedImage && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Current Image:</p>
                <img
                  src={`${BACKEND_URL}${team.image}`}
                  alt="Team"
                  className="w-32 h-32 object-cover mt-2 rounded-md"
                />
              </div>
            )}
            {selectedImage && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Selected Image:</p>
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected Team"
                  className="w-32 h-32 object-cover mt-2 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-between">
            <Link to="/teams" className="text-sm text-blue-600 hover:underline flex items-center">
              <FaArrowLeft className="mr-1" />
              Back to Teams
            </Link>
            <div className="flex space-x-4">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => navigate('/teams')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                aria-label="Cancel"
              >
                <FaTimes className="mr-2" />
                Cancel
              </button>
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                aria-label={id ? 'Update Team' : 'Add Team'}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    {id ? 'Updating...' : 'Submitting...'}
                  </>
                ) : id ? (
                  'Update Team'
                ) : (
                  'Add Team'
                )}
              </button>
            </div>
          </div>

          {/* Delete Button (Visible Only in Edit Mode) */}
          {id && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={openConfirmModal}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                aria-label="Delete Team"
              >
                <FaTrash className="mr-2" />
                Delete Team
              </button>
            </div>
          )}
        </form>

        {/* Confirm/Loading/Success/Error Modal */}
        <ConfirmModal
          isOpen={modalState !== null}
          type={modalState || 'confirm'}
          title={
            modalState === 'confirm'
              ? 'Confirm Action'
              : modalState === 'loading'
              ? 'Processing...'
              : modalState === 'success'
              ? id
                ? 'Team Deleted Successfully'
                : 'Team Created Successfully'
              : 'Action Failed'
          }
          message={
            modalState === 'confirm'
              ? id
                ? 'Are you sure you want to delete this team? This action cannot be undone.'
                : 'Are you sure you want to create this team?'
              : modalState === 'loading'
              ? id
                ? 'Deleting the team... Please wait.'
                : 'Creating the team... Please wait.'
              : modalState === 'success'
              ? id
                ? 'The team has been deleted successfully.'
                : 'The team has been created successfully.'
              : id
              ? 'Failed to delete the team. Please try again.'
              : 'Failed to create the team. Please try again.'
          }
          countdown={modalState === 'success' ? countdown : undefined}
          onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
          onCancel={
            modalState === 'success'
              ? () => navigate('/teams') // Navigate after success
              : modalState === 'confirm'
              ? closeModal // Close modal without action
              : closeModal // Close modal on error or loading
          }
          onRetry={modalState === 'error' ? handleRetry : undefined}
        />
      </div>
    </div>
  );
};

export default TeamForm;
