// frontend/src/components/StadiumDetail.tsx

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Stadium } from '../interfaces/Stadium';
import { AuthContext } from '../contexts/AuthContext';

const StadiumDetail: React.FC = () => {
  const [stadium, setStadium] = useState<Stadium | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && ['admin', 'manager', 'viewer'].includes(user.role)) {
      // Fetch the stadium data by ID
      axios
        .get(`http://localhost:5003/api/stadiums/${id}`)
        .then((response) => {
          setStadium(response.data);
        })
        .catch((error) => {
          console.error('There was an error fetching the stadium!', error);
        });
    }
  }, [id, user]);

  const deleteStadium = () => {
    if (!user || user.role !== 'admin') {
      alert('You do not have permission to delete this stadium.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this stadium?')) {
      axios
        .delete(`http://localhost:5003/api/stadiums/${id}`)
        .then(() => {
          navigate('/stadiums');
        })
        .catch((error) => {
          console.error('There was an error deleting the stadium!', error);
        });
    }
  };

  // If the user is not authenticated or doesn't have the required role, redirect to unauthorized
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!stadium) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{stadium.stadiumName}</h2>
      <p>
        <strong>Location:</strong> {stadium.stadiumCity}, {stadium.stadiumCountry}
      </p>
      <p>
        <strong>Coordinates:</strong> Latitude {stadium.latitude}, Longitude {stadium.longitude}
      </p>
      <p>
        <strong>Capacity:</strong> {stadium.stadiumCapacity}
      </p>
      <p>
        <strong>Surface Type:</strong> {stadium.surfaceType}
      </p>
      {/* Show Edit and Delete buttons only to admins */}
      {user.role === 'admin' && (
        <>
          <Link to={`/stadiums/edit/${stadium._id}`}>
            <button>Edit</button>
          </Link>
          <button onClick={deleteStadium}>Delete</button>
        </>
      )}
    </div>
  );
};

export default StadiumDetail;
