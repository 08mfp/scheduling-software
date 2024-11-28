// frontend/src/pages/Profile.tsx

import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  homeCity?: string;
  age?: number;
  image?: string;
}

const Profile: React.FC = () => {
  const { user, apiKey, signOut } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    role: user?.role || '',
    homeCity: '',
    age: undefined,
    image: '',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchUserData = async () => {
    if (apiKey) {
      try {
        const response = await axios.get('http://localhost:5003/api/users/me', {
          headers: { 'x-api-key': apiKey },
        });
        setFormData({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          role: response.data.role,
          homeCity: response.data.homeCity || '',
          age: response.data.age || undefined,
          image: response.data.image || '',
        });
        if (response.data.image) {
          setImagePreview(`http://localhost:5003${response.data.image}`);
        } else {
          setImagePreview(null);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [apiKey]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('firstName', formData.firstName);
      data.append('lastName', formData.lastName);
      data.append('email', formData.email);
      data.append('homeCity', formData.homeCity || '');
      if (formData.age !== undefined) {
        data.append('age', formData.age.toString());
      }
      if ((formData as any).password) {
        data.append('password', (formData as any).password);
      }
      if (selectedImage) {
        data.append('image', selectedImage);
      } else if (formData.image === '') {
        data.append('removeImage', 'true');
      }

      await axios.put(
        'http://localhost:5003/api/users/me',
        data,
        {
          headers: {
            'x-api-key': apiKey || '',
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Refetch user data
      await fetchUserData();

      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  const onDeleteImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({ ...formData, image: '' });
  };

  return (
    <div>
      <h2>My Profile</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={onSubmit} encType="multipart/form-data">
        <div>
          <label>First Name:</label>
          {isEditing ? (
            <input
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              required
            />
          ) : (
            <span>{formData.firstName}</span>
          )}
        </div>
        <div>
          <label>Last Name:</label>
          {isEditing ? (
            <input
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              required
            />
          ) : (
            <span>{formData.lastName}</span>
          )}
        </div>
        <div>
          <label>Email:</label>
          {isEditing ? (
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={onChange}
              required
            />
          ) : (
            <span>{formData.email}</span>
          )}
        </div>
        {isEditing && (
          <div>
            <label>New Password:</label>
            <input
              name="password"
              type="password"
              placeholder="Enter new password if you wish to change it"
              onChange={onChange}
            />
          </div>
        )}
        <div>
          <label>Home City:</label>
          {isEditing ? (
            <input
              name="homeCity"
              value={formData.homeCity}
              onChange={onChange}
            />
          ) : (
            <span>{formData.homeCity || 'N/A'}</span>
          )}
        </div>
        <div>
          <label>Age:</label>
          {isEditing ? (
            <input
              name="age"
              type="number"
              value={formData.age || ''}
              onChange={onChange}
            />
          ) : (
            <span>{formData.age || 'N/A'}</span>
          )}
        </div>
        <div>
          <label>Profile Image:</label>
          {imagePreview && (
            <div>
              <img src={imagePreview} alt="Profile" width="100" />
              {isEditing && (
                <button type="button" onClick={onDeleteImage}>
                  Remove Image
                </button>
              )}
            </div>
          )}
          {isEditing && (
            <input type="file" accept="image/*" onChange={onFileChange} />
          )}
        </div>
        <div>
          <label>Role:</label>
          <span>{formData.role}</span>
          <p style={{ fontSize: 'small', color: 'gray' }}>
            To change your role, please contact an administrator.
          </p>
        </div>
        {isEditing ? (
          <div>
            <button type="submit">Save Changes</button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                fetchUserData();
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </form>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

export default Profile;
