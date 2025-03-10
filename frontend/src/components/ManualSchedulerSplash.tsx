import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import FocusLock from 'react-focus-lock';

interface ManualSchedulerSplashProps {
  show: boolean;
  onClose: () => void;
}

const ManualSchedulerSplash: React.FC<ManualSchedulerSplashProps> = ({ show, onClose }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Separate tooltip states for each of the 5 features
  const [showManualTooltip, setShowManualTooltip] = useState(false);
  const [showLiveTrackerTooltip, setShowLiveTrackerTooltip] = useState(false);
  const [showTeamTrackerTooltip, setShowTeamTrackerTooltip] = useState(false);
  const [showAutoHomeTooltip, setShowAutoHomeTooltip] = useState(false);
  const [showIntelligentTooltip, setShowIntelligentTooltip] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // If not showing, don't render anything
  if (!show) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70
                 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manualSplashTitle"
      aria-describedby="manualSplashDescription"
    >
      <FocusLock>
        <div
          ref={modalRef}
          className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                     rounded-lg shadow-2xl max-w-4xl w-full p-8 transform scale-100
                     transition-transform duration-300"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-700 dark:text-gray-300 hover:text-red-500 
                       transition-transform transform hover:scale-110 focus:outline-none"
            aria-label="Close splash screen"
          >
            <FaTimes size={20} />
          </button>

          {/* Title Banner */}
          <div className="text-center mb-6">
            <h2
              id="manualSplashTitle"
              className="text-3xl md:text-4xl font-extrabold text-black dark:text-white
                         inline-block px-4 py-2 rounded-md shadow-lg"
            >
            Manual Fixture Scheduler
            </h2>
            <p
              id="manualSplashDescription"
              className="mt-2 text-lg md:text-xl text-gray-700 dark:text-gray-200"
            >
              Customize your matches while seamlessly adhering to official Six Nations rules.
            </p>
          </div>

          {/* Intro Paragraph */}
          <p className="text-center text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            This interface allows you to manually schedule rugby fixtures exactly
            how you want across all tournament rounds. Arrange matchups flexibly while ensuring
            every round meets the official Six Nations rules.
          </p>

          {/* 2x2 grid for first 4 features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 - Manual Scheduling */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              {/* Info Icon (top-right) */}
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowManualTooltip(true)}
                onMouseLeave={() => setShowManualTooltip(false)}
                aria-label="Manual Scheduling Info"
              >
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z"
                    clipRule="evenodd"
                  />
                </svg>

                {showManualTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                    <p>
                      Freely organize fixtures for each round according to your preferences!
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl" role="img" aria-label="Pencil">
                  ✏️
                </span>
                Manual Scheduling
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Freely organize fixtures for each round according to your preferences.
              </p>
            </div>

            {/* Card 2 - Live Constraint Trackers */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowLiveTrackerTooltip(true)}
                onMouseLeave={() => setShowLiveTrackerTooltip(false)}
                aria-label="Live Constraint Trackers Info"
              >
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z"
                    clipRule="evenodd"
                  />
                </svg>

                {showLiveTrackerTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                    <p>
                      Instantly see validation results to keep your schedule aligned with tournament requirements.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl" role="img" aria-label="Checklist">
                  ✅
                </span>
                Live Constraint Trackers
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Instantly see validation results to keep your schedule aligned with tournament
                requirements.
              </p>
            </div>

            {/* Card 3 - Team and Fixture Trackers */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowTeamTrackerTooltip(true)}
                onMouseLeave={() => setShowTeamTrackerTooltip(false)}
                aria-label="Team and Fixture Trackers Info"
              >
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z"
                    clipRule="evenodd"
                  />
                </svg>

                {showTeamTrackerTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                    <p>
                      Monitor teams round-by-round and see which matchups are yet to be scheduled.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl" role="img" aria-label="People">
                  👥
                </span>
                Team &amp; Fixture Trackers
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Stay informed with real-time updates on which teams must play each round
                and which matchups are yet to be scheduled.
              </p>
            </div>

            {/* Card 4 - Automatic Home/Away */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowAutoHomeTooltip(true)}
                onMouseLeave={() => setShowAutoHomeTooltip(false)}
                aria-label="Automatic Home/Away Info"
              >
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z"
                    clipRule="evenodd"
                  />
                </svg>

                {showAutoHomeTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                    <p>
                      Automatically assigns home/away based on historical data, saving valuable planning time.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl" role="img" aria-label="House">
                  🏠
                </span>
                Automatic Home/Away Assignments
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Based on historical data, the system automatically assigns home and away teams, 
                saving you valuable planning time.
              </p>
            </div>
          </div>

          {/* Single wide card - Intelligent Suggestions & Backtracking */}
          <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow mt-6">
            <div
              className="absolute top-3 right-3 cursor-pointer"
              onMouseEnter={() => setShowIntelligentTooltip(true)}
              onMouseLeave={() => setShowIntelligentTooltip(false)}
              aria-label="Intelligent Suggestions & Backtracking Info"
            >
              <svg
                className="w-6 h-6 text-gray-800 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z"
                  clipRule="evenodd"
                />
              </svg>

              {showIntelligentTooltip && (
                <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-48">
                  <p>
                    Proactive ideas for fixture placement and backtracking to fix scheduling conflicts quickly.
                  </p>
                </div>
              )}
            </div>

            <h3 className="text-xl font-semibold flex items-center mb-2">
              <span className="mr-2 text-2xl" role="img" aria-label="Light Bulb">
                💡
              </span>
              Intelligent Suggestions &amp; Backtracking
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Receive proactive fixture placement ideas and guidance to resolve scheduling conflicts 
              swiftly, ensuring a seamless scheduling experience.
            </p>
          </div>

          {/* Dismiss button at bottom */}
          <div className="mt-8 text-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base 
                         font-medium rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Got it!
            </button>
          </div>
        </div>
      </FocusLock>
    </div>,
    document.body
  );
};

export default ManualSchedulerSplash;
