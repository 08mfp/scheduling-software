// frontend/src/pages/AdminPanel.tsx

import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
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
  const { apiKey } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UserEditFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [adminSecretKey, setAdminSecretKey] = useState<string>(''); // The secret key for role changes

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';

  useEffect(() => {
    const fetchUsers = async () => {
      if (!apiKey) {
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
  }, [apiKey, API_BASE_URL]);

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

  return (
    <div style={styles.container}>
      <h1>Admin Panel</h1>
      {error && <div style={styles.error}>{error}</div>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>First Name</th>
            <th style={styles.th}>Last Name</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <React.Fragment key={user._id}>
              <tr style={styles.tr}>
                <td style={styles.td}>{user.firstName}</td>
                <td style={styles.td}>{user.lastName}</td>
                <td style={styles.td}>{user.role}</td>
                <td style={styles.td}>
                  <button onClick={() => toggleExpand(user._id)} style={styles.button}>
                    {expandedUserIds.includes(user._id) ? 'Collapse' : 'Expand'}
                  </button>
                  <button onClick={() => startEditing(user)} style={styles.button}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteUser(user._id)} style={styles.deleteButton}>
                    Delete
                  </button>
                </td>
              </tr>
              {expandedUserIds.includes(user._id) && (
                <tr>
                  <td colSpan={4} style={styles.expandedTd}>
                    {editingUserId === user._id ? (
                      <form style={styles.editForm} onSubmit={e => { e.preventDefault(); handleEditSubmit(user._id); }}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>First Name:</label>
                          <input
                            type="text"
                            name="firstName"
                            value={editFormData.firstName || ''}
                            onChange={handleEditChange}
                            required
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Last Name:</label>
                          <input
                            type="text"
                            name="lastName"
                            value={editFormData.lastName || ''}
                            onChange={handleEditChange}
                            required
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Email:</label>
                          <input
                            type="email"
                            name="email"
                            value={editFormData.email || ''}
                            onChange={handleEditChange}
                            required
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Role:</label>
                          <select
                            name="role"
                            value={editFormData.role || ''}
                            onChange={handleEditChange}
                            required
                            style={styles.input}
                          >
                            <option value="guest">Guest</option>
                            <option value="viewer">Viewer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Home City:</label>
                          <input
                            type="text"
                            name="homeCity"
                            value={editFormData.homeCity || ''}
                            onChange={handleEditChange}
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Age:</label>
                          <input
                            type="number"
                            name="age"
                            value={editFormData.age !== undefined ? editFormData.age : ''}
                            onChange={handleEditChange}
                            style={styles.input}
                          />
                        </div>
                        {/* Remove image upload fields */}
                        {/* Add password change if needed */}
                        {/* Uncomment the following block if you want admins to change user passwords */}
                        {/* <div style={styles.formGroup}>
                          <label style={styles.label}>Password:</label>
                          <input
                            type="password"
                            name="password"
                            value={editFormData.password || ''}
                            onChange={handleEditChange}
                            style={styles.input}
                            placeholder="Enter new password"
                          />
                        </div> */}
                        {editFormData.role && editFormData.role !== user.role && (
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Admin Secret Key:</label>
                            <input
                              type="password"
                              value={adminSecretKey}
                              onChange={e => setAdminSecretKey(e.target.value)}
                              required
                              style={styles.input}
                              placeholder="Enter secret key"
                            />
                          </div>
                        )}
                        <div style={styles.buttonGroup}>
                          <button type="submit" style={styles.saveButton}>Save</button>
                          <button type="button" onClick={cancelEditing} style={styles.cancelButton}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div style={styles.userDetails}>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Role:</strong> {user.role}</p>
                        <p><strong>Home City:</strong> {user.homeCity || 'N/A'}</p>
                        <p><strong>Age:</strong> {user.age !== undefined ? user.age : 'N/A'}</p>
                        {user.image && (
                          <div style={styles.imageContainer}>
                            <img src={`${API_BASE_URL}${user.image}`} alt="Profile" width="100" />
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {/* Optional: Add functionality to create new users */}
      {/* <button onClick={() => { /* Implement user creation */ /* }} style={styles.createButton}>
        Create New User
      </button> */}
    </div>
  );
};

export default AdminPanel;

// Inline Styles (for simplicity)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  error: {
    color: 'red',
    marginBottom: '15px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    border: '1px solid #dddddd',
    textAlign: 'left',
    padding: '8px',
    backgroundColor: '#f2f2f2',
  },
  tr: {
    borderBottom: '1px solid #dddddd',
  },
  td: {
    border: '1px solid #dddddd',
    textAlign: 'left',
    padding: '8px',
  },
  button: {
    marginRight: '5px',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '5px 10px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  expandedTd: {
    padding: '10px',
    backgroundColor: '#fafafa',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  imageContainer: {
    marginTop: '10px',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup: {
    marginBottom: '10px',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  input: {
    padding: '8px',
    width: '100%',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  createButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#008CBA',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
};
