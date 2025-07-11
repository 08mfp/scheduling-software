import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import 'flowbite';
import logo from '../assets/Images/logo.png';

const Navbar: React.FC = () => {
  const { user, signOut } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';

  const profileImage = user?.image
    ? `${API_BASE_URL}${user.image}`
    : 'https://flowbite.com/docs/images/people/profile-picture-3.jpg';

  useEffect(() => {
    const applyDarkMode = (prefersDark: boolean) => {
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        console.log('Added "dark" class to <html>');
      } else {
        document.documentElement.classList.remove('dark');
        console.log('Removed "dark" class from <html>');
      }
    };

    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('Prefers dark mode:', prefersDarkMode);
    applyDarkMode(prefersDarkMode);

    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      console.log('System preference changed:', e.matches);
      applyDarkMode(e.matches);
    };

    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange);
    } else {
      darkModeMediaQuery.addListener(handleChange);
    }

    return () => {
      if (darkModeMediaQuery.removeEventListener) {
        darkModeMediaQuery.removeEventListener('change', handleChange);
      } else {
        darkModeMediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return (
    <nav className="w-full bg-white dark:bg-gray-900 border-b-4 border-gray-200 dark:border-gray-700 py-2">
      <div className="-full flex items-center justify-between p-2">
        <Link to="/" className="flex items-center space-x-3">
          <img src={logo} className="h-8" alt="Logo" />
          <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
            Six Nations
          </span>
        </Link>

        <button
          type="button"
          className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
          aria-controls="navbar-menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => {
            setIsMobileMenuOpen(!isMobileMenuOpen);
            console.log('Mobile menu toggle button clicked. Now:', !isMobileMenuOpen);
          }}
        >
          <span className="sr-only">Open main menu</span>
          {isMobileMenuOpen ? (
            <svg
              className="w-6 h-6"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 17 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 1h15M1 7h15M1 13h15"
              />
            </svg>
          )}
        </button>

        <div
          className={`w-full md:flex md:items-center md:w-auto ${isMobileMenuOpen ? 'block' : 'hidden'}`}
          id="navbar-menu"
        >
          <ul className="flex flex-col font-medium md:flex-row md:space-x-6">
            <li>
              <Link
                to="/"
                className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                aria-current="page"
                onClick={() => {
                  console.log('Navigated to Home');
                  setIsMobileMenuOpen(false);
                }}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                aria-current="page"
                onClick={() => {
                  console.log('Navigated to About');
                  setIsMobileMenuOpen(false);
                }}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                to="/fixtures"
                className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                onClick={() => {
                  console.log('Navigated to Fixtures');
                  setIsMobileMenuOpen(false);
                }}
              >
                Fixtures
              </Link>
            </li>
            {user && (
              <>
                {['admin', 'manager', 'viewer'].includes(user.role) && (
                  <>
                    <li>
                      <Link
                        to="/teams"
                        className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                        onClick={() => {
                          console.log('Navigated to Teams');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Teams
                      </Link>
                    </li>
                    {['admin', 'manager'].includes(user.role) && (
                      <li>
                        <Link
                          to="/players"
                          className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                          onClick={() => {
                            console.log('Navigated to Players');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          Players
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        to="/stadiums"
                        className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                        onClick={() => {
                          console.log('Navigated to Stadiums');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Stadiums
                      </Link>
                    </li>
                  </>
                )}
                {user.role === 'admin' && (
                  <li className="relative">
                    <button
                      type="button"
                      className="flex items-center justify-between w-full py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700 focus:outline-none"
                      onClick={() => {
                        setIsAdminMenuOpen(!isAdminMenuOpen);
                        console.log('Admin menu toggle clicked. Now:', !isAdminMenuOpen);
                      }}
                    >
                      Admin Menu
                      <svg
                        className="w-4 h-4 ml-1"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isAdminMenuOpen && (
                      <div className="z-10 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-lg shadow w-48 mt-2 absolute right-0">
                        <ul className="py-2 text-sm text-gray-700 dark:text-gray-300" aria-labelledby="admin-menu-button">
                          <li>
                            <Link
                              to="/generate-fixtures"
                              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                console.log('Navigated to Generate Fixtures');
                                setIsMobileMenuOpen(false);
                                setIsAdminMenuOpen(false);
                              }}
                            >
                              Generate Fixtures
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/manual-fixture-scheduler"
                              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                console.log('Navigated to Manual Fixture Scheduler');
                                setIsMobileMenuOpen(false);
                                setIsAdminMenuOpen(false);
                              }}
                            >
                              Manual Fixture Scheduler
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/admin"
                              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                console.log('Navigated to Admin Panel');
                                setIsMobileMenuOpen(false);
                                setIsAdminMenuOpen(false);
                              }}
                            >
                              Admin Panel
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/teams-ranking"
                              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                console.log('Navigated to Teams Rankings');
                                setIsMobileMenuOpen(false);
                                setIsAdminMenuOpen(false);
                              }}
                            >
                              Team Rankings
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/faq"
                              className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                console.log('Navigated to FAQ');
                                setIsMobileMenuOpen(false);
                                setIsAdminMenuOpen(false);
                              }}
                            >
                              FAQ
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </li>
                )}
              </>
            )}
            <li>
              <Link
                to="/contact"
                className="block py-2 px-3 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 md:hover:bg-transparent md:hover:text-blue-700"
                aria-current="page"
                onClick={() => {
                  console.log('Navigated to Contact');
                  setIsMobileMenuOpen(false);
                }}
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>


        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-2">

              <span className="text-gray-700 dark:text-gray-300 hidden md:block text-xl">
                {user.firstName}
              </span>

              <div className="relative">
                <button
                  type="button"
                  className="flex text-sm bg-gray-800 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    console.log('User menu button clicked. Now:', !isUserMenuOpen);
                  }}
                >
                  <span className="sr-only">Open user menu</span>
                  <img
                    className="w-8 h-8 rounded-full"
                    src={profileImage}
                    alt={`${user.firstName} ${user.lastName}`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="z-10 absolute right-0 mt-2 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-lg shadow w-48">
                    <ul className="py-2 text-sm text-gray-700 dark:text-gray-300" aria-labelledby="user-menu-button">
                      <li className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {user.firstName} {user.lastName}
                      </li>
                      <li>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            console.log('Navigated to Profile');
                            setIsMobileMenuOpen(false);
                            setIsUserMenuOpen(false);
                          }}
                        >
                          Profile
                        </Link>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            console.log('Sign out button clicked');
                            signOut();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3 py-2"
                onClick={() => console.log('Navigated to Sign In')}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-white bg-blue-700 hover:bg-blue-800 rounded-lg px-3 py-2"
                onClick={() => console.log('Navigated to Sign Up')}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
