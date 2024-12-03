import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center p-6">
      <div className="max-w-3xl text-center bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-lg p-12 shadow-lg">
        <h1 className="text-5xl font-extrabold text-gray-800 mb-4">
          Welcome to the Six Nations
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Keep Up to Date with all the latest Six Nations Fixtures, Teams and Players.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/teams">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              View Teams
            </button>
          </Link>
          <Link to="/players">
            <button className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400">
              View Players
            </button>
          </Link>
          <Link to="/fixtures">
            <button className="px-6 py-3 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              View Fixtures
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
