// src/components/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSun, FaMoon } from 'react-icons/fa';
import '@fontsource/poppins';
import '@fontsource/inter';
import homeImageDark from '../assets/Images/home.png'; // Dark mode image
import homeImageLight from '../assets/Images/home-light.png'; // Light mode image

const HomePage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col transition-colors duration-300">
      {/* Dark Mode Toggle Button */}
      <header className="flex justify-end p-6">
        <button
          onClick={toggleDarkMode}
          className="text-yellow-400 dark:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-300 rounded transition-colors duration-300"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <FaMoon size={28} /> : <FaSun size={28} />}
        </button>
      </header>

      <main className="flex-grow">
        {/* Homepage Banner */}
        <section className="relative flex flex-col items-center justify-center text-center text-black dark:text-white h-[80vh] sm:h-[70vh] bg-white dark:bg-black px-4">
          {/* Rugby Player Silhouettes */}
          <img
            src={isDarkMode ? homeImageDark : homeImageLight}
            alt="Rugby Players"
            className="absolute bottom-0 left-0 right-0 mx-auto w-3/4 sm:w-2/3 md:w-1/2 opacity-25 dark:opacity-20" // Increased size and adjusted opacity
            loading="lazy"
          />

          <div className="relative z-10 px-6">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-poppins">
              Stay Ahead in Rugby: Everything Six Nations at Your Fingertips.
            </h1>
            <p className="text-xl md:text-3xl mb-10 font-inter">
              Join our community to get exclusive updates and insights.
            </p>
            <Link to="/signup">
              <button className="bg-yellow-400 dark:bg-yellow-500 text-black dark:text-white px-8 py-4 rounded-md hover:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors duration-300 text-lg md:text-xl">
                SIGN UP NOW
              </button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
