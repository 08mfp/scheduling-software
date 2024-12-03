// frontend/src/components/StadiumDetail.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Stadium } from '../interfaces/Stadium';
import { AuthContext } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const StadiumDetail: React.FC = () => {
  const [stadium, setStadium] = useState<Stadium | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchStadium();
    }
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

    if (window.confirm('Are you sure you want to delete this stadium?')) {
      try {
        await axios.delete(`${BACKEND_URL}/api/stadiums/${id}`);
        navigate('/stadiums');
      } catch (err) {
        setError('Failed to delete the stadium.');
        console.error('Error deleting stadium:', err);
      }
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-purple-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchStadium}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stadium) {
    return <div className="text-center text-gray-500">No stadium found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-10">
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">
            {stadium.stadiumName}
          </h2>
          <div className="flex items-center text-lg text-gray-600">
            <svg
              className="w-6 h-6 text-gray-800 mr-2"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M5 9a7 7 0 1 1 8 6.93V21a1 1 0 1 1-2 0v-5.07A7.001 7.001 0 0 1 5 9Zm5.94-1.06A1.5 1.5 0 0 1 12 7.5a1 1 0 1 0 0-2A3.5 3.5 0 0 0 8.5 9a1 1 0 0 0 2 0c0-.398.158-.78.44-1.06Z"
                clipRule="evenodd"
              />
            </svg>
            <strong>Location:</strong> {stadium.stadiumCity}, {stadium.stadiumCountry}
          </div>
        </div>

        <div className="space-y-6 text-center">
          <p className="text-lg">
            <strong>Coordinates:</strong> Latitude {stadium.latitude}, Longitude {stadium.longitude}
          </p>
          <p className="text-lg">
            <strong>Capacity:</strong> {stadium.stadiumCapacity}
          </p>
          <p className="text-lg">
            <strong>Surface Type:</strong> {stadium.surfaceType}
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Link to={`/stadiums`}>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              Back to Stadiums
            </button>
          </Link>
          {user.role === 'admin' && (
            <>
              <Link to={`/stadiums/edit/${stadium._id}`}>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Edit Stadium
                </button>
              </Link>
              <button
                onClick={deleteStadium}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Stadium
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StadiumDetail;
