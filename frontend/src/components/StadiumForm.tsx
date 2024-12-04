import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Stadium } from '../interfaces/Stadium';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal'; 
import { FaArrowLeft, FaTimes, FaHome } from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const StadiumForm: React.FC = () => {
  const [stadium, setStadium] = useState<Stadium>({
    _id: '',
    stadiumName: '',
    stadiumCity: '',
    stadiumCountry: '',
    latitude: 0,
    longitude: 0,
    stadiumCapacity: 0,
    surfaceType: 'Grass',
  });

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  // currentAction: 'create' | 'update'
  const [currentAction, setCurrentAction] = useState<'create' | 'update' | null>(null);

  // modalState: 'loading' | 'success' | 'error' | null
  const [modalState, setModalState] = useState<'loading' | 'success' | 'error' | null>(null);

  // Countdown for success auto-close
  const [countdown, setCountdown] = useState<number>(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (id) {
        // Update existing stadium
        setCurrentAction('update');
        axios
          .get<Stadium>(`${BACKEND_URL}/api/stadiums/${id}`)
          .then((response) => {
            setStadium(response.data);
          })
          .catch((err) => {
            console.error('Error fetching stadium!', err);
            setError('Failed to load stadium details. Please try again later.');
          });
      } else {
        // Create new stadium
        setCurrentAction('create');
      }
    }
  }, [id, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStadium((prevStadium) => ({
      ...prevStadium,
      [name]:
        name === 'latitude' || name === 'longitude' || name === 'stadiumCapacity'
          ? parseFloat(value)
          : value,
    }));
  };

  const submitFormData = async () => {
    setLoading(true);
    setModalState('loading');

    try {
      if (id) {
        // Update existing stadium
        await axios.put(`${BACKEND_URL}/api/stadiums/${id}`, stadium);
        setModalState('success');
      } else {
        // Create new stadium
        await axios.post(`${BACKEND_URL}/api/stadiums`, stadium);
        setModalState('success');
      }
    } catch (err) {
      console.error('Error submitting the form!', err);
      setError('Failed to submit the form. Please try again.');
      setModalState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
            navigate('/stadiums');
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

  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Determine success message based on action
  let successTitle = 'Success';
  let successMessage = 'Action completed successfully.';
  if (currentAction === 'create') {
    successTitle = 'Stadium Created Successfully';
    successMessage = 'The stadium has been created successfully.';
  } else if (currentAction === 'update') {
    successTitle = 'Stadium Updated Successfully';
    successMessage = 'The stadium has been updated successfully.';
  }

  // modalTitle & modalMessage based on modalState
  let modalTitle = '';
  let modalMessage = '';

  if (modalState === 'loading') {
    modalTitle = 'Processing...';
    modalMessage =
      currentAction === 'create'
        ? 'Creating the stadium... Please wait.'
        : 'Updating the stadium... Please wait.';
  } else if (modalState === 'success') {
    modalTitle = successTitle;
    modalMessage = successMessage;
  } else if (modalState === 'error') {
    modalTitle = 'Action Failed';
    modalMessage =
      currentAction === 'create'
        ? 'Failed to create the stadium. Please try again.'
        : 'Failed to update the stadium. Please try again.';
  }

  const cancelText = modalState === 'error' ? 'Cancel' : undefined;
  const retryText = modalState === 'error' ? 'Retry' : undefined;
  const okText = modalState === 'success' ? 'OK' : undefined;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mb-6">
          <a href="/stadiums" className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Stadiums
          </a>
          {id && stadium.stadiumName ? (
            <>
              <span className="text-gray-500">/</span>
              <a href={`/stadiums/${id}`} className="text-gray-700 hover:underline">
                {stadium.stadiumName}
              </a>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Edit Stadium</span>
            </>
          ) : (
            <>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Add Stadium</span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {id ? 'Edit Stadium' : 'Add New Stadium'}
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
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="stadiumName" className="block text-sm font-medium text-gray-700">
                Stadium Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="stadiumName"
                id="stadiumName"
                value={stadium.stadiumName}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="stadiumCity" className="block text-sm font-medium text-gray-700">
                City<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="stadiumCity"
                id="stadiumCity"
                value={stadium.stadiumCity}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="stadiumCountry" className="block text-sm font-medium text-gray-700">
                Country<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="stadiumCountry"
                id="stadiumCountry"
                value={stadium.stadiumCountry}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                Latitude<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                id="latitude"
                value={stadium.latitude}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                Longitude<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                id="longitude"
                value={stadium.longitude}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="stadiumCapacity" className="block text-sm font-medium text-gray-700">
                Capacity<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stadiumCapacity"
                id="stadiumCapacity"
                value={stadium.stadiumCapacity}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="surfaceType" className="block text-sm font-medium text-gray-700">
              Surface Type<span className="text-red-500">*</span>
            </label>
            <select
              name="surfaceType"
              id="surfaceType"
              value={stadium.surfaceType}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Grass">Grass</option>
              <option value="Artificial Turf">Artificial Turf</option>
            </select>
          </div>

          {/* Form Buttons */}
          <div className="flex items-center justify-between mt-6">
            <a href="/stadiums" className="text-sm text-blue-600 hover:underline flex items-center">
              <FaArrowLeft className="mr-1" />
              Back to Stadiums
            </a>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/stadiums')}
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
                aria-label={id ? 'Update Stadium' : 'Add Stadium'}
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
                  'Update Stadium'
                ) : (
                  'Add Stadium'
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
            ? (currentAction === 'create' ? 'Stadium Created Successfully' : 'Stadium Updated Successfully')
            : 'Action Failed'
        }
        message={
          modalState === 'loading'
            ? currentAction === 'create'
              ? 'Creating the stadium... Please wait.'
              : 'Updating the stadium... Please wait.'
            : modalState === 'success'
            ? (currentAction === 'create'
              ? 'The stadium has been created successfully.'
              : 'The stadium has been updated successfully.')
            : 'Failed to submit the form. Please try again.'
        }
        countdown={modalState === 'success' ? countdown : undefined}
        cancelText={modalState === 'error' ? 'Cancel' : undefined}
        retryText={modalState === 'error' ? 'Retry' : undefined}
        okText={modalState === 'success' ? 'OK' : undefined}

        onCancel={
          modalState === 'success'
            ? () => navigate('/stadiums')
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

export default StadiumForm;
