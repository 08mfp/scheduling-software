import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';

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
  //-----------------------
  // 1) DARK MODE HOOKS
  //-----------------------
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  //-----------------------
  // 2) AUTH & BASIC STATES
  //-----------------------
  const { user, apiKey } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserEditFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [adminSecretKey, setAdminSecretKey] = useState<string>('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
        setError('No API key provided. Please log in with the correct role.');
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

  //-----------------------
  // 3) SEARCH, FILTER, SORT
  //-----------------------
  // (a) Search by firstName
  const [searchQuery, setSearchQuery] = useState<string>('');

  // (b) Role filter
  const [roleFilter, setRoleFilter] = useState<'all' | 'guest' | 'viewer' | 'manager' | 'admin'>('all');

  // (c) Sort by firstName toggles
  const [sortByFirstName, setSortByFirstName] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Memoize the filtered & sorted array
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // 1) Filter by role
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    // 2) Search by firstName
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => u.firstName.toLowerCase().includes(q));
    }

    // 3) Sort by firstName if toggled
    if (sortByFirstName) {
      result.sort((a, b) => {
        const nameA = a.firstName.toLowerCase();
        const nameB = b.firstName.toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, roleFilter, searchQuery, sortByFirstName, sortOrder]);

  //-----------------------
  // 4) HANDLERS
  //-----------------------
  const toggleExpand = (userId: string) => {
    setExpandedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const startEditing = (u: User) => {
    setEditingUserId(u._id);
    setEditFormData({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      homeCity: u.homeCity,
      age: u.age,
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
      const userToEdit = users.find(u => u._id === userId);
      if (!userToEdit) {
        setError('User not found.');
        return;
      }

      // Check if role is being changed
      const isRoleChanged = editFormData.role && editFormData.role !== userToEdit.role;
      if (isRoleChanged && !adminSecretKey) {
        setError('Please enter the admin secret key to change roles.');
        return;
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

      // Update the users state
      setUsers(prev => prev.map(u => (u._id === userId ? response.data.user : u)));

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
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this user? This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, {
        headers: {
          'x-api-key': apiKey || '',
        },
      });

      if (response.status === 200) {
        setUsers(prev => prev.filter(u => u._id !== userId));
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

  //-----------------------
  // 5) EARLY RETURN CHECK
  //-----------------------
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  //-----------------------
  // 6) RENDER
  //-----------------------
  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 
                 flex items-start justify-center py-12 px-4 
                 sm:px-6 lg:px-8 transition-colors duration-300"
    >
      <div className="max-w-6xl w-full">
        {/* Navbar (Breadcrumb + Dark Mode) */}
        <div
          className="flex justify-between items-center mb-8 px-4 py-2 
                     bg-gray-100 dark:bg-gray-800 rounded-md"
        >
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Admin Panel
            </span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 
                       text-gray-800 dark:text-gray-200 rounded-md 
                       hover:bg-gray-300 dark:hover:bg-gray-600 
                       transition-colors duration-200 focus:outline-none 
                       focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <>
                <FaSun className="mr-2" />
                Light Mode
              </>
            ) : (
              <>
                <FaMoon className="mr-2" />
                Dark Mode
              </>
            )}
          </button>
        </div>

        {/* Main Card */}
        <div
          className="bg-white dark:bg-gray-800 shadow-lg 
                     rounded-lg p-8 space-y-8 
                     transition-colors duration-300"
        >
          {/* Title & Short Description */}
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Admin Panel
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              This page allows you to view, edit, and delete users, as well as manage their roles.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-500 mb-4 text-center dark:text-red-400">
              {error}
            </div>
          )}

          {/* Controls: Search, Filter, Sort */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search Input */}
            <div className="flex items-center relative">
              <label className="mr-2 font-semibold flex items-center space-x-2 text-gray-800 dark:text-gray-200">
                <svg
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>Search:</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by first name..."
                className="border border-gray-300 dark:border-gray-600 bg-white 
                           dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                           p-2 rounded w-48 sm:w-64 pr-8 focus:outline-none focus:ring-1 
                           focus:ring-blue-400 dark:focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 
                             text-gray-500 dark:text-gray-400 hover:text-gray-700 
                             dark:hover:text-gray-300 focus:outline-none"
                  aria-label="Clear search"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter by Role */}
            <div>
              <label className="mr-2 font-semibold text-gray-800 dark:text-gray-200">
                Filter by Role:
              </label>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 bg-white 
                           dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                           p-2 rounded focus:outline-none focus:ring-1 
                           focus:ring-blue-400 dark:focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="guest">Guest</option>
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Sort by First Name */}
            <div>
              <button
                onClick={() => {
                  // If already sorting by firstName, toggle order; otherwise enable sort.
                  if (sortByFirstName) {
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortByFirstName(true);
                    setSortOrder('asc');
                  }
                }}
                className="flex items-center px-4 py-2 bg-purple-500 dark:bg-purple-700 
                           text-white rounded hover:bg-purple-600 dark:hover:bg-purple-800 
                           transition-colors duration-200 focus:outline-none focus:ring-2 
                           focus:ring-purple-400 dark:focus:ring-purple-600"
              >
                {sortByFirstName ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {sortOrder === 'asc' ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      )}
                    </svg>
                    Sort by First Name ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Sort by First Name
                  </>
                )}
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 dark:border-gray-700 mt-6">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 
                                 text-left text-gray-600 dark:text-gray-300 font-semibold"
                  >
                    First Name
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 
                                 text-left text-gray-600 dark:text-gray-300 font-semibold"
                  >
                    Last Name
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 
                                 text-left text-gray-600 dark:text-gray-300 font-semibold"
                  >
                    Role
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 
                                 text-left text-gray-600 dark:text-gray-300 font-semibold"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map(u => (
                  <React.Fragment key={u._id}>
                    <tr className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-100">
                        {u.firstName}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-100">
                        {u.lastName}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 capitalize dark:text-gray-100">
                        {u.role}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200 dark:border-gray-700 space-x-2">
                        <button
                          onClick={() => toggleExpand(u._id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded 
                                     hover:bg-blue-600 focus:outline-none 
                                     focus:ring-2 focus:ring-blue-400 transition-colors"
                        >
                          {expandedUserIds.includes(u._id) ? 'Collapse' : 'Expand'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded 
                                     hover:bg-red-600 focus:outline-none 
                                     focus:ring-2 focus:ring-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {expandedUserIds.includes(u._id) && (
                      <tr className="bg-gray-50 dark:bg-gray-700 transition-colors">
                        <td
                          colSpan={4}
                          className="py-4 px-4 border-b border-gray-200 dark:border-gray-700"
                        >
                          {editingUserId === u._id ? (
                            <form
                              className="space-y-4"
                              onSubmit={e => {
                                e.preventDefault();
                                handleEditSubmit(u._id);
                              }}
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    First Name
                                  </label>
                                  <input
                                    type="text"
                                    name="firstName"
                                    value={editFormData.firstName || ''}
                                    onChange={handleEditChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                               rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                               text-gray-800 dark:text-gray-100 focus:outline-none 
                                               focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Last Name
                                  </label>
                                  <input
                                    type="text"
                                    name="lastName"
                                    value={editFormData.lastName || ''}
                                    onChange={handleEditChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                               rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                               text-gray-800 dark:text-gray-100 focus:outline-none 
                                               focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={editFormData.email || ''}
                                    onChange={handleEditChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                               rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                               text-gray-800 dark:text-gray-100 focus:outline-none 
                                               focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Role
                                  </label>
                                  <select
                                    name="role"
                                    value={editFormData.role || ''}
                                    onChange={handleEditChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                               rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                               text-gray-800 dark:text-gray-100 focus:outline-none 
                                               focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="">Select Role</option>
                                    <option value="guest">Guest</option>
                                    <option value="viewer">Viewer</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Home City
                                  </label>
                                  <input
                                    type="text"
                                    name="homeCity"
                                    value={editFormData.homeCity || ''}
                                    onChange={handleEditChange}
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                               rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                               text-gray-800 dark:text-gray-100 focus:outline-none 
                                               focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Age
                                  </label>
                                  <input
                                    type="number"
                                    name="age"
                                    value={editFormData.age !== undefined ? editFormData.age : ''}
                                    onChange={handleEditChange}
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                               rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                               text-gray-800 dark:text-gray-100 focus:outline-none 
                                               focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                {editFormData.role && editFormData.role !== u.role && (
                                  <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Admin Secret Key
                                    </label>
                                    <input
                                      type="password"
                                      value={adminSecretKey}
                                      onChange={e => setAdminSecretKey(e.target.value)}
                                      required
                                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 
                                                 rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 
                                                 text-gray-800 dark:text-gray-100 focus:outline-none 
                                                 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Enter secret key"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-4">
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-green-500 text-white rounded-md 
                                             hover:bg-green-600 focus:outline-none 
                                             focus:ring-2 focus:ring-green-400 
                                             transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="px-4 py-2 bg-gray-500 text-white rounded-md 
                                             hover:bg-gray-600 focus:outline-none 
                                             focus:ring-2 focus:ring-gray-400 
                                             transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="space-y-2 dark:text-gray-100">
                              <p>
                                <strong>Email:</strong> {u.email}
                              </p>
                              <p>
                                <strong>Role:</strong> {u.role}
                              </p>
                              <p>
                                <strong>Home City:</strong> {u.homeCity || 'N/A'}
                              </p>
                              <p>
                                <strong>Age:</strong> {u.age !== undefined ? u.age : 'N/A'}
                              </p>
                              {u.image && (
                                <div>
                                  <img
                                    src={`${API_BASE_URL}${u.image}`}
                                    alt={`${u.firstName} ${u.lastName}`}
                                    className="w-32 h-32 object-cover rounded-full"
                                  />
                                </div>
                              )}
                              <div className="mt-4">
                                <button
                                  onClick={() => startEditing(u)}
                                  className="px-4 py-2 bg-yellow-500 text-white rounded-md 
                                             hover:bg-yellow-600 focus:outline-none 
                                             focus:ring-2 focus:ring-yellow-400 
                                             transition-colors"
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

          {/* Optionally, add a button to create new users */}
          {/*
          <div className="mt-6 flex justify-center">
            <Link to="/admin/users/create">
              <button
                className="px-6 py-3 bg-indigo-600 text-white rounded-md 
                           hover:bg-indigo-700 focus:outline-none 
                           focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Create New User
              </button>
            </Link>
          </div>
          */}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
