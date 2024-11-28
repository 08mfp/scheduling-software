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
    <div>
      <h2>Stadiums</h2>
      {/* Show Add New Stadium button only to admins */}
      {user.role === 'admin' && (
        <Link to="/stadiums/add">
          <button>Add New Stadium</button>
        </Link>
      )}
      {stadiums.map((stadium) => (
        <div key={stadium._id}>
          <Link to={`/stadiums/${stadium._id}`}>
            <h3>{stadium.stadiumName}</h3>
          </Link>
          <p>
            <strong>Location:</strong> {stadium.stadiumCity}, {stadium.stadiumCountry}
          </p>
          <hr />
        </div>
      ))}
    </div>
  );
};

export default StadiumList;
