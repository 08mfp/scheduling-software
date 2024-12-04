import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Player } from '../interfaces/Player';
import { Team } from '../interfaces/Team';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal'; 
import { FaArrowLeft, FaHome, FaTimes } from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const PlayerForm: React.FC = () => {
  const [player, setPlayer] = useState<Partial<Player>>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    team: { _id: '', teamName: '' },
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  const [currentAction, setCurrentAction] = useState<'create' | 'update' | null>(null);
  const [modalState, setModalState] = useState<'loading' | 'success' | 'error' | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && ['admin', 'manager'].includes(user.role)) {
      axios.get(`${BACKEND_URL}/api/teams`).then((response) => {
        setTeams(response.data);
      });

      if (id) {
        setCurrentAction('update');
        axios
          .get(`${BACKEND_URL}/api/players/${id}`)
          .then((response) => {
            setPlayer(response.data);
          })
          .catch((error) => {
            console.error('Error fetching player!', error);
            setError('Failed to load player details. Please try again later.');
          });
      } else {
        setCurrentAction('create');
      }
    }
  }, [id, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      image: undefined,
    }));
    setSelectedImage(null);
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamId = e.target.value;
    const selectedTeam = teams.find((t) => t._id === teamId);
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      team: selectedTeam,
    }));
  };

  const submitFormData = async () => {
    setLoading(true);
    setModalState('loading');

    const formData = new FormData();
    formData.append('firstName', player.firstName || '');
    formData.append('lastName', player.lastName || '');
    formData.append('dateOfBirth', player.dateOfBirth || '');
    formData.append('team', player.team?._id || '');

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    if (removeImage) {
      formData.append('removeImage', 'true');
    }

    try {
      if (id) {
        // Update existing player
        await axios.put(`${BACKEND_URL}/api/players/${id}`, formData);
        setModalState('success');
      } else {
        // Create new player
        await axios.post(`${BACKEND_URL}/api/players`, formData);
        setModalState('success');
      }
    } catch (error) {
      console.error('Error submitting the form!', error);
      setError('Failed to submit the form. Please try again.');
      setModalState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Directly submit without confirm step
    submitFormData();
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
            navigate('/players');
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

  if (!user || !['admin', 'manager'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  let successTitle = 'Success';
  let successMessage = 'Action completed successfully.';
  if (currentAction === 'create') {
    successTitle = 'Player Created Successfully';
    successMessage = 'The player has been created successfully.';
  } else if (currentAction === 'update') {
    successTitle = 'Player Updated Successfully';
    successMessage = 'The player has been updated successfully.';
  }

  let modalTitle = '';
  let modalMessage = '';

  if (modalState === 'loading') {
    modalTitle = 'Processing...';
    modalMessage =
      currentAction === 'create'
        ? 'Creating the player... Please wait.'
        : 'Updating the player... Please wait.';
  } else if (modalState === 'success') {
    modalTitle = successTitle;
    modalMessage = successMessage;
  } else if (modalState === 'error') {
    modalTitle = 'Action Failed';
    modalMessage =
      currentAction === 'create'
        ? 'Failed to create the player. Please try again.'
        : 'Failed to update the player. Please try again.';
  }

  const cancelText = modalState === 'error' ? 'Cancel' : undefined;
  const retryText = modalState === 'error' ? 'Retry' : undefined;
  const okText = modalState === 'success' ? 'OK' : undefined;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mb-6">
          <a href="/players" className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Players
          </a>
          {id && player.firstName ? (
            <>
              <span className="text-gray-500">/</span>
              <a href={`/players/${id}`} className="text-gray-700 hover:underline">
                {player.firstName} {player.lastName}
              </a>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Edit Player</span>
            </>
          ) : (
            <>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Add Player</span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {player.image && !removeImage ? (
            <img
              src={`${BACKEND_URL}${player.image}`}
              alt="Player"
              className="w-48 h-48 object-cover rounded-full mb-6"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-200 rounded-full mb-6 flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {id ? 'Edit Player' : 'Add New Player'}
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
        <form className="space-y-6" onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={player.firstName || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={player.lastName || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Player Image
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
            {player.image && !removeImage && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Current Image:</p>
                <img
                  src={`${BACKEND_URL}${player.image}`}
                  alt="Player"
                  className="w-32 h-32 object-cover mt-2 rounded-md"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Remove Image
                </button>
              </div>
            )}
            {selectedImage && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Selected Image:</p>
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected Player"
                  className="w-32 h-32 object-cover mt-2 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of Birth<span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dateOfBirth"
              id="dateOfBirth"
              value={player.dateOfBirth ? player.dateOfBirth.slice(0, 10) : ''}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Team Select */}
          <div>
            <label htmlFor="team" className="block text-sm font-medium text-gray-700">
              Team<span className="text-red-500">*</span>
            </label>
            <select
              name="team"
              id="team"
              value={player.team?._id || ''}
              onChange={handleTeamChange}
              required
              className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a team</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>

          {/* Form Buttons */}
          <div className="flex items-center justify-between">
            <a href="/players" className="text-sm text-blue-600 hover:underline flex items-center">
              <FaArrowLeft className="mr-1" />
              Back to Players
            </a>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/players')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                aria-label="Cancel"
              >
                <FaTimes className="mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                aria-label={id ? 'Update Player' : 'Add Player'}
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
                  'Update Player'
                ) : (
                  'Add Player'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Loading/Success/Error Modal (No Confirm Step) */}
      <ConfirmModal
        isOpen={modalState !== null}
        type={modalState || 'loading'}
        title={
          modalState === 'loading'
            ? 'Processing...'
            : modalState === 'success'
            ? (currentAction === 'create' ? 'Player Created Successfully' : 'Player Updated Successfully')
            : 'Action Failed'
        }
        message={
          modalState === 'loading'
            ? currentAction === 'create'
              ? 'Creating the player... Please wait.'
              : 'Updating the player... Please wait.'
            : modalState === 'success'
            ? (currentAction === 'create'
              ? 'The player has been created successfully.'
              : 'The player has been updated successfully.')
            : 'Failed to submit the form. Please try again.'
        }
        countdown={modalState === 'success' ? countdown : undefined}
        cancelText={modalState === 'error' ? 'Cancel' : undefined}
        retryText={modalState === 'error' ? 'Retry' : undefined}
        okText={modalState === 'success' ? 'OK' : undefined}

        onCancel={
          modalState === 'success'
            ? () => navigate('/players')
            : () => {
                setModalState(null);
                setCountdown(3);
              }
        }
        onRetry={modalState === 'error' ? submitFormData : undefined}
      />
    </div>
  );
};

export default PlayerForm;
