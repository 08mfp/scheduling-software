// frontend/src/pages/HomePage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaTrophy, FaCalendarAlt, FaArrowRight, FaSignInAlt } from 'react-icons/fa';

// Mock Data for Teams (Replace with actual data or fetch from API as needed)
const teams = [
  {
    _id: '1',
    teamName: 'England',
    logo: 'https://upload.wikimedia.org/wikipedia/en/b/be/England_national_rugby_union_team_logo.svg',
  },
  {
    _id: '2',
    teamName: 'France',
    logo: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Rugby_France_logo.svg',
  },
  {
    _id: '3',
    teamName: 'Ireland',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/19/Ireland_Rugby_Union.svg',
  },
  {
    _id: '4',
    teamName: 'Italy',
    logo: 'https://upload.wikimedia.org/wikipedia/en/7/7f/Italy_rugby_union_team_logo.svg',
  },
  {
    _id: '5',
    teamName: 'Scotland',
    logo: 'https://upload.wikimedia.org/wikipedia/en/8/8a/Rugby_Scotland_logo.svg',
  },
  {
    _id: '6',
    teamName: 'Wales',
    logo: 'https://upload.wikimedia.org/wikipedia/en/7/77/Rugby_Wales_logo.svg',
  },
];

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-teal-500 to-blue-600 flex flex-col items-center justify-center h-screen text-center text-white">
        {/* Optional: Background Overlay */}
        <div className="absolute inset-0 bg-black opacity-30"></div>

        <div className="relative z-10 px-6">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
            Welcome to the Six Nations Rugby
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Your ultimate source for the latest Six Nations Fixtures, Teams, and Players.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/teams">
              <button className="flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition duration-300">
                <FaUsers className="mr-2" />
                View Teams
              </button>
            </Link>
            <Link to="/players">
              <button className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300">
                <FaTrophy className="mr-2" />
                View Players
              </button>
            </Link>
            <Link to="/fixtures">
              <button className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300">
                <FaCalendarAlt className="mr-2" />
                View Fixtures
              </button>
            </Link>
          </div>
        </div>
      </div>

      

      {/* About the Six Nations */}
      <div className="py-12 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">About the Six Nations</h2>
          <p className="text-lg text-gray-700 mb-6">
            The Six Nations Championship is an annual international rugby union competition contested by six European countries: England, France, Ireland, Italy, Scotland, and Wales. It is one of the most prestigious tournaments in the sport, featuring intense rivalries and showcasing top-tier rugby talent.
          </p>
          <p className="text-lg text-gray-700 mb-6">
            Organized in a round-robin format, each team plays every other team once, either at home or away. Points are awarded for wins, draws, and certain bonus criteria, determining the overall champion each year. Matches are held across iconic stadiums in each participating nation, attracting passionate fans from around the world.
          </p>
          <p className="text-lg text-gray-700">
            On our website, you can explore detailed information about each team, view player profiles, keep track of upcoming fixtures, and stay updated with the latest match results. Sign up to access exclusive features, including in-depth statistics, personalized team tracking, and much more.
          </p>
        </div>
      </div>



      {/* Teams Overview */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">The Teams</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {teams.map((team) => (
              <Link to={`/teams/${team._id}`} key={team._id}>
                <a
                  href={`/teams/${team._id}`}
                  className="block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition duration-300"
                >
                  <img
                    src={team.logo || 'https://via.placeholder.com/100'}
                    alt={`${team.teamName} Logo`}
                    className="w-24 h-24 object-contain mx-auto mb-4"
                  />
                  <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                    {team.teamName}
                  </h5>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Encourage Signup Section */}
      <div className="py-12 bg-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-lg mb-6">
            Sign up today to gain access to exclusive features, including comprehensive team and player statistics, personalized dashboards, and real-time match updates. Stay ahead of the game with all the insights you need!
          </p>
          <Link to="/signup">
            <button className="flex items-center justify-center mx-auto px-6 py-3 bg-white text-teal-600 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition duration-300">
              <FaSignInAlt className="mr-2" />
              Sign Up Now
            </button>
          </Link>
        </div>
      </div>


    </div>
  );
};

export default HomePage;
