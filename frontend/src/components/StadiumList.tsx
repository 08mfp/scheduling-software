// frontend/src/components/StadiumList.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { Stadium } from '../interfaces/Stadium';
import { AuthContext } from '../contexts/AuthContext';

const StadiumList: React.FC = () => {
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      fetchStadiums();
    }
  }, [user]);

  const fetchStadiums = () => {
    axios
      .get('http://localhost:5003/api/stadiums')
      .then((response) => {
        setStadiums(response.data);
      })
      .catch((error) => {
        console.error('There was an error fetching the stadiums!', error);
      });
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 ">
      <div className="max-w-6xl w-full bg-white shadow-md rounded-lg p-8 ">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Stadiums</h2>
          {/* Show Add New Stadium button only to admins */}
          {user.role === 'admin' && (
            <Link to="/stadiums/add">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Add New Stadium
              </button>
            </Link>
          )}
        </div>
        {/* Stadiums List */}
        <div className="space-y-6">
          {stadiums.map((stadium) => (
            <div
              key={stadium._id}
              className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Link to={`/stadiums/${stadium._id}`}>
                  <h3 className="text-xl font-semibold text-blue-600 hover:underline">
                    {stadium.stadiumName}
                  </h3>
                </Link>
                <p className="text-gray-600">
                  <strong>Location:</strong> {stadium.stadiumCity}, {stadium.stadiumCountry}
                </p>
              </div>
              {/* Optional: Add Edit/Delete buttons for admins */}
              {user.role === 'admin' && (
                <div className="mt-4 sm:mt-0 flex space-x-2">
                  <Link to={`/stadiums/edit/${stadium._id}`}>
                    <button className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400">
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(stadium._id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {/* Display message if no stadiums are found */}
          {stadiums.length === 0 && (
            <div className="text-center text-gray-500">
              No stadiums found. Please add a new stadium.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Optional: Handle stadium deletion (requires implementing delete API endpoint)
const handleDelete = (stadiumId: string) => {
  if (window.confirm('Are you sure you want to delete this stadium?')) {
    axios
      .delete(`http://localhost:5003/api/stadiums/${stadiumId}`)
      .then(() => {
        // Refresh the stadium list or remove the deleted stadium from state
        window.location.reload();
      })
      .catch((error) => {
        console.error('There was an error deleting the stadium!', error);
      });
  }
};

export default StadiumList;
