// frontend/src/pages/AdminPanel.tsx

import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Link, Navigate } from 'react-router-dom';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  homeCity?: string;
  age?: number;
  image?: string;
}

interface UserEditFormData extends Partial<User> {}

const AdminPanel: React.FC = () => {
  const { user, apiKey } = useContext(AuthContext); // Ensure 'user' is destructured
  const [users, setUsers] = useState<User[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserEditFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [adminSecretKey, setAdminSecretKey] = useState<string>(''); // The secret key for role changes

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
        setError('No API key provided. Please log in as an admin.');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
          headers: { 'x-api-key': apiKey },
        });
        setUsers(response.data.users);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        setError(error.response?.data?.message || 'Failed to fetch users.');
      }
    };

    fetchUsers();
  }, [user, apiKey, API_BASE_URL]);

  const toggleExpand = (userId: string) => {
    setExpandedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const startEditing = (user: User) => {
    setEditingUserId(user._id);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      homeCity: user.homeCity,
      age: user.age,
      // No image field since upload is removed
    });
    setAdminSecretKey('');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditFormData({});
    setAdminSecretKey('');
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? Number(value) : value,
    }));
  };

  const handleEditSubmit = async (userId: string) => {
    try {
      const userToEdit = users.find(user => user._id === userId);
      if (!userToEdit) {
        setError('User not found.');
        return;
      }

      // Check if role is being changed
      const isRoleChanged = editFormData.role && editFormData.role !== userToEdit.role;

      if (isRoleChanged) {
        if (!adminSecretKey) {
          setError('Please enter the admin secret key to change roles.');
          return;
        }
      }

      const data: { 
        firstName: string; 
        lastName: string; 
        email: string; 
        role: string; 
        homeCity: string; 
        age: number | null; 
        secretCode?: string; 
      } = {
        firstName: editFormData.firstName || '',
        lastName: editFormData.lastName || '',
        email: editFormData.email || '',
        role: editFormData.role || '',
        homeCity: editFormData.homeCity || '',
        age: editFormData.age !== undefined ? editFormData.age : null,
      };

      // Include secret key if role is being changed
      if (isRoleChanged) {
        data.secretCode = adminSecretKey;
      }

      const response = await axios.put(`${API_BASE_URL}/api/admin/users/${userId}`, data, {
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
      });

      // Update the users state with the updated user
      setUsers(prevUsers =>
        prevUsers.map(user => (user._id === userId ? response.data.user : user))
      );

      setEditingUserId(null);
      setEditFormData({});
      setAdminSecretKey('');
      setError(null);
      alert('User updated successfully.');
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this user? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, {
        headers: {
          'x-api-key': apiKey || '',
        },
      });

      if (response.status === 200) {
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        setError(null);
        alert('User deleted successfully.');
      } else {
        setError('Failed to delete user.');
        console.error('Unexpected response status:', response.status);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (error.response) {
        setError(`Error: ${error.response.data.message || 'Failed to delete user.'}`);
      } else if (error.request) {
        setError('No response from server. Please try again later.');
      } else {
        setError(`Error: ${error.message}`);
      }
    }
  };

  // Correct Authorization Check: Use 'user.role' instead of 'apiKey'
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full bg-white shadow-md rounded-lg p-8">
        <h1 className="text-4xl font-bold mb-6 text-center">Admin Panel</h1>
        {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b border-gray-200 text-left text-gray-600 font-semibold">First Name</th>
                <th className="py-2 px-4 border-b border-gray-200 text-left text-gray-600 font-semibold">Last Name</th>
                <th className="py-2 px-4 border-b border-gray-200 text-left text-gray-600 font-semibold">Role</th>
                <th className="py-2 px-4 border-b border-gray-200 text-left text-gray-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <React.Fragment key={user._id}>
                  <tr className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b border-gray-200">{user.firstName}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{user.lastName}</td>
                    <td className="py-2 px-4 border-b border-gray-200 capitalize">{user.role}</td>
                    <td className="py-2 px-4 border-b border-gray-200 space-x-2">
                      <button
                        onClick={() => toggleExpand(user._id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {expandedUserIds.includes(user._id) ? 'Collapse' : 'Expand'}
                      </button>
                      {/* Remove the "Edit" button from the main row */}
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expandedUserIds.includes(user._id) && (
                    <tr>
                      <td colSpan={4} className="py-4 px-4 border-b border-gray-200">
                        {editingUserId === user._id ? (
                          <form
                            className="space-y-4"
                            onSubmit={e => { e.preventDefault(); handleEditSubmit(user._id); }}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                  type="text"
                                  name="firstName"
                                  value={editFormData.firstName || ''}
                                  onChange={handleEditChange}
                                  required
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                  type="text"
                                  name="lastName"
                                  value={editFormData.lastName || ''}
                                  onChange={handleEditChange}
                                  required
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                  type="email"
                                  name="email"
                                  value={editFormData.email || ''}
                                  onChange={handleEditChange}
                                  required
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                  name="role"
                                  value={editFormData.role || ''}
                                  onChange={handleEditChange}
                                  required
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select Role</option>
                                  <option value="guest">Guest</option>
                                  <option value="viewer">Viewer</option>
                                  <option value="manager">Manager</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Home City</label>
                                <input
                                  type="text"
                                  name="homeCity"
                                  value={editFormData.homeCity || ''}
                                  onChange={handleEditChange}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Age</label>
                                <input
                                  type="number"
                                  name="age"
                                  value={editFormData.age !== undefined ? editFormData.age : ''}
                                  onChange={handleEditChange}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              {/* Add Admin Secret Key if Role is Being Changed */}
                              {editFormData.role && editFormData.role !== user.role && (
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Admin Secret Key</label>
                                  <input
                                    type="password"
                                    value={adminSecretKey}
                                    onChange={e => setAdminSecretKey(e.target.value)}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter secret key"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-4">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-2">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Role:</strong> {user.role}</p>
                            <p><strong>Home City:</strong> {user.homeCity || 'N/A'}</p>
                            <p><strong>Age:</strong> {user.age !== undefined ? user.age : 'N/A'}</p>
                            {user.image && (
                              <div>
                                <img
                                  src={`${API_BASE_URL}${user.image}`}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="w-32 h-32 object-cover rounded-full"
                                />
                              </div>
                            )}
                            {/* Add "Edit" button inside the expanded view */}
                            <div className="mt-4">
                              <button
                                onClick={() => startEditing(user)}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {/* Optional: Add functionality to create new users */}
        {/* <div className="mt-6 flex justify-center">
          <Link to="/admin/users/create">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Create New User
            </button>
          </Link>
        </div> */}
      </div>
    </div>
  );
};

export default AdminPanel;
