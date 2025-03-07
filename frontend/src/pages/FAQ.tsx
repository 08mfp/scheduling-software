// frontend/src/pages/FAQ.tsx

import React, { useContext, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaInfoCircle, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';

interface AccordionItemProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ id, title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-600" id={id}>
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 text-left text-gray-900 dark:text-gray-100 focus:outline-none"
      >
        <span className="font-bold">{title}</span>
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${
            isOpen ? 'transform rotate-180 text-red-600' : 'text-green-600'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
      >
        <div className="p-4 text-gray-600 dark:text-gray-300">{children}</div>
      </div>
    </div>
  );
};

const FAQ: React.FC = () => {
  const { user } = useContext(AuthContext);

  // Dark mode hooks
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || false;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Manage open state for each accordion section
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'scheduling-software': false,
    'auto-scheduler': false,
    'manual-scheduler': false,
    'teams-ranking': false,
    'admin-panel': false,
    troubleshooting: false,
    'user-management': false,
    'contact-support': false,
  });

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: true }));
  };

  // Quick links data
  const quickLinks = [
    // { id: 'scheduling-software', label: 'Scheduling Software' },
    { id: 'auto-scheduler', label: 'Automatic Scheduler' },
    { id: 'manual-scheduler', label: 'Manual Scheduler' },
    { id: 'teams-ranking', label: 'Teams Ranking' },
    // { id: 'admin-panel', label: 'Admin Panel' },
    // { id: 'troubleshooting', label: 'Troubleshooting Issues' },
    // { id: 'user-management', label: 'User Management Guidelines' },
    // { id: 'contact-support', label: 'Contact & Support' },
  ];

  // Handle quick link click: open the accordion and scroll smoothly
  const handleQuickLinkClick = (id: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openAccordion(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Early return check is now placed after all hooks have been declared
  if (!user || !['admin', 'manager', 'viewer'].includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl w-full">
        {/* Navigation Menu */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/ Admin /</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">FAQ</span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
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

        {/* Main Card */}
        <div className="max-w-7xl w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 transition-colors duration-300">
          {/* Title & Short Description */}
          <div className="text-left">
          <h1
            className="font-extrabold text-gray-900 dark:text-gray-100 mb-2"
            style={{ fontSize: '34px' }}
          >
            FAQ
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 mb-2"
            style={{ fontSize: '16px' }}
          >
            This FAQ provides detailed instructions on how to run the scheduling software,
            including its various modes, teams ranking, troubleshooting tips, and admin panel functions.
          </p>
        </div>

          {/* Quick Links (Interactive Tabs/Pills) */}
          <div className="mb-8">
            <ul className="flex flex-wrap space-x-4">
              {quickLinks.map(link => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={(e) => handleQuickLinkClick(link.id, e)}
                    className="text-blue-600 dark:text-blue-400 hover:underline transform hover:scale-105 transition duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Inner Content Container */}
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-6 mb-8 space-y-6">
            <AccordionItem
              id="scheduling-software"
              title="Scheduling Software Overview"
              isOpen={openAccordions['scheduling-software']}
              onToggle={() => toggleAccordion('scheduling-software')}
            >
              <p>
                The scheduling software optimizes fixture creation by analyzing parameters such as team availability,
                venues, and historical performance. It automates schedule generation while allowing manual adjustments.
              </p>
            </AccordionItem>
            <AccordionItem
              id="auto-scheduler"
              title="Automatic Schedule Generator"
              isOpen={openAccordions['auto-scheduler']}
              onToggle={() => toggleAccordion('auto-scheduler')}
            >
              <p className="mb-4">
                The automatic schedule generator offers four distinct scheduling modes:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Algorithm 1:</strong> [Description of Algorithm 1]</li>
                <li><strong>Algorithm 2:</strong> [Description of Algorithm 2]</li>
                <li><strong>Algorithm 3:</strong> [Description of Algorithm 3]</li>
                <li><strong>Algorithm 4:</strong> [Description of Algorithm 4]</li>
              </ul>
            </AccordionItem>
            <AccordionItem
              id="manual-scheduler"
              title="Manual Scheduler"
              isOpen={openAccordions['manual-scheduler']}
              onToggle={() => toggleAccordion('manual-scheduler')}
            >
              <p>
                The manual scheduler provides live trackers and checkers to build schedules from scratch,
                giving you complete flexibility to adjust fixtures in real time.
              </p>
            </AccordionItem>
            <AccordionItem
              id="teams-ranking"
              title="Teams Ranking"
              isOpen={openAccordions['teams-ranking']}
              onToggle={() => toggleAccordion('teams-ranking')}
            >
              <p>
                Update the rankings of the six nations to ensure that the scheduling algorithm produces fair
                and accurate fixtures based on current team performance.
              </p>
            </AccordionItem>
            <AccordionItem
              id="admin-panel"
              title="Admin Panel"
              isOpen={openAccordions['admin-panel']}
              onToggle={() => toggleAccordion('admin-panel')}
            >
              <p>
                The Admin Panel grants access to all registered users, allowing you to view, edit, and manage
                user accounts and roles efficiently.
              </p>
            </AccordionItem>
            <AccordionItem
              id="troubleshooting"
              title="Troubleshooting Common Issues"
              isOpen={openAccordions['troubleshooting']}
              onToggle={() => toggleAccordion('troubleshooting')}
            >
              <p>
              Lorem Ipsum Something I need to add stuff here once everything else is finished.
              </p>
            </AccordionItem>
            <AccordionItem
              id="user-management"
              title="User Management Guidelines"
              isOpen={openAccordions['user-management']}
              onToggle={() => toggleAccordion('user-management')}
            >
              <p>
              Lorem Ipsum Something I need to add stuff here once everything else is finished.
              </p>
            </AccordionItem>
            <AccordionItem
              id="contact-support"
              title="Contact & Support"
              isOpen={openAccordions['contact-support']}
              onToggle={() => toggleAccordion('contact-support')}
            >
              <p>
                Lorem Ipsum Something I need to add stuff here once everything else is finished.
              </p>
            </AccordionItem>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
