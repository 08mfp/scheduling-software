import React, { useEffect, useState } from 'react';
import {
  FaUsers,
  FaInfoCircle,
  FaCode,
  FaSun,
  FaMoon,
  FaFootballBall,
  FaGlobe,
  FaHistory,
  FaUserAlt,
  FaHeart,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import founderImage from '../assets/Images/founder.png';

const About: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Skeleton Components
  const SkeletonIntroduction = () => (
    <div className="text-center space-y-4">
      <div className="h-12 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-4 w-5/6 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-4 w-2/3 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
    </div>
  );

  const SkeletonFeatureGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-4 animate-pulse"
        >
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="h-6 w-1/2 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="h-4 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 w-5/6 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      ))}
    </div>
  );

  const SkeletonMeetTeam = () => (
    <div className="text-center space-y-4">
      <div className="h-8 w-1/3 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-24 w-24 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto"></div>
      <div className="h-6 w-1/4 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
    </div>
  );

  const SkeletonContact = () => (
    <div className="text-center space-y-4">
      <div className="h-8 w-40 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-6 w-2/3 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
      <div className="h-10 w-24 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
    </div>
  );

  // Loading Skeleton Wrapper
  const renderSkeleton = () => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl w-full">
        {/* Navbar */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">About</span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 
                       dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 
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

        {/* Main Content Skeleton */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300 animate-pulse">
          <SkeletonIntroduction />
          <SkeletonFeatureGrid />
          <SkeletonMeetTeam />
          <SkeletonContact />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl w-full">
        {/* Navbar */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">About</span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 
                       dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 
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

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
          {/* About Section */}
          {/* <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
              About Us
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Welcome to your ultimate Six Nations scheduling hub! Stay informed, connected,
              and engaged with everything related to the Six Nations Rugby Tournament.
            </p>
          </div> */}
                        <div className="text-center">
          <h1
            className="font-extrabold text-gray-900 dark:text-gray-100 mb-2"
            style={{ fontSize: '34px' }}
          >
            About Us
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mb-2"
            style={{ fontSize: '16px' }}
          >
            Welcome to your ultimate Six Nations scheduling hub! Stay informed, connected,
            and engaged with everything related to the Six Nations Rugby Tournament.
          </p>
          <br />
        </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300">
              <div className="flex items-center mb-4">
                <FaFootballBall className="text-2xl text-red-600 dark:text-red-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Live Fixtures & Results
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Keep track of the latest fixtures, match schedules, and past scores.
                Never miss a moment of the action!
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300">
              <div className="flex items-center mb-4">
                <FaUsers className="text-2xl text-blue-600 dark:text-blue-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Team Insights
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Dive into detailed information about all six teams, including player stats,
                world rankings, more!
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300">
              <div className="flex items-center mb-4">
                <FaGlobe className="text-2xl text-green-600 dark:text-green-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Stadium Data
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Explore the iconic stadiums hosting the games, complete with an interactive map.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300">
              <div className="flex items-center mb-4">
                <FaHistory className="text-2xl text-yellow-600 dark:text-yellow-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Past Results
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Relive the unforgettable moments of previous tournaments with
                past records and results.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300">
              <div className="flex items-center mb-4">
                <FaUserAlt className="text-2xl text-purple-600 dark:text-purple-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Player Data
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Stay updated with player profiles, stats, and 
                performances throughout the tournament.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300">
              <div className="flex items-center mb-4">
                <FaHeart className="text-2xl text-pink-600 dark:text-pink-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Fan Engagement
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Our platform is designed with rugby fans in mind, providing an
                interactive and user-friendly experience to keep you informed and
                engaged with your favorite teams and matches.
              </p>
            </div>
          </div>

          {/* Meet the Founder */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              Meet the Founder
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md inline-block">
              <img
                src={founderImage}
                alt="Mohamed Farid"
                className="w-24 h-24 mx-auto rounded-full object-cover mb-4"
                loading="lazy"
              />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Mohamed Farid
              </h3>
              {/* <p className="text-gray-600 dark:text-gray-300">CEO, CFO, CTO, COO</p> */}
              <p className="text-gray-700 dark:text-gray-300">
                Computer Science student at The University of Manchester.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Have questions or feedback? We're here to help.
            </p>
            <Link to="/contact">
              <button
                className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white 
                           rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 
                           transition-colors duration-200 flex items-center 
                           justify-center mx-auto"
              >
                <FaInfoCircle className="mr-2" />
                Contact Us
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
