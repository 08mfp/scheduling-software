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

        <br></br>

            {/* Quick Links (Interactive Tabs/Pills) */}
            <div className="mb-8">
            <div className="flex items-center space-x-4">
              <span className="text-blue-600 dark:text-blue-400  duration-200 font-semibold">Quick Links:</span>
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
                venues, and historical performance. It automates schedule generation while allowing manual adjustments to dates & times. Once a schedule is generated, you cannot modify indiivdual fixtures as this could violate Six Nation Contstraints.
              </p>
            </AccordionItem>
            <AccordionItem
              id="auto-scheduler"
              title="Automatic Schedule Generator"
              isOpen={openAccordions['auto-scheduler']}
              onToggle={() => toggleAccordion('auto-scheduler')}
            >
              <p className="mb-4">
                The automatic schedule generator offers five distinct scheduling modes:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Algorithm 1 (Random Scheduler): </strong> Generates random, constraint-respecting schedules with fair rotations.</li>
                <li><strong>Algorithm 2 (Round 5 Extravaganza Scheduler):</strong> Places top-ranked matchups in the final rounds for maximum excitement.</li>
                <li><strong>Algorithm 3 (Optimized Travel Scheduler):</strong> Reduces total tournament travel distance through optimization.</li>
                <li><strong>Algorithm 4 (Balanced Travel Scheduler):</strong> Ensures equal travel distances among teams.</li>
                <li><strong>Algorithm 5 (Unified Optimized Scheduler):</strong> Optimizes fixtures using a comprehensive cost function for fairness and excitement.</li>
              </ul>
            </AccordionItem>
            <AccordionItem
              id="unified-scheduler"
              title="Unified Optimized Scheduler Explained"
              isOpen={openAccordions['unified-scheduler']}
              onToggle={() => toggleAccordion('unified-scheduler')}
            >
              <p className="mb-4">
                The Unified Optimized Scheduler strategically assigns Six Nations rugby fixtures by minimizing a comprehensive cost function with the following weights:
              </p>
              {/* <p className="mb-2 font-semibold">Adjustable weights and tuning:</p> */}
              <ul className="list-disc list-inside space-y-2">
                <li><strong>w1 (Consecutive Away Penalty, default 1.0):</strong> Increase to strongly discourage scheduling teams for consecutive away matches.</li>
                <li><strong>w2 (Max Travel, default 0.1):</strong> Adjust higher to avoid placing excessive travel demands on any single team.</li>
                <li><strong>w3 (Competitiveness, default 1.0):</strong> Raise to ensure high-profile matches occur later in the tournament, maximizing excitement.</li>
                <li><strong>wFri (Broadcast Penalty, default 2.0):</strong> Increase to limit the number of Friday-night matches, penalizing schedules exceeding the set Friday-night limit.</li>
                <li><strong>top2missedSlotPenalty (default 15.0):</strong> Set high to strictly enforce the prime-time scheduling of the #1 vs. #2 matchup in Round 5.</li>
                <li><strong>wTravelTotal (Overall Travel, default 0.05):</strong> Adjust higher if overall tournament travel distance should be minimized.</li>
                <li><strong>wTravelFair (Travel Fairness, default 0.05):</strong> Increase to reduce disparities in travel distance among teams, promoting fairness.</li>
                <li><strong>wShortGap (Short-Gap Penalty, default 0.5):</strong> Increase to penalize schedules with insufficient rest periods between matches.</li>
                <li><strong>α & β (Competitiveness Formula, defaults 1 & 2):</strong> Determins how "big matches" are identified based on team rankings (difference vs. sum of ranks).</li>
              </ul>
              <p className="mt-4">
                To tune the scheduler, run multiple scenarios with different weight combinations, review outcomes, and adjust according to your specific priorities.
              </p>
            </AccordionItem>

            <AccordionItem
              id="manual-scheduler"
              title="Manual Scheduler"
              isOpen={openAccordions['manual-scheduler']}
              onToggle={() => toggleAccordion('manual-scheduler')}
            >
              <p>
                The manual scheduler provides live trackers and checkers to build schedules from scratch,
                giving you complete flexibility to adjust fixtures in real time. It offers the most customization in terms of creating fixtures, 
                and allows you to determiine the order of the fixtures, the dates, and the times (as long as they follow all the rules).
              </p>
            </AccordionItem>
            <AccordionItem
              id="teams-ranking"
              title="Teams Ranking"
              isOpen={openAccordions['teams-ranking']}
              onToggle={() => toggleAccordion('teams-ranking')}
            >
              <p>
                The Teams ranking interface allows you to update the rankings of the six nations to ensure that the scheduling algorithm produces fair
                and accurate fixtures based on current team performance. The team rankings are used in the Round 5 Extravaganza Scheduler to ensure that the top teams play each other in the final rounds, 
                and is also used in the Unified Scheduler to build excitement as the tournament progresses.
              </p>
            </AccordionItem>
            <AccordionItem
              id="admin-panel"
              title="Admin Panel"
              isOpen={openAccordions['admin-panel']}
              onToggle={() => toggleAccordion('admin-panel')}
            >
              <p>
                The Admin Panel grants access to all registered users, managers, & admins, allowing you to view, edit, manage, and delete
                accounts and roles effectively.
              </p>
            </AccordionItem>
            <AccordionItem
              id="troubleshooting"
              title="Troubleshooting Common Issues"
              isOpen={openAccordions['troubleshooting']}
              onToggle={() => toggleAccordion('troubleshooting')}
            >
              <p>
              If automatic schedules fail to generate, verify that constraints and input data (teams, venues, dates) are accurate and feasible. 
              For manual scheduling, use provided live trackers and feedback tools to identify infeasible fixture combinations, 
              and backtrack to resolve issues. For login or permission problems, check your assigned user role and access permissions.
              </p>
            </AccordionItem>
            <AccordionItem
              id="user-management"
              title="User Management Guidelines"
              isOpen={openAccordions['user-management']}
              onToggle={() => toggleAccordion('user-management')}
            >
              <p>
              Admins can run scheduling algorithms and alter any data stored in the backend. Admins can also add, edit, or remove users, assign roles, and control access permissions. 
              Regular users can manage their profiles and preferences but have restricted system access (they can only view the schedules and other data).
              </p>
            </AccordionItem>
            <AccordionItem
              id="contact-support"
              title="Contact & Support"
              isOpen={openAccordions['contact-support']}
              onToggle={() => toggleAccordion('contact-support')}
            >
              <p>
                If you run into any issues or have questions about the scheduling software, or if you notice any instance where a rule is being violated, 
                please contact our support team using the contact form, and we will aim to reply within 24 hours 
              </p>
            </AccordionItem>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
