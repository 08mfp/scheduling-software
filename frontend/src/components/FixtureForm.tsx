import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal'; 
import { FaArrowLeft, FaHome, FaTimes } from 'react-icons/fa';

interface Fixture {
  _id?: string;
  round: number;
  date: string; // Date and time in ISO format
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  location: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  season: number;
}

interface Team {
  _id: string;
  teamName: string;
}

interface Stadium {
  _id: string;
  stadiumName: string;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const FixtureForm: React.FC = () => {
  const [fixture, setFixture] = useState<Fixture>({
    round: 1,
    date: '',
    homeTeam: '',
    awayTeam: '',
    stadium: '',
    location: '',
    season: new Date().getFullYear(),
  });

  const [teams, setTeams] = useState<Team[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const hasFetched = useRef(false);

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
    if (hasFetched.current) return;
    if (user && user.role === 'admin') {
      fetchTeams();
      fetchStadiums();

      if (id) {
        setCurrentAction('update');
        fetchFixture(id);
      } else {
        setCurrentAction('create');
      }

      hasFetched.current = true;
    }
  }, [id, user]);

  const fetchFixture = (fixtureId: string) => {
    axios
      .get(`${BACKEND_URL}/api/fixtures/${fixtureId}`)
      .then((response) => {
        const data = response.data;
        setFixture({
          round: data.round,
          date: data.date.substring(0, 16), // datetime-local compatible
          homeTeam: data.homeTeam._id,
          awayTeam: data.awayTeam._id,
          stadium: data.stadium._id,
          location: data.location,
          homeTeamScore: data.homeTeamScore,
          awayTeamScore: data.awayTeamScore,
          season: data.season,
        });
      })
      .catch((error) => {
        console.error('Error fetching fixture!', error);
        setError('Failed to load fixture details. Please try again later.');
      });
  };

  const fetchTeams = () => {
    axios
      .get(`${BACKEND_URL}/api/teams`)
      .then((response) => {
        setTeams(response.data);
      })
      .catch((error) => {
        console.error('Error fetching teams!', error);
      });
  };

  const fetchStadiums = () => {
    axios
      .get(`${BACKEND_URL}/api/stadiums`)
      .then((response) => {
        setStadiums(response.data);
      })
      .catch((error) => {
        console.error('Error fetching stadiums!', error);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFixture((prevFixture) => ({
      ...prevFixture,
      [name]: name === 'round' || name === 'season' ? parseInt(value) : value,
    }));
  };

  const submitFormData = async () => {
    setLoading(true);
    setModalState('loading');

    try {
      if (id) {
        // Update existing fixture
        await axios.put(`${BACKEND_URL}/api/fixtures/${id}`, fixture);
        setModalState('success');
      } else {
        // Create new fixture
        await axios.post(`${BACKEND_URL}/api/fixtures`, fixture);
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
    submitFormData();
  };

  useEffect(() => {
    if (modalState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setModalState(null);
            navigate('/fixtures');
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

  // Check if the date is in the past to determine if we show scores
  const isPastDate = () => {
    const fixtureDate = new Date(fixture.date);
    const now = new Date();
    return fixtureDate < now;
  };

  // If not admin, redirect
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Determine success message based on action
  let successTitle = 'Success';
  let successMessage = 'Action completed successfully.';
  if (currentAction === 'create') {
    successTitle = 'Fixture Created Successfully';
    successMessage = 'The fixture has been created successfully.';
  } else if (currentAction === 'update') {
    successTitle = 'Fixture Updated Successfully';
    successMessage = 'The fixture has been updated successfully.';
  }

  let modalTitle = '';
  let modalMessage = '';

  if (modalState === 'loading') {
    modalTitle = 'Processing...';
    modalMessage =
      currentAction === 'create'
        ? 'Creating the fixture... Please wait.'
        : 'Updating the fixture... Please wait.';
  } else if (modalState === 'success') {
    modalTitle = successTitle;
    modalMessage = successMessage;
  } else if (modalState === 'error') {
    modalTitle = 'Action Failed';
    modalMessage =
      currentAction === 'create'
        ? 'Failed to create the fixture. Please try again.'
        : 'Failed to update the fixture. Please try again.';
  }

  const cancelText = modalState === 'error' ? 'Cancel' : undefined;
  const retryText = modalState === 'error' ? 'Retry' : undefined;
  const okText = modalState === 'success' ? 'OK' : undefined;

  // Utility to get the team name by ID
  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t._id === teamId);
    return team ? team.teamName : 'Unknown Team';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mb-6">
          <a href="/fixtures" className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Fixtures
          </a>
          {id ? (
            <>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Edit Fixture</span>
            </>
          ) : (
            <>
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">Add Fixture</span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {id ? 'Edit Fixture' : 'Add New Fixture'}
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

          {/* Round - Not Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Round:</label>
            <p className="mt-1 text-lg text-gray-900 font-semibold">{fixture.round}</p>
          </div>

          {/* Date and Time Input */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date and Time<span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="date"
              id="date"
              value={fixture.date}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Season - Not Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Season:</label>
            <p className="mt-1 text-lg text-gray-900 font-semibold">{fixture.season}</p>
          </div>

          {/* Home Team - Not Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Home Team:</label>
            <p className="mt-1 text-lg text-gray-900 font-semibold">
              {fixture.homeTeam ? getTeamName(fixture.homeTeam) : 'No Team Selected'}
            </p>
          </div>

          {/* Away Team - Not Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Away Team:</label>
            <p className="mt-1 text-lg text-gray-900 font-semibold">
              {fixture.awayTeam ? getTeamName(fixture.awayTeam) : 'No Team Selected'}
            </p>
          </div>

          {/* Stadium Select */}
          <div>
            <label htmlFor="stadium" className="block text-sm font-medium text-gray-700">
              Stadium<span className="text-red-500">*</span>
            </label>
            <select
              name="stadium"
              id="stadium"
              value={fixture.stadium}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a stadium</option>
              {stadiums.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.stadiumName}
                </option>
              ))}
            </select>
          </div>

          {/* Location Input */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              id="location"
              value={fixture.location}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Scores if Date is in the Past */}
          {(() => {
            const fixtureDate = new Date(fixture.date);
            const now = new Date();
            if (fixtureDate < now) {
              return (
                <>
                  <div>
                    <label htmlFor="homeTeamScore" className="block text-sm font-medium text-gray-700">
                      Home Team Score<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="homeTeamScore"
                      id="homeTeamScore"
                      value={fixture.homeTeamScore ?? ''}
                      onChange={handleChange}
                      min="0"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="awayTeamScore" className="block text-sm font-medium text-gray-700">
                      Away Team Score<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="awayTeamScore"
                      id="awayTeamScore"
                      value={fixture.awayTeamScore ?? ''}
                      onChange={handleChange}
                      min="0"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              );
            } else {
              return <p className="text-sm text-gray-500">Scores are not required for future fixtures.</p>;
            }
          })()}

          {/* Form Buttons */}
          <div className="flex items-center justify-between mt-6">
            <a href="/fixtures" className="text-sm text-blue-600 hover:underline flex items-center">
              <FaArrowLeft className="mr-1" />
              Back to Fixtures
            </a>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/fixtures')}
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
                aria-label={id ? 'Update Fixture' : 'Add Fixture'}
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
                  'Update Fixture'
                ) : (
                  'Add Fixture'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Disclaimer */}
        <div className="mt-6 text-sm text-red-700">
          Note: Round, Season, Home & Away Team fields cannot be modified as they would
          violate Six Nations rules and constraints.
        </div>
      </div>

      {/* Loading/Success/Error Modal (No Confirm Step) */}
      <ConfirmModal
        isOpen={modalState !== null}
        type={modalState || 'loading'}
        title={
          modalState === 'loading'
            ? 'Processing...'
            : modalState === 'success'
            ? (currentAction === 'create' ? 'Fixture Created Successfully' : 'Fixture Updated Successfully')
            : 'Action Failed'
        }
        message={
          modalState === 'loading'
            ? currentAction === 'create'
              ? 'Creating the fixture... Please wait.'
              : 'Updating the fixture... Please wait.'
            : modalState === 'success'
            ? (currentAction === 'create'
              ? 'The fixture has been created successfully.'
              : 'The fixture has been updated successfully.')
            : 'Failed to submit the form. Please try again.'
        }
        countdown={modalState === 'success' ? countdown : undefined}
        cancelText={modalState === 'error' ? 'Cancel' : undefined}
        retryText={modalState === 'error' ? 'Retry' : undefined}
        okText={modalState === 'success' ? 'OK' : undefined}

        onCancel={
          modalState === 'success'
            ? () => navigate('/fixtures')
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

export default FixtureForm;
