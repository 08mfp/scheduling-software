import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import { Stadium } from '../interfaces/Stadium';

// Adjust if needed
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const StadiumList: React.FC = () => {
  //----------------------------
  // 1) DARK MODE
  //----------------------------
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
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

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  //----------------------------
  // 2) AUTH & DATA
  //----------------------------
  const { user } = useContext(AuthContext);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [error, setError] = useState<string | null>(null);

  //----------------------------
  // 3) LOADING
  //----------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDelayComplete, setLoadingDelayComplete] = useState<boolean>(false);

  //----------------------------
  // 4) SEARCH
  //----------------------------
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Debounce effect for immediate but controlled search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  //----------------------------
  // 5) FETCH STADIUMS (2s MIN)
  //----------------------------
  useEffect(() => {
    const fetchStadiums = async () => {
      const startTime = Date.now();
      setLoading(true);

      try {
        const response = await axios.get<Stadium[]>(`${BACKEND_URL}/api/stadiums`);
        setStadiums(response.data);
      } catch (err) {
        console.error('Error fetching stadiums:', err);
        setError('Failed to load stadiums.');
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = 2000 - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            setLoadingDelayComplete(true);
            setLoading(false);
          }, remaining);
        } else {
          setLoadingDelayComplete(true);
          setLoading(false);
        }
      }
    };

    // Call unconditionally. The user’s role check is below.
    fetchStadiums();
  }, []);

  //----------------------------
  // 6) useMemo FILTER
  //----------------------------
  const filteredStadiums = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return stadiums;

    return stadiums.filter((stadium) => {
      const name = stadium.stadiumName.toLowerCase();
      const city = stadium.stadiumCity?.toLowerCase() || '';
      const country = stadium.stadiumCountry?.toLowerCase() || '';

      return name.includes(q) || city.includes(q) || country.includes(q);
    });
  }, [stadiums, debouncedSearchQuery]);

  //----------------------------
  // 7) DELETE HANDLER
  //----------------------------
  const handleDelete = (stadiumId: string) => {
    if (window.confirm('Are you sure you want to delete this stadium?')) {
      axios
        .delete(`${BACKEND_URL}/api/stadiums/${stadiumId}`)
        .then(() => {
          // Remove stadium from local state
          setStadiums((prev) => prev.filter((s) => s._id !== stadiumId));
        })
        .catch((error) => {
          console.error('Error deleting stadium:', error);
        });
    }
  };

  //----------------------------
  // 8) EARLY RETURN: UNAUTHORIZED
  //----------------------------
  // Important: We do this AFTER all Hooks (including useMemo) are declared
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  //----------------------------
  // 9) LOADING SKELETON
  //----------------------------
  const showSkeleton = loading || !loadingDelayComplete;

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-6">
      {/* Search Bar Skeleton */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="h-8 w-48 bg-gray-300 rounded"></div>
      </div>

      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-32 bg-gray-300 rounded"></div>
        <div className="h-8 w-36 bg-gray-300 rounded"></div>
      </div>

      {/* Stadiums List Skeleton */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-lg p-4 bg-gray-50 transition-colors duration-300 mb-2"
        >
          <div className="h-4 w-1/2 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 w-1/4 bg-gray-300 rounded mb-2"></div>
          <div className="h-8 w-24 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
  );

  //----------------------------
  // 10) ERROR / SKELETON / RENDER
  //----------------------------
  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-6xl w-full">
          {/* Navbar */}
          <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
            <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
              <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <FaInfoCircle className="mr-1" />
                Home
              </Link>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Stadiums</span>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                         rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 
                         focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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

          {/* Main Card + Skeleton */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
            {renderSkeleton()}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-6xl w-full">
          {/* Navbar */}
          <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
            <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
              <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <FaInfoCircle className="mr-1" />
                Home
              </Link>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Stadiums</span>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 
                         text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 
                         dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none 
                         focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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

          {/* Error Card */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
            <div className="text-center text-red-500 py-10">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Finally, the real content
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 
                    flex items-start justify-center py-12 px-4 
                    sm:px-6 lg:px-8 transition-colors duration-300"
    >
      <div className="max-w-6xl w-full">
        {/* Navbar */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 
                        bg-gray-100 dark:bg-gray-800 rounded-md"
        >
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Stadiums</span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 
                       text-gray-800 dark:text-gray-200 rounded-md 
                       hover:bg-gray-300 dark:hover:bg-gray-600 
                       transition-colors duration-200 focus:outline-none 
                       focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 space-y-8 transition-colors duration-300">
          {/* Search */}
          <div className="flex items-center relative mb-6">
            <label className="mr-2 font-semibold flex items-center space-x-2 text-gray-800 dark:text-gray-200">
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search:</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stadiums..."
              className="border border-gray-300 dark:border-gray-600 bg-white 
                         dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                         p-2 rounded w-48 sm:w-64 pr-8"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Stadiums</h2>
            {user.role === 'admin' && (
              <Link to="/stadiums/add">
                <button className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md 
                                   hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none 
                                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                >
                  Add New Stadium
                </button>
              </Link>
            )}
          </div>

          {/* Stadium List */}
          <div className="space-y-6">
            {filteredStadiums.map((stadium) => (
              <div
                key={stadium._id}
                className="border border-gray-200 dark:border-gray-600 
                           rounded-lg p-4 flex flex-col sm:flex-row 
                           sm:justify-between sm:items-center 
                           bg-gray-50 dark:bg-gray-700 transition-colors duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link to={`/stadiums/${stadium._id}`}>
                    <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      {stadium.stadiumName}
                    </h3>
                  </Link>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>Location:</strong> {stadium.stadiumCity}, {stadium.stadiumCountry}
                  </p>
                </div>
                {user.role === 'admin' && (
                  <div className="mt-4 sm:mt-0 flex space-x-2">
                    <Link to={`/stadiums/edit/${stadium._id}`}>
                      <button
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md 
                                   hover:bg-yellow-600 focus:outline-none 
                                   focus:ring-2 focus:ring-yellow-400"
                      >
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(stadium._id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 
                                 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredStadiums.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400">
                No stadiums found. Please add a new stadium.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StadiumList;
