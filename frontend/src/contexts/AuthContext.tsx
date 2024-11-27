// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
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
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  apiKey: null,
  loading: true, 
  signIn: async () => {},
  signOut: () => {},
  signUp: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user and apiKey from localStorage on mount
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

      // Fetch user details
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
      // Verify secret code for Manager/Admin roles
      if ((role === 'manager' || role === 'admin') && secretCode !== 'SECRET_CODE') {
        throw new Error('Invalid secret code for the selected role');
      }

      await axios.post('http://localhost:5003/api/users/register', {
        firstName,
        lastName,
        email,
        password,
        role,
      });

      // Automatically sign in the user after registration
      await signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, apiKey, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};
