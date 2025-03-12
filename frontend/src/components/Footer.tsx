import React, { useState, useEffect } from 'react';
import {
  FaTwitter,
  FaFacebookF,
  FaInstagram,
  FaChevronRight,
  FaArrowUp,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import logo from '../assets/Images/logo2.png';

const Footer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <footer className="bg-gray-900/80 dark:bg-black py-16 px-8 md:px-16 relative animate-fadeIn">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 text-white dark:text-gray-300">
        <section>
          <Link to="/" className="flex items-center space-x-3 mb-4">
            <img
              src={logo}
              className="h-8"
              alt="Six Nations Logo"
              loading="lazy"
            />
            <span className="text-2xl font-bold">Six Nations</span>
          </Link>
          <p className="text-base leading-relaxed">
            The ultimate destination for Six Nations Rugby fans. Explore fixtures, teams,
            and players, and never miss a game!
          </p>
        </section>

        <nav aria-label="Footer Navigation">
          <h3 className="text-xl font-bold mb-4">Navigation</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/teams" className="flex items-center hover:text-pink-400 transition-colors duration-300">
                <FaChevronRight className="mr-2" />
                Teams
              </Link>
            </li>
            <li>
              <Link to="/players" className="flex items-center hover:text-pink-400 transition-colors duration-300">
                <FaChevronRight className="mr-2" />
                Players
              </Link>
            </li>
            <li>
              <Link to="/fixtures" className="flex items-center hover:text-pink-400 transition-colors duration-300">
                <FaChevronRight className="mr-2" />
                Fixtures
              </Link>
            </li>
            <li>
              <Link to="/signup" className="flex items-center hover:text-pink-400 transition-colors duration-300">
                <FaChevronRight className="mr-2" />
                Sign Up
              </Link>
            </li>
          </ul>
        </nav>

        <address className="not-italic">
          <h3 className="text-xl font-bold mb-4">Contact Us</h3>
          <p className="text-base">
            Email: <a href="mailto:info@sixnations.com" className="hover:text-pink-400">info@sixnations.com</a>
          </p>
          <p className="text-base">
            Phone: <a href="tel:+15551234567" className="hover:text-pink-400">+44 (111) 1111-1111</a>
          </p>
          <p className="text-base mt-2">
            123 Rugby Way<br />
            London, UK
          </p>
        </address>

        <section>
          <h3 className="text-xl font-bold mb-4">Newsletter</h3>
          <p className="text-base mb-4">
            Subscribe to get the latest news, fixtures, and match results directly in your inbox.
          </p>
          <form className="flex flex-col sm:flex-row items-center sm:space-x-2">
            <label htmlFor="newsletter-email" className="sr-only">Email Address</label>
            <input
              id="newsletter-email"
              type="email"
              className="w-full sm:w-auto flex-1 px-3 py-2 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Placeholder Only"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 focus:ring-pink-500 rounded-md text-white transition duration-300 font-semibold"
            >
              Subscribe
            </button>
          </form>
        </section>
      </div>

      <div className="mt-12 border-t border-white/20 dark:border-gray-100 pt-6 flex justify-center space-x-6">
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-pink-400 dark:hover:text-pink-400 transition-colors duration-300 text-white dark:text-gray-300"
          aria-label="Twitter"
        >
          <FaTwitter size={24} />
        </a>
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-pink-400 dark:hover:text-pink-400 transition-colors duration-300 text-white dark:text-gray-300"
          aria-label="Facebook"
        >
          <FaFacebookF size={24} />
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-pink-400 dark:hover:text-pink-400 transition-colors duration-300 text-white dark:text-gray-300"
          aria-label="Instagram"
        >
          <FaInstagram size={24} />
        </a>
      </div>

      <div className="text-center text-sm text-white/60 dark:text-gray-100 mt-6">
        © {new Date().getFullYear()} Six Nations. All rights reserved.
      </div>

      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-pink-600 hover:bg-pink-700 text-white rounded-full shadow-lg transition duration-300"
          aria-label="Back to top"
        >
          <FaArrowUp />
        </button>
      )}
    </footer>
  );
};

export default Footer;
