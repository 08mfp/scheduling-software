import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import StadiumMap, { StadiumMapRef } from './StadiumMap';
import ConfirmModal from './ConfirmModal';
import { Stadium } from '../interfaces/Stadium';
import { AuthContext } from '../contexts/AuthContext';
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaRedo,
  FaCube,
  FaMap,
  FaHome,
} from 'react-icons/fa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';
const CUSTOM_MARKER_URL = '/stadium-marker.svg';

const StadiumDetail: React.FC = () => {
  const [stadium, setStadium] = useState<Stadium | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/08mfp/cm48iyqv8019l01r2da9o4fi3');
  const [is3D, setIs3D] = useState<boolean>(false);
  const [isCustomMarkerAvailable, setIsCustomMarkerAvailable] = useState<boolean>(false);
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const stadiumMapRef = useRef<StadiumMapRef>(null);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchStadium();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const fetchStadium = async () => {
    try {
      const response = await axios.get<Stadium>(`${BACKEND_URL}/api/stadiums/${id}`);
      setStadium(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load stadium details. Please try again later.');
      console.error('Error fetching stadium:', err);
      setLoading(false);
    }
  };

  const deleteStadium = async () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this stadium.');
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/stadiums/${id}`);
      setModalState('success');
      setCountdown(10);
    } catch (err) {
      console.error('Error deleting stadium:', err);
      setModalState('error');
    }
  };

  const handleMapStyleToggle = () => {
    setMapStyle((prevStyle) =>
      prevStyle === 'mapbox://styles/08mfp/cm48iyqv8019l01r2da9o4fi3'
        ? 'mapbox://styles/mapbox/streets-v11'
        : 'mapbox://styles/08mfp/cm48iyqv8019l01r2da9o4fi3'
    );
  };

  const toggle3D = () => {
    setIs3D((prev) => !prev);
  };

  const recenterMap = () => {
    if (stadiumMapRef.current) {
      stadiumMapRef.current.recenterMap();
    }
  };

  useEffect(() => {
    const img = new Image();
    img.src = CUSTOM_MARKER_URL;
    img.onload = () => setIsCustomMarkerAvailable(true);
    img.onerror = () => setIsCustomMarkerAvailable(false);
  }, []);

  useEffect(() => {
    if (modalState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setModalState(null);
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
  }, [modalState]);

  const openConfirmModal = () => setModalState('confirm');
  const closeModal = () => {
    setModalState(null);
    setCountdown(10);
  };

  const handleConfirmDelete = () => {
    setModalState('loading');
    setTimeout(() => {
      deleteStadium();
    }, 3000);
  };

  const handleRetry = () => {
    setModalState('loading');
    setTimeout(() => {
      deleteStadium();
    }, 3000);
  };

  const isValidCoordinates = (latitude: number, longitude: number): boolean => {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return false;
    }
    if (latitude === 0 && longitude === 0) return false;
    return true;
  };

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-lg text-gray-700 dark:text-gray-200">Loading Stadium Details...</p>
        </div>
      </div>
    );
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
            onClick={fetchStadium}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stadium) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-center text-gray-500 dark:text-gray-400">No stadium found.</p>
      </div>
    );
  }

  const coordinatesValid = isValidCoordinates(stadium.latitude, stadium.longitude);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8">
        <div className="flex items-center space-x-2">
          <Link to="/stadiums" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Stadiums
          </Link>
          <span className="text-gray-500 dark:text-gray-400">/</span>
          <span className="text-gray-700 dark:text-gray-300">{stadium.stadiumName}</span>
        </div>

        <div className="flex flex-col items-center mb-8">
          <h2 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 text-center">
            {stadium.stadiumName}
          </h2>
          <p className="text-md text-gray-600 dark:text-gray-300">
            Located in {stadium.stadiumCity}, {stadium.stadiumCountry}.
          </p>
        </div>

        {stadium.stadiumCapacity && (
          <div className="mt-6 flex justify-center flex-wrap gap-2">
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-sm rounded-full">
              Capacity: {stadium.stadiumCapacity}
            </span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
          <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">PlaceHolder</h3>
            <p className="mt-2 text-2xl text-gray-900 dark:text-gray-100">PlaceHolder</p>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Surface Type</h3>
            <p className="mt-2 text-2xl text-gray-900 dark:text-gray-100">{stadium.surfaceType}</p>
          </div>
        </div>

        <div className="mt-8">
          {coordinatesValid ? (
            <StadiumMap
              ref={stadiumMapRef}
              stadium={stadium}
              mapStyle={mapStyle}
              is3D={is3D}
              isCustomMarkerAvailable={isCustomMarkerAvailable}
              customMarkerUrl={CUSTOM_MARKER_URL}
            />
          ) : (
            <div className="p-6 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">Invalid Coordinates</h3>
              <p>This stadium has invalid coordinates:</p>
              <p className="font-mono mt-1">
                {`Latitude: ${stadium.latitude}, Longitude: ${stadium.longitude}`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
          <button
            onClick={recenterMap}
            aria-label="Recenter Map"
            className={`flex items-center justify-center px-4 py-2 ${
              coordinatesValid
                ? 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-800'
                : 'bg-gray-400 text-gray-700 dark:text-gray-400 cursor-not-allowed'
            } rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
            disabled={!coordinatesValid}
          >
            <FaRedo className="mr-2" />
            Recenter
          </button>
          <button
            onClick={toggle3D}
            aria-label={is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FaCube className="mr-2" />
            {is3D ? 'Switch to 2D' : 'Switch to 3D'}
          </button>
          <button
            onClick={handleMapStyleToggle}
            aria-label="Toggle Map Style"
            className="flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <FaMap className="mr-2" />
            Toggle Style
          </button>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Link to="/stadiums">
            <button
              className="flex items-center px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Back to Stadiums"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
          </Link>
          {user.role === 'admin' && (
            <>
              <Link to={`/stadiums/edit/${stadium._id}`}>
                <button
                  className="flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Edit Stadium"
                >
                  <FaEdit className="mr-2" />
                  Edit
                </button>
              </Link>
              <button
                onClick={openConfirmModal}
                className="flex items-center px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Delete Stadium"
              >
                <FaTrash className="mr-2" />
                Delete
              </button>
            </>
          )}
        </div>

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
              ? 'Are you sure you want to delete this stadium? This action cannot be undone.'
              : modalState === 'loading'
              ? 'Deleting the stadium... Please wait.'
              : modalState === 'success'
              ? 'The stadium has been deleted successfully.'
              : 'Failed to delete the stadium. Please try again.'
          }
          countdown={modalState === 'success' ? countdown : undefined}
          onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
          onCancel={
            modalState === 'success'
              ? () => navigate('/stadiums')
              : closeModal
          }
          onRetry={modalState === 'error' ? handleRetry : undefined}
        />
      </div>
    </div>
  );
};

export default StadiumDetail;
