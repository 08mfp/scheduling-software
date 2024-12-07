// frontend/src/components/FixtureDetail.tsx

import React, {
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaRedo,
  FaCube,
  FaMap,
  FaSun,
  FaMoon,
} from 'react-icons/fa';
import ConfirmModal from './ConfirmModal'; 
import RankBadge from './RankBadge';
import StadiumMap, { StadiumMapRef } from './StadiumMap';

import { Fixture } from '../interfaces/Fixture';
import { Team } from '../interfaces/Team';

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:5003';

const FixtureDetail: React.FC = () => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [teamMap, setTeamMap] = useState<{ [key: string]: Team }>({});
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [modalState, setModalState] = useState<'confirm' | 'loading' | 'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  const [tooltip, setTooltip] = useState<{
    message: string;
    visible: boolean;
    position: { x: number; y: number };
  }>({ message: '', visible: false, position: { x: 0, y: 0 } });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/streets-v11');
  const [is3D, setIs3D] = useState<boolean>(false);

  const stadiumMapRef = useRef<StadiumMapRef>(null);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now();
      try {
        const fixtureResponse = await axios.get<Fixture>(
          `${BACKEND_URL}/api/fixtures/${id}`
        );
        setFixture(fixtureResponse.data);

        const teamIds = [
          fixtureResponse.data.homeTeam._id,
          fixtureResponse.data.awayTeam._id,
        ];

        const teamsResponse = await axios.get<Team[]>(
          `${BACKEND_URL}/api/teams`,
          {
            params: { ids: teamIds.join(',') },
          }
        );
        const fetchedTeamMap: { [key: string]: Team } = {};
        teamsResponse.data.forEach((team) => {
          fetchedTeamMap[team._id] = team;
        });
        setTeamMap(fetchedTeamMap);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load fixture details.');
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = 3000 - elapsed;
        if (remaining > 0) {
          setTimeout(() => setIsLoading(false), remaining);
        } else {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (modalState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            navigate('/fixtures');
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
  }, [modalState, navigate]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const deleteFixture = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/fixtures/${id}`);
      setModalState('success');
    } catch (err) {
      console.error('Error deleting fixture:', err);
      setModalState('error');
    }
  };

  const openConfirmModal = () => setModalState('confirm');
  const closeModal = () => {
    setModalState(null);
    setCountdown(5);
  };
  const handleConfirmDelete = () => {
    setModalState('loading');
    setTimeout(() => {
      deleteFixture();
    }, 2000);
  };
  const handleRetry = () => {
    setModalState('loading');
    setTimeout(() => {
      deleteFixture();
    }, 2000);
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const getTeamColor = (
    teamName: string
  ): { backgroundColor: string; textColor: string } => {
    switch (teamName) {
      case 'England':
        return { backgroundColor: '#FFFFFF', textColor: '#000000' };
      case 'France':
        return { backgroundColor: '#2563EB', textColor: '#FFFFFF' };
      case 'Ireland':
        return { backgroundColor: '#16A34A', textColor: '#FFFFFF' };
      case 'Scotland':
        return { backgroundColor: '#1D4ED8', textColor: '#FFFFFF' };
      case 'Italy':
        return { backgroundColor: '#3B82F6', textColor: '#FFFFFF' };
      case 'Wales':
        return { backgroundColor: '#DC2626', textColor: '#FFFFFF' };
      default:
        return { backgroundColor: '#6B7280', textColor: '#FFFFFF' };
    }
  };

  const isValidCoordinate = (lat: number, lng: number): boolean => {
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    return true;
  };

  const handleMapStyleToggle = () => {
    const newStyle =
      mapStyle === 'mapbox://styles/mapbox/streets-v11'
        ? 'mapbox://styles/mapbox/satellite-v9'
        : 'mapbox://styles/mapbox/streets-v11';
    setMapStyle(newStyle);
  };

  const toggle3D = () => {
    setIs3D((prev) => !prev);
  };

  const recenterMap = () => {
    stadiumMapRef.current?.recenterMap();
  };

  const showTooltip = (message: string, x: number, y: number) => {
    setTooltip({ message, visible: true, position: { x, y } });
    setTimeout(() => {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }, 2000);
  };

  const renderSkeleton = () => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8 animate-pulse">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 w-1/4 rounded"></div>
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 w-24 rounded"></div>
          <div className="h-6 bg-gray-300 dark:bg-gray-700 w-48 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 w-32 rounded"></div>
        </div>
        <div className="flex flex-col items-center mb-4 space-y-4">
          <div className="flex items-center space-x-6">
            <div className="h-40 w-80 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 w-8 rounded"></div>
            <div className="h-40 w-80 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
        <div className="flex justify-center mb-8">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md w-full max-w-3xl flex flex-col items-center space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-20 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 w-24 rounded"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 w-32 rounded"></div>
          </div>
        </div>
        <div className="mt-8">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 w-40 mb-4 rounded"></div>
          <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-300 dark:bg-gray-700 rounded-lg shadow-md"></div>
        </div>
        {user?.role === 'admin' && (
          <div className="mt-10 flex justify-center gap-4">
            <div className="h-10 bg-gray-300 dark:bg-gray-700 w-32 rounded"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-700 w-32 rounded"></div>
          </div>
        )}
      </div>
    </div>
  );

  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-center text-gray-500 dark:text-gray-400">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div
          className="bg-red-100 dark:bg-red-800 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded relative max-w-md text-center"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              const fetchData = async () => {
                const startTime = Date.now();
                try {
                  const fixtureResponse = await axios.get<Fixture>(
                    `${BACKEND_URL}/api/fixtures/${id}`
                  );
                  setFixture(fixtureResponse.data);

                  const teamIds = [
                    fixtureResponse.data.homeTeam._id,
                    fixtureResponse.data.awayTeam._id,
                  ];

                  const teamsResponse = await axios.get<Team[]>(
                    `${BACKEND_URL}/api/teams`,
                    {
                      params: { ids: teamIds.join(',') },
                    }
                  );
                  const fetchedTeamMap: { [key: string]: Team } = {};
                  teamsResponse.data.forEach((team) => {
                    fetchedTeamMap[team._id] = team;
                  });
                  setTeamMap(fetchedTeamMap);
                } catch (err) {
                  console.error('Error fetching data:', err);
                  setError('Failed to load fixture details.');
                } finally {
                  const elapsed = Date.now() - startTime;
                  const remaining = 5000 - elapsed;
                  if (remaining > 0) {
                    setTimeout(() => setIsLoading(false), remaining);
                  } else {
                    setIsLoading(false);
                  }
                }
              };
              fetchData();
            }}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return renderSkeleton();
  }

  if (!fixture) {
    return null; 
  }

  const homeTeam = teamMap[fixture.homeTeam._id];
  const awayTeam = teamMap[fixture.awayTeam._id];
  const homeTeamStyle = homeTeam
    ? getTeamColor(homeTeam.teamName)
    : getTeamColor('Default');
  const awayTeamStyle = awayTeam
    ? getTeamColor(awayTeam.teamName)
    : getTeamColor('Default');

  const homeStadium = homeTeam?.stadium;
  let isCoordinateValid = false;

  if (homeStadium && homeStadium.latitude && homeStadium.longitude) {
    const lat = Number(homeStadium.latitude);
    const lng = Number(homeStadium.longitude);
    isCoordinateValid = isValidCoordinate(lat, lng);
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-10 space-y-8 transition-colors duration-300">
        
        {/* Breadcrumb and Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav
            className="flex items-center space-x-2"
            aria-label="Breadcrumb"
          >
            <Link
              to="/fixtures"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaArrowLeft className="mr-1" />
              Fixtures
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Fixture Details
            </span>
          </nav>

          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                       rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 
                       focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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

        {/* Date Information */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md w-full max-w-3xl">
            <div className="flex flex-col items-center space-y-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Date
              </span>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {new Date(fixture.date).toLocaleDateString()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(fixture.date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        
        {/* Team Cards */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center space-x-6">
            {/* Home Team Card */}
            <Link
              to={`/teams/${homeTeam?._id}`}
              className="flex flex-col items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md w-80 transform hover:scale-105 transition-transform duration-200 relative"
              style={{
                backgroundColor: homeTeamStyle.backgroundColor,
                color: homeTeamStyle.textColor,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  homeTeam?.teamName || fixture.homeTeam.teamName,
                  e.clientX,
                  e.clientY
                )
              }
            >
              <img
                src={`${BACKEND_URL}${
                  homeTeam?.image || '/images/default-home-team-logo.png'
                }`}
                alt={`${homeTeam?.teamName} Logo`}
                className="w-24 h-24 mb-2 object-contain"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/images/default-home-team-logo.png';
                }}
              />
              <span className="font-semibold text-lg">
                {homeTeam ? homeTeam.teamName : fixture.homeTeam.teamName}
              </span>
              {/* RankBadge */}
              <RankBadge rank={homeTeam ? homeTeam.teamRanking : 'N/A'} />
            </Link>

            {/* VS Symbol */}
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              vs
            </span>

            {/* Away Team Card */}
            <Link
              to={`/teams/${awayTeam?._id}`}
              className="flex flex-col items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md w-80 transform hover:scale-105 transition-transform duration-200 relative"
              style={{
                backgroundColor: awayTeamStyle.backgroundColor,
                color: awayTeamStyle.textColor,
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  awayTeam?.teamName || fixture.awayTeam.teamName,
                  e.clientX,
                  e.clientY
                )
              }
            >
              <img
                src={`${BACKEND_URL}${
                  awayTeam?.image || '/images/default-away-team-logo.png'
                }`}
                alt={`${awayTeam?.teamName} Logo`}
                className="w-24 h-24 mb-2 object-contain"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/images/default-away-team-logo.png';
                }}
              />
              <span className="font-semibold text-lg">
                {awayTeam ? awayTeam.teamName : fixture.awayTeam.teamName}
              </span>
              {/* RankBadge */}
              <RankBadge rank={awayTeam ? awayTeam.teamRanking : 'N/A'} />
            </Link>
          </div>
        </div>


        {/* Score */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Score</h2>
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md w-full max-w-3xl flex flex-col items-center">
            {fixture.homeTeamScore != null && fixture.awayTeamScore != null ? (
              <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {fixture.homeTeamScore} - {fixture.awayTeamScore}
              </span>
            ) : (
              <span className="text-xl text-gray-500 dark:text-gray-400">
                No score available
              </span>
            )}
          </div>
        </div>

        {/* Season, Round, Location, Stadium Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Season
            </h3>
            <p className="text-xl text-gray-800 dark:text-gray-200 text-center">
              {fixture.season}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Round
            </h3>
            <p className="text-xl text-gray-800 dark:text-gray-200 text-center">
              {fixture.round}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
              Location
            </h3>
            <p className="text-xl text-gray-800 dark:text-gray-200 text-center">
              {fixture.location}
            </p>
          </div>

          {homeStadium && homeStadium.stadiumName && (
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
                Stadium
              </h3>
                <Link
                to={`/stadiums/${homeStadium._id}`}
                className="text-lg font-semibold text-purple-600 dark:text-purple-400 hover:underline mb-2 block text-center"
                >
                {homeStadium.stadiumName}
                </Link>
            </div>
          )}
        </div>

        {/* Map or Invalid Coordinates */}
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Home Stadium Location
          </h3>
          {homeStadium && homeStadium.latitude && homeStadium.longitude && isCoordinateValid ? (
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md">
              <StadiumMap
                ref={stadiumMapRef}
                stadium={{
                  stadiumName: homeStadium.stadiumName || '',
                  stadiumCity: homeStadium.stadiumCity || '',
                  stadiumCountry: homeStadium.stadiumCountry || '',
                  stadiumCapacity: homeStadium.stadiumCapacity || 0,
                  surfaceType: homeStadium.surfaceType || '',
                  longitude: Number(homeStadium.longitude),
                  latitude: Number(homeStadium.latitude),
                  _id: homeStadium._id,
                }}
                mapStyle={mapStyle}
                is3D={is3D}
                isCustomMarkerAvailable={false}
                customMarkerUrl=""
              />

              {/* Control Toolbar for StadiumMap */}
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={recenterMap}
                  aria-label="Recenter Map"
                  className="flex items-center justify-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  title="Recenter Map"
                >
                  <FaRedo className="mr-2" />
                  Recenter
                </button>
                <button
                  onClick={toggle3D}
                  aria-label={is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
                >
                  <FaCube className="mr-2" />
                  {is3D ? 'Switch to 2D' : 'Switch to 3D'}
                </button>
                <button
                  onClick={handleMapStyleToggle}
                  aria-label="Toggle Map Style"
                  className="flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                  title="Toggle Map Style"
                >
                  <FaMap className="mr-2" />
                  Toggle Style
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">
                Invalid Home Stadium Coordinates
              </h3>
              <p>
                The home stadium for this fixture has invalid or missing
                coordinates. Please update the stadium details or contact the administrator.
              </p>
            </div>
          )}
        </div>

        {tooltip.visible && (
          <div
            className="absolute z-10 bg-gray-800 text-white text-xs rounded py-1 px-2 transition-opacity duration-200"
            style={{ top: tooltip.position.y - 40, left: tooltip.position.x }}
          >
            {tooltip.message}
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="mt-10 flex justify-center gap-4">
            <Link to={`/fixtures/edit/${fixture._id}`}>
              <button
                className="flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Edit Fixture"
              >
                <FaEdit className="mr-2" />
                Edit Fixture
              </button>
            </Link>
            <button
              onClick={openConfirmModal}
              className="flex items-center px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Delete Fixture"
            >
              <FaTrash className="mr-2" />
              Delete Fixture
            </button>
          </div>
        )}

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
              ? 'Are you sure you want to delete this fixture? This action cannot be undone.'
              : modalState === 'loading'
              ? 'Deleting the fixture... Please wait.'
              : modalState === 'success'
              ? `The fixture has been deleted successfully. Redirecting in ${countdown} seconds...`
              : 'Failed to delete the fixture. Please try again.'
          }
          countdown={modalState === 'success' ? countdown : undefined}
          onConfirm={modalState === 'confirm' ? handleConfirmDelete : undefined}
          onCancel={
            modalState === 'success'
              ? () => navigate('/fixtures')
              : closeModal
          }
          onRetry={modalState === 'error' ? handleRetry : undefined}
        />
      </div>
    </div>
  );
};

export default FixtureDetail;
