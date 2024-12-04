// src/components/StadiumDetail.tsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import StadiumMap, { StadiumMapRef } from './StadiumMap'; // Import StadiumMap and its ref interface
import ConfirmModal from './ConfirmModal'; // Import the enhanced ConfirmModal
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
const CUSTOM_MARKER_URL = '/stadium-marker.svg'; // Path to your custom marker

const StadiumDetail: React.FC = () => {
  const [stadium, setStadium] = useState<Stadium | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/08mfp/cm48iyqv8019l01r2da9o4fi3'); // Default custom style
  const [is3D, setIs3D] = useState<boolean>(false);
  const [isCustomMarkerAvailable, setIsCustomMarkerAvailable] = useState<boolean>(false);

  // Modal state: 'confirm' | 'loading' | 'success' | 'error' | null
  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);

  // Countdown state for success modal
  const [countdown, setCountdown] = useState<number>(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Create a ref to access StadiumMap's recenterMap method
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
      // After successful deletion, show success modal and start countdown
      setModalState('success');
      setCountdown(10); // Initialize countdown to 10 seconds
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

  // Preload custom marker to check if it exists
  useEffect(() => {
    const img = new Image();
    img.src = CUSTOM_MARKER_URL;
    img.onload = () => setIsCustomMarkerAvailable(true);
    img.onerror = () => setIsCustomMarkerAvailable(false);
  }, []);

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
  }, [modalState]);

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
      deleteStadium();
    }, 3000);
  };

  const handleRetry = () => {
    setModalState('loading');
    // Ensure loading lasts at least 3 seconds
    setTimeout(() => {
      deleteStadium();
    }, 3000);
  };

  // Validation Function for Coordinates
  const isValidCoordinates = (latitude: number, longitude: number): boolean => {
    // Check if both are numbers and within valid ranges
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
    // Optionally, treat (0,0) as invalid if it's a placeholder
    if (latitude === 0 && longitude === 0) return false;
    return true;
  };

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-lg text-gray-700">Loading Stadium Details...</p>
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
            onClick={fetchStadium}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stadium) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-center text-gray-500">No stadium found.</p>
      </div>
    );
  }

  // Determine if coordinates are valid
  const coordinatesValid = isValidCoordinates(stadium.latitude, stadium.longitude);

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2">
          <Link to={`/stadiums`} className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Stadiums
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-700">{stadium.stadiumName}</span>
        </div>

        {/* Stadium Header */}
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-4 text-center">
            {stadium.stadiumName}
          </h2>
          <p className="text-md text-gray-600">
            Located in {stadium.stadiumCity}, {stadium.stadiumCountry}.
          </p>
        </div>

        {/* Stadium Image
        {stadium.imageUrl && (
          <div className="mt-4">
            <img
              src={stadium.imageUrl || '/default-stadium.jpg'}
              alt={`${stadium.stadiumName}`}
              className="w-full h-48 sm:h-64 md:h-80 object-cover rounded-lg shadow-md"
              loading="lazy"
            />
          </div>
        )} */}

        {/* Stadium Features (Optional) */}
        {stadium.stadiumCapacity && (
          <div className="mt-6 flex justify-center flex-wrap gap-2">
            {/* Example: Assuming stadiumCapacity can be considered as a feature */}
            <span
              className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full"
            >
              Capacity: {stadium.stadiumCapacity}
            </span>
          </div>
        )}

        {/* Stadium Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
          <div className="p-6 bg-gray-50 rounded-lg shadow">
            {/* <h3 className="text-xl font-semibold text-gray-700">Capacity</h3> */}
            <h3 className="text-xl font-semibold text-gray-700">PlaceHolder</h3>
            {/* <p className="mt-2 text-2xl text-gray-900">{stadium.stadiumCapacity}</p> */}
            <p className="mt-2 text-2xl text-gray-900">PlaceHolder</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700">Surface Type</h3>
            <p className="mt-2 text-2xl text-gray-900">{stadium.surfaceType}</p>
          </div>
        </div>

        {/* Stadium Map or Invalid Coordinates Message */}
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
            <div className="p-6 bg-red-100 text-red-700 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">Invalid Coordinates</h3>
              <p>This stadium has invalid coordinates:</p>
              <p className="font-mono mt-1">
                {`Latitude: ${stadium.latitude}, Longitude: ${stadium.longitude}`}
              </p>
            </div>
          )}
        </div>

        {/* Control Toolbar */}
        <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
          <button
            onClick={recenterMap}
            aria-label="Recenter Map"
            className={`flex items-center justify-center px-4 py-2 ${
              coordinatesValid
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            } rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
            disabled={!coordinatesValid}
          >
            <FaRedo className="mr-2" />
            Recenter
          </button>
          <button
            onClick={toggle3D}
            aria-label={is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
            className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <FaCube className="mr-2" />
            {is3D ? 'Switch to 2D' : 'Switch to 3D'}
          </button>
          <button
            onClick={handleMapStyleToggle}
            aria-label="Toggle Map Style"
            className={`flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400`}
          >
            <FaMap className="mr-2" />
            Toggle Style
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Link to={`/stadiums`}>
            <button
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Edit Stadium"
                >
                  <FaEdit className="mr-2" />
                  Edit
                </button>
              </Link>
              <button
                onClick={openConfirmModal}
                className="flex items-center px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Delete Stadium"
              >
                <FaTrash className="mr-2" />
                Delete
              </button>
            </>
          )}
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
              ? () => navigate('/stadiums') // Navigate after success
              : closeModal
          }
          onRetry={modalState === 'error' ? handleRetry : undefined}
        />
      </div>
    </div>
  );
};

export default StadiumDetail;
