import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import FocusLock from 'react-focus-lock';

interface SplashScreenProps {
  show: boolean;
  onClose: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ show, onClose }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Separate tooltip states for each card
  const [showRandomTooltip, setShowRandomTooltip] = useState(false);
  const [showRound5Tooltip, setShowRound5Tooltip] = useState(false);
  const [showBalancedTooltip, setShowBalancedTooltip] = useState(false);
  const [showOptimizedTooltip, setShowOptimizedTooltip] = useState(false);
  const [showPlaceholderTooltip, setShowPlaceholderTooltip] = useState(false);

  // Close modal on "Escape" key
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
      aria-labelledby="splashTitle"
      aria-describedby="splashDescription"
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
              id="splashTitle"
              className="text-3xl md:text-4xl font-extrabold  
                         text-black dark:text-white inline-block px-4 py-2 rounded-md "
            >
              Generate Fixtures
            </h2>
            <p
              id="splashDescription"
              className="mt-2 text-lg md:text-xl text-gray-700 dark:text-gray-200"
            >
              Automatic Scheduling Algorithms
            </p>
          </div>

          {/* Intro Paragraph */}
          <p className="text-center text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Welcome to the future of tournament scheduling. Our advanced algorithms 
            offer innovative ways to create exciting, balanced, and practical fixtures 
            for the Six Nations Rugby Championship. Explore them below:
          </p>

          {/* 2x2 grid for the first 4 algorithms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 - Random Algorithm */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              {/* Info Icon (top-right) */}
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowRandomTooltip(true)}
                onMouseLeave={() => setShowRandomTooltip(false)}
                aria-label="Random Algorithm Info"
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

                {/* Tooltip */}
                {showRandomTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-40">
                    <p>
                      Generates schedules randomly within constraints, ensuring no team duplicates
                      and fair home/away rotations.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl">🎲</span> Random Scheduler
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Experience unpredictability at its best! Our Random Algorithm generates
                entirely random yet constraint-respecting schedules, ensuring no team
                duplication per round and fair home/away rotations.
              </p>
            </div>

            {/* Card 2 - Round 5 Extravaganza */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowRound5Tooltip(true)}
                onMouseLeave={() => setShowRound5Tooltip(false)}
                aria-label="Round 5 Extravaganza Info"
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

                {showRound5Tooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-40">
                    <p>
                      Maximizes drama by placing top-ranked matchups (#1 vs #2, #3 vs #4) 
                      in the final round to ensure a thrilling finale.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl">🌟</span> Round 5 Extravaganza Scheduler
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Maximize drama where it counts most. This algorithm schedules high-ranked matchups 
                in the final round (#1 vs #2, #3 vs #4), ensuring a climactic finale with 
                a proprietary interest-scoring formula to deliver thrilling encounters.
              </p>
            </div>

            {/* Card 3 - Balanced Travel */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowBalancedTooltip(true)}
                onMouseLeave={() => setShowBalancedTooltip(false)}
                aria-label="Balanced Travel Scheduler Info"
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

                {showBalancedTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                    <p>
                      Minimizes variation in travel distances among teams, ensuring more fairness 
                      and balanced preparation across the tournament.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl">✈️</span> Balanced Travel Scheduler
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Travel smarter, compete fairly. This approach minimizes the variation in travel
                distance among teams, promoting equity and balanced preparation across the tournament.
              </p>
            </div>

            {/* Card 4 - Optimized Travel */}
            <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
              <div
                className="absolute top-3 right-3 cursor-pointer"
                onMouseEnter={() => setShowOptimizedTooltip(true)}
                onMouseLeave={() => setShowOptimizedTooltip(false)}
                aria-label="Optimized Travel Scheduler Info"
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

                {showOptimizedTooltip && (
                  <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                    <p>
                      Minimizes total travel distance via local-search methods, 
                      aiming for a cost-effective and eco-friendly tournament.
                    </p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold flex items-center mb-2">
                <span className="mr-2 text-2xl">🌍</span> Optimized Travel Scheduler
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Go the distance—efficiently. This algorithm prioritizes minimizing 
                the total travel distance for all teams combined, using advanced local-search methods 
                for a cost-effective, eco-friendly tournament.
              </p>
            </div>
          </div>

          {/* Single wide card below the grid (Placeholder) */}
          <div className="relative bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow mt-6">
            <div
              className="absolute top-3 right-3 cursor-pointer"
              onMouseEnter={() => setShowPlaceholderTooltip(true)}
              onMouseLeave={() => setShowPlaceholderTooltip(false)}
              aria-label="Placeholder Scheduler Info"
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

              {showPlaceholderTooltip && (
                <div className="absolute bg-black text-white text-xs p-2 rounded shadow-lg top-8 right-0 w-44">
                  <p>
                  Generates optimal fixtures using an advanced cost function which accounts for competitiveness, travel fairness, broadcast preferences, rest periods, home/away balance, short turnaround penalties, and matchup timing.
                  </p>
                </div>
              )}
            </div>

            <h3 className="text-xl font-semibold flex items-center mb-2">
              <span className="mr-2 text-2xl">⚙️</span> Unified Scheduler
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
            Our optimized scheduling algorithm uses a state-of-the-art cost function that considers competitiveness, travel fairness, broadcasting preferences, and rest periods to strategically assign Six Nations rugby fixtures. It maximizes viewer excitement by scheduling key matches later, while minimizing penalties and ensuring balanced home/away distributions.
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

export default SplashScreen;
