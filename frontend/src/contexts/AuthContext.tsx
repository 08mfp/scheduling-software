/**
 * @module frontend/src/contexts/AuthContext
 * @description This file defines the AuthContext, which provides user authentication and authorization functionality to the application.
 * @api frontend/src/contexts/AuthContext (private)
 * @version 1.0.0
 * @authors github.com/08mfp
 */
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  homeCity?: string;
  age?: number;
  image?: string;
}

interface AuthContextProps {
  user: User | null;
  apiKey: string | null;
  loading: boolean; 
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role: string,
    secretCode?: string
  ) => Promise<void>;
  updateUser: (userData: User) => void;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  apiKey: null,
  loading: true, 
  signIn: async () => {},
  signOut: () => {},
  signUp: async () => {},
  updateUser: () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load thje user and apiKey from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedApiKey = localStorage.getItem('apiKey');
    if (storedUser && storedApiKey) {
      setUser(JSON.parse(storedUser));
      setApiKey(storedApiKey);
      axios.defaults.headers.common['x-api-key'] = storedApiKey;
    }
    setLoading(false); 
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:5003/api/users/login', {
        email,
        password,
      });
      const { apiKey } = response.data;

      const userResponse = await axios.get('http://localhost:5003/api/users/me', {
        headers: { 'x-api-key': apiKey },
      });

      setUser(userResponse.data);
      setApiKey(apiKey);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      localStorage.setItem('apiKey', apiKey);
      axios.defaults.headers.common['x-api-key'] = apiKey;
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const signOut = () => {
    setUser(null);
    setApiKey(null);
    localStorage.removeItem('user');
    localStorage.removeItem('apiKey');
    delete axios.defaults.headers.common['x-api-key'];
  };

  const signUp = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role: string,
    secretCode?: string
  ) => {
    try {
      if ((role === 'manager' || role === 'admin') && secretCode !== 'SECRET_CODE') { //? THIS IS THE SECRET CODE BEING UISED IN ADMIN PANEL AND IN SIGN UP. CHANGE THIS MAYBE TO ENV VARIABLE and add to .env file
        throw new Error('Invalid secret code for the selected role'); //! THW SECRET CODE IS SECRET_CODE
      }
      await axios.post('http://localhost:5003/api/users/register', {
        firstName,
        lastName,
        email,
        password,
        role,
      });

      await signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, apiKey, loading, signIn, signOut, signUp, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
