// frontend/src/components/Unauthorized.tsx

import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex justify-center items-start bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-xl w-full bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-12 text-center">
        {/* Blocked Symbol */}
        <div className="flex justify-center mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-32 w-32 text-red-600"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 
              10-4.477 10-10S17.523 2 12 2zm5 13.59L15.59 
              17 12 13.41 8.41 17 7 15.59 10.59 12 
              7 8.41 8.41 7 12 10.59 15.59 7 
              17 8.41 13.41 12 17 15.59z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Main Heading */}
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Unauthorized Access
        </h2>

        {/* Detailed Information */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          You do not have access to the requested page. This may be because:
        </p>
        <ul className="text-left text-gray-600 dark:text-gray-300 list-disc list-inside mb-8 space-y-2">
          <li>You do not have the necessary permissions.</li>
          <li>You are not authenticated.</li>
          <li>Your session has expired.</li>
          <li>You have followed a broken path.</li>
          <li>You have sent too many requests in a short amount of time.</li>
        </ul>

        {/* Call to Action */}
        <Link to="/" className="inline-block mb-6">
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
            Go to Home
          </button>
        </Link>

        {/* Disclaimer */}
        <p className="mt-4 text-sm text-gray-500">
          If you feel this is in error, please{' '}
          <Link to="/contact" className="underline text-blue-600 hover:text-blue-700">
            contact an administrator
          </Link>.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
