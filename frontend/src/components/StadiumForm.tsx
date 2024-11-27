// frontend/src/components/StadiumForm.tsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Stadium } from '../interfaces/Stadium';
import { AuthContext } from '../contexts/AuthContext';

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

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (id) {
        // Fetch the stadium data for editing
        axios
          .get(`http://localhost:5003/api/stadiums/${id}`)
          .then((response) => {
            setStadium(response.data);
          })
          .catch((error) => {
            console.error('There was an error fetching the stadium!', error);
          });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (id) {
      // Update existing stadium
      axios
        .put(`http://localhost:5003/api/stadiums/${id}`, stadium)
        .then(() => {
          navigate('/stadiums');
        })
        .catch((error) => {
          console.error('There was an error updating the stadium!', error);
        });
    } else {
      // Create new stadium
      axios
        .post('http://localhost:5003/api/stadiums', stadium)
        .then(() => {
          navigate('/stadiums');
        })
        .catch((error) => {
          console.error('There was an error creating the stadium!', error);
        });
    }
  };

  // If the user is not authenticated or doesn't have admin role, redirect to unauthorized
  if (!user || user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      <h2>{id ? 'Edit Stadium' : 'Add New Stadium'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Stadium Name:</label>
          <input
            type="text"
            name="stadiumName"
            value={stadium.stadiumName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>City:</label>
          <input
            type="text"
            name="stadiumCity"
            value={stadium.stadiumCity}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Country:</label>
          <input
            type="text"
            name="stadiumCountry"
            value={stadium.stadiumCountry}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Latitude:</label>
          <input
            type="number"
            name="latitude"
            value={stadium.latitude}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Longitude:</label>
          <input
            type="number"
            name="longitude"
            value={stadium.longitude}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Capacity:</label>
          <input
            type="number"
            name="stadiumCapacity"
            value={stadium.stadiumCapacity}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Surface Type:</label>
          <select name="surfaceType" value={stadium.surfaceType} onChange={handleChange} required>
            <option value="Grass">Grass</option>
            <option value="Artificial Turf">Artificial Turf</option>
          </select>
        </div>
        <button type="submit">{id ? 'Update Stadium' : 'Add Stadium'}</button>
      </form>
    </div>
  );
};

export default StadiumForm;
