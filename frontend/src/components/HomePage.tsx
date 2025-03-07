// src/components/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSun,
  FaMoon,
  FaDatabase,
  FaBuilding,
  FaRocket,
} from 'react-icons/fa';
import '@fontsource/poppins';
import '@fontsource/inter';
import homeImageDark from '../assets/Images/home.png'; // Dark mode image
import homeImageLight from '../assets/Images/home-light.png'; // Light mode image

// FlipCard component for Previous Champions
const FlipCard: React.FC<{ year: string; champion: string; flag: string }> = ({ year, champion, flag }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      style={{ perspective: '1000px' }}
      className="w-full h-32"
    >
      <div
        style={{
          transition: 'transform 0.5s',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}
        className="w-full h-full relative"
      >
        {/* Front side */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-md flex flex-col items-center justify-center"
        >
          <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {year}
          </span>
        </div>
        {/* Back side */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-md flex flex-col items-center justify-center"
        >
          <div className="flex items-center space-x-2">
            {flag && <span className="text-3xl">{flag}</span>}
            <span className="text-xl font-medium text-gray-700 dark:text-gray-200">
              {champion}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline component for expandable developer message text
const ExpandableText: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      {expanded && (
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          Your feedback is invaluable, and I'm constantly working to roll out new features to enhance your experience.
          The new <span className="font-semibold text-blue-600"> Scheduling Algorithms </span> will undoubtedly make future tournaments more exciting as we aim to build up intensity and hype throughout the torunament, whilst keeping it fair for all teams.
          Stay tuned for more exciting updates and thank you for being a part of this journey!
        </p>
      )}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold hover:underline focus:outline-none"
      >
        {expanded ? 'Show Less' : 'Read More'}
      </button>
    </>
  );
};

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

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // SIX NATIONS Tabs State & Data
  const [activeTab, setActiveTab] = useState<string>('overview');

  const sixNationsTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'History' },
    { id: 'format', label: 'Format & Rules' },
    { id: 'teams', label: 'All Teams' },
    { id: 'points', label: 'Points System' },
    { id: 'previous', label: 'Previous Champions' },
  ];

  const renderSixNationsContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 gap-8">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold text-blue-600">The Six Nations Championship</span> is an annual international rugby union competition played from <span className="font-medium text-blue-500">February to March</span>. It unites six European teams in one of the oldest and most prestigious tournaments, celebrated for its fierce rivalries and rich history.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold text-blue-600">Fan Experience:</span> From packed stadiums to viewing parties, the passion and energy of Six Nations fans create an unforgettable atmosphere that elevates every match.
              </p>
            </div>
          </div>
        );
      case 'format':
        return (
          <ul className="space-y-4">
            <li className="flex items-start space-x-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="text-blue-500 text-xl">🏉</span>
              <span className="text-lg">
                <strong>Round-Robin Format:</strong> Each team plays five matches, one against every other team.
              </span>
            </li>
            <li className="flex items-start space-x-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="text-green-500 text-xl">📅</span>
              <span className="text-lg">
                <strong>Rounds:</strong> The tournament is organized into 5 rounds, with 3 matches per round.
              </span>
            </li>
            <li className="flex items-start space-x-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="text-red-500 text-xl">🏠</span>
              <span className="text-lg">
                <strong>Home Advantage:</strong> To ensure fairness, home advantage alternates each year.
              </span>
            </li>
            <li className="flex items-start space-x-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="text-purple-500 text-xl">⏰</span>
              <span className="text-lg">
                <strong>Fixed Schedule:</strong> All fixtures are set in advance and played between February and March.
              </span>
            </li>
            <li className="flex items-start space-x-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="text-yellow-500 text-xl">🚫</span>
              <span className="text-lg">
                <strong>No Playoffs:</strong> The championship is decided solely by the league standings at the end.
              </span>
            </li>
            <li className="flex items-start space-x-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="text-indigo-500 text-xl">📊</span>
              <span className="text-lg">
                <strong>Ranking Criteria:</strong> Teams are ranked based on total points earned, with points difference (points scored minus points conceded) as the tie-breaker.
              </span>
            </li>
          </ul>
        );
      case 'teams':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
              { name: 'France', flag: '🇫🇷' },
              { name: 'Ireland', flag: '🇮🇪' },
              { name: 'Italy', flag: '🇮🇹' },
              { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
              { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
            ].map((team) => (
              <div
                key={team.name}
                className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md transition transform hover:scale-105 text-center"
              >
                <div className="text-5xl mb-2">{team.flag}</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {team.name}
                </h3>
              </div>
            ))}
          </div>
        );
      case 'history':
        return (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="relative pl-12">
              {/* Vertical timeline line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600"></div>
              {/* Timeline Item 1 */}
              <div className="mb-8 flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    Initially established as the <strong>Home Nations Championship</strong>, laying the groundwork for international rugby rivalries.
                  </p>
                </div>
              </div>
              {/* Timeline Item 2 */}
              <div className="mb-8 flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    Expanded to include France, transforming it into the <strong>Five Nations Championship</strong> and intensifying the rivalries.
                  </p>
                </div>
              </div>
              {/* Timeline Item 3 */}
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    With Italy’s inclusion in 2000, it evolved into the modern <strong>Six Nations Championship</strong>, now celebrated for its long-standing rivalries and passionate fan base.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'previous':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { year: '2025', champion: 'TBC', flag: '' },
              { year: '2024', champion: 'Ireland', flag: '🇮🇪' },
              { year: '2023', champion: 'Ireland', flag: '🇮🇪' },
              { year: '2022', champion: 'France', flag: '🇫🇷' },
              { year: '2021', champion: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
              { year: '2020', champion: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
            ].map((item) => (
              <FlipCard
                key={item.year}
                year={item.year}
                champion={item.champion}
                flag={item.flag}
              />
            ))}
          </div>
        );
      case 'points':
        return (
          <div className="relative p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="relative pl-12">
              {/* Vertical line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600"></div>
              {/* Match Points Timeline Item */}
              <div className="mb-8 flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    MP
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Match Points
                  </h4>
                  <ul className="list-disc list-inside mt-2 text-lg text-gray-700 dark:text-gray-300">
                    <li>4 points for a win</li>
                    <li>2 points for a draw</li>
                    <li>0 points for a loss</li>
                  </ul>
                </div>
              </div>
              {/* Bonus Points Timeline Item */}
              <div className="mb-8 flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                    BP
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Bonus Points
                  </h4>
                  <ul className="list-disc list-inside mt-2 text-lg text-gray-700 dark:text-gray-300">
                    <li>1 bonus point for scoring four or more tries</li>
                    <li>1 bonus point for losing by seven or fewer points</li>
                    <li>3 bonus points for a Grand Slam win</li>
                  </ul>
                </div>
              </div>
              {/* Tie-breaker Timeline Item */}
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                    TB
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Tie-Breaker
                  </h4>
                  <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">
                    In the event of a tie, the team with the superior points difference (points scored minus points conceded) is ranked higher.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
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

      {/* Main Banner */}
      <main className="flex-grow">
        <section className="relative flex flex-col items-center justify-center text-center text-black dark:text-white h-[80vh] sm:h-[70vh] bg-white dark:bg-black px-4">
          <img
            src={isDarkMode ? homeImageDark : homeImageLight}
            alt="Rugby Players"
            className="absolute bottom-0 left-0 right-0 mx-auto w-3/4 sm:w-2/3 md:w-1/2 opacity-25 dark:opacity-20 transition-all duration-500 hover:scale-105"
            loading="lazy"
          />
          <div className="relative z-10 px-6">
            <h1 className="text-5xl md:text-5xl font-bold mb-6 font-poppins">
              Stay Ahead in Rugby: Everything Six Nations at Your Fingertips.
            </h1>
            <p className="text-xl md:text-3xl mb-10 font-inter">
              Join our community to get exclusive updates and insights.
            </p>
            <Link
              to="/signup"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              Get Started
            </Link>
          </div>
        </section>

        {/* What is the Six Nations? - Tabbed Interface */}
        <section className="py-12 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              What is the Six Nations?
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-300 dark:border-gray-600">
              {sixNationsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium transition-colors duration-300 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Tab Content */}
            <div className="p-4 text-gray-700 dark:text-gray-300">
              {renderSixNationsContent()}
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-12 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Key Features
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Experience a wealth of features designed to keep you ahead of the game.
            </p>
          </div>
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {/* Card 1: Extensive Fixture Data */}
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md transition transform hover:scale-105">
              <FaDatabase className="text-5xl text-purple-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Extensive Fixture Data
              </h3>
              <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
                Access detailed fixture data including previous results, scores, and current rankings.
              </p>
            </div>
            {/* Card 2: Complete Team Information */}
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md transition transform hover:scale-105">
              <FaBuilding className="text-5xl text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Complete Team Information
              </h3>
              <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
                Discover comprehensive details on teams, including stadiums, rosters, and historical performance.
              </p>
            </div>
            {/* Card 3: Exciting Future Tournaments */}
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md transition transform hover:scale-105">
              <FaRocket className="text-5xl text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Exciting Future Tournaments
              </h3>
              <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
                Experience thrilling upcoming tournaments powered by innovative scheduling algorithms.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials / Success Stories */}
        <section className="py-12 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              What Our Users Say
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Hear from our community about how our platform has transformed their experience.
            </p>
          </div>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md">
              <p className="text-lg text-gray-800 dark:text-gray-100 italic">
                "This platform keeps me updated on every match. The Fixture & Results and detailed stats are a game changer!"
              </p>
              <h3 className="mt-4 font-bold text-gray-900 dark:text-gray-100">
                – Alex, Rugby Fan
              </h3>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md">
              <p className="text-lg text-gray-800 dark:text-gray-100 italic">
                "The Simplicity and Innovativeness make this site my go-to source for everything Six Nations."
              </p>
              <h3 className="mt-4 font-bold text-gray-900 dark:text-gray-100">
                – Jamie, Sports Analyst
              </h3>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md">
              <p className="text-lg text-gray-800 dark:text-gray-100 italic">
                "This platform provides the best insights and updates. It's a must-have for any rugby enthusiast!"
              </p>
              <h3 className="mt-4 font-bold text-gray-900 dark:text-gray-100">
                – Mohamed, Student
              </h3>
            </div>
          </div>
        </section>

        {/* Message from the Developer */}
        <section className="py-12 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto text-center">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-transform duration-300 transform hover:scale-105">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
                A Message from the Developer
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                Thank you for exploring my platform. I am constantly working to bring you the latest insights and innovative features on the Six Nations.
              </p>
              <ExpandableText />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default HomePage;
