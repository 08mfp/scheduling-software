import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';
import { Stadium } from '../interfaces/Stadium';
import ConfirmModal from './ConfirmModal';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';
const StadiumList: React.FC = () => {

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


  const { user } = useContext(AuthContext);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDelayComplete, setLoadingDelayComplete] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    fetchStadiums();
  }, []);

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


  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);
  const [stadiumToDelete, setStadiumToDelete] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const openConfirmModal = (stadiumId: string) => {
    setStadiumToDelete(stadiumId);
    setModalState('confirm');
  };

  const handleConfirmDelete = () => {
    if (!stadiumToDelete) return;
    setModalState('loading');

    setTimeout(() => {
      axios
        .delete(`${BACKEND_URL}/api/stadiums/${stadiumToDelete}`)
        .then(() => {
          setStadiums((prev) => prev.filter((s) => s._id !== stadiumToDelete));
          setModalState('success');
        })
        .catch((err) => {
          console.error('Error deleting stadium:', err);
          setModalState('error');
        });
    }, 3000);
  };

  const closeModal = () => {
    setModalState(null);
    setStadiumToDelete(null);
    setCountdown(10);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };

  const handleRetry = () => {
    handleConfirmDelete();
  };

  useEffect(() => {
    if (modalState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            closeModal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [modalState]);

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const showSkeleton = loading || !loadingDelayComplete;

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="flex items-center space-x-4">
          <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-36 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
  
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 transition-colors duration-300 mb-2"
        >
          <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-3 w-1/4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      ))}
    </div>
  );

  if (showSkeleton) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-6xl w-full">
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
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
            <div className="text-center text-red-500 py-10">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 
                    flex items-start justify-center py-12 px-4 
                    sm:px-6 lg:px-8 transition-colors duration-300"
    >
      <div className="max-w-6xl w-full">
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

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 space-y-8 transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Stadiums
            </h2>

            <div className="flex items-center space-x-4">
              <div className="relative flex items-center">
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stadiums..."
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded w-48 sm:w-64 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
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

              {user.role === 'admin' && (
                <Link to="/stadiums/add">
                  <button className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600">
                    Add New Stadium
                  </button>
                </Link>
              )}
            </div>
          </div>

          <div className="text-left">
            <p
              className="text-gray-600 dark:text-gray-300 mb-2"
              style={{ fontSize: '16px' }}
            >
              This page allows you to explore and navigate stadiums, providing comprehensive details on location, capacity, and more.
            </p>
            <br />
            <p
              className="text-sm text-gray-500 dark:text-gray-400 italic"
              style={{ fontSize: '12px' }}
            >
              Note: All information is presented for reference and may be updated or corrected at any time.
            </p>
            <br/>
          </div>

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
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600">
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => openConfirmModal(stadium._id)}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
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

      <ConfirmModal
        isOpen={modalState !== null}
        type={modalState || 'confirm'}
        title={
          modalState === 'confirm'
            ? 'Confirm Deletion'
            : modalState === 'loading'
            ? 'Processing...'
            : modalState === 'success'
            ? 'Deleted Successfully'
            : 'Deletion Failed'
        }
        message={
          modalState === 'confirm'
            ? 'Are you sure you want to delete this stadium? This action cannot be undone.'
            : modalState === 'loading'
            ? 'Deleting the stadium... Please wait.'
            : modalState === 'success'
            ? 'The stadium has been deleted successfully.'
            : 'Failed to delete the stadium. Please try again.'
        }
        countdown={modalState === 'success' ? countdown : undefined}
        onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
        onCancel={
          modalState === 'success'
            ? () => {
                closeModal();
              }
            : closeModal
        }
        onRetry={modalState === 'error' ? handleRetry : undefined}
      />
    </div>
  );
};

export default StadiumList;
