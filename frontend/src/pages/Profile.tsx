// frontend/src/pages/Profile.tsx

import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaEdit, FaSave, FaTimes, FaSignOutAlt } from 'react-icons/fa';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  homeCity?: string;
  age?: number;
  image?: string;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

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
        const response = await axios.get(`${BACKEND_URL}/api/users/me`, {
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
          setImagePreview(`${BACKEND_URL}${response.data.image}`);
        } else {
          setImagePreview(null);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data. Please try again later.');
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
        `${BACKEND_URL}/api/users/me`,
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
      setError(err.response?.data?.message || 'An error occurred while updating your profile.');
    }
  };

  const onDeleteImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({ ...formData, image: '' });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mb-6">
          <a href="/" className="text-blue-600 hover:underline flex items-center">
            <FaHome className="mr-1" />
            Home
          </a>
          <span className="text-gray-500">/</span>
          <span className="text-gray-700">Profile</span>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Profile"
              className="w-32 h-32 object-cover rounded-full mb-4"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">My Profile</h2>
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
        <form className="space-y-6" onSubmit={onSubmit} encType="multipart/form-data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name<span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="firstName"
                  id="firstName"
                  value={formData.firstName}
                  onChange={onChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="mt-1 block w-full text-gray-900 p-2 bg-gray-50 rounded-md">
                  {formData.firstName}
                </div>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name<span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastName"
                  id="lastName"
                  value={formData.lastName}
                  onChange={onChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="mt-1 block w-full text-gray-900 p-2 bg-gray-50 rounded-md">
                  {formData.lastName}
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email<span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={onChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="mt-1 block w-full text-gray-900 p-2 bg-gray-50 rounded-md">
                {formData.email}
              </div>
            )}
          </div>

          {/* New Password */}
          {isEditing && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder="Enter new password if you wish to change it"
                onChange={onChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Home City */}
            <div>
              <label htmlFor="homeCity" className="block text-sm font-medium text-gray-700">
                Home City
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="homeCity"
                  id="homeCity"
                  value={formData.homeCity}
                  onChange={onChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="mt-1 block w-full text-gray-900 p-2 bg-gray-50 rounded-md">
                  {formData.homeCity || 'N/A'}
                </div>
              )}
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Age
              </label>
              {isEditing ? (
                <input
                  type="number"
                  name="age"
                  id="age"
                  value={formData.age || ''}
                  onChange={onChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="mt-1 block w-full text-gray-900 p-2 bg-gray-50 rounded-md">
                  {formData.age || 'N/A'}
                </div>
              )}
            </div>
          </div>

          {/* Profile Image */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Profile Image
            </label>
            <div className="mt-2 flex items-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile Preview"
                  className="w-24 h-24 object-cover rounded-full mr-4"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
              {isEditing && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-white focus:outline-none"
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={onDeleteImage}
                      className="mt-2 flex items-center text-red-600 hover:text-red-800"
                    >
                      <FaTimes className="mr-1" />
                      Remove Image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <div className="mt-1 block w-full text-gray-900 p-2 bg-gray-50 rounded-md">
              {formData.role}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              To change your role, please contact an administrator.
            </p>
          </div>

          {/* Form Buttons */}
          <div className="flex items-center justify-between">
            {isEditing ? (
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-label="Save Changes"
                >
                  <FaSave className="mr-2" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    fetchUserData();
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  aria-label="Cancel"
                >
                  <FaTimes className="mr-2" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                aria-label="Edit Profile"
              >
                <FaEdit className="mr-2" />
                Edit Profile
              </button>
            )}
            <button
              onClick={() => signOut()}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              aria-label="Sign Out"
            >
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
