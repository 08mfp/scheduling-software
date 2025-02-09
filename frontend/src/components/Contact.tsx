import React, {
  useEffect,
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaSun,
  FaMoon,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaInfoCircle,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';

const Contact: React.FC = () => {
  // ----------------------------------------------------------------
  // Dark Mode & Page Loading Skeleton
  // ----------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('theme') === 'dark'
      : false;
  });

  useEffect(() => {
    // Simulate loading (2s) for the content area only
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // ----------------------------------------------------------------
  // EmailJS Form State & Validation
  // ----------------------------------------------------------------
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  // Regex Patterns
  const nameRegEx = /^[a-zA-Z]+ [a-zA-Z]+$/; // "John Doe"
  const emailRegEx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // basic pattern

  // Handle input changes & inline validation
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Inline validation
    switch (name) {
      case 'name':
        setErrors((prev) => ({
          ...prev,
          name: !value
            ? 'This field is required'
            : !nameRegEx.test(value)
            ? 'Please enter your first and last name'
            : '',
        }));
        break;
      case 'email':
        setErrors((prev) => ({
          ...prev,
          email: !value
            ? 'This field is required'
            : !emailRegEx.test(value)
            ? 'Please enter a valid email'
            : '',
        }));
        break;
      case 'subject':
        setErrors((prev) => ({
          ...prev,
          subject: !value ? 'Please choose a subject' : '',
        }));
        break;
      case 'message':
        const wordCount = value.trim().split(/\s+/).length;
        setErrors((prev) => ({
          ...prev,
          message: !value
            ? 'This field is required'
            : wordCount < 10
            ? 'Message must be at least 10 words'
            : '',
        }));
        break;
      default:
        break;
    }
  };

  // Final validation & sending
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirmationMessage('');

    const newErrors: { [key: string]: string } = {};

    // Name
    if (!form.name) {
      newErrors.name = 'This field is required';
    } else if (!nameRegEx.test(form.name)) {
      newErrors.name = 'Please enter your first and last name';
    }

    // Email
    if (!form.email) {
      newErrors.email = 'This field is required';
    } else if (!emailRegEx.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Subject
    if (!form.subject) {
      newErrors.subject = 'Please choose a subject';
    }

    // Message
    if (!form.message) {
      newErrors.message = 'This field is required';
    } else {
      const wordCount = form.message.trim().split(/\s+/).length;
      if (wordCount < 10) {
        newErrors.message = 'Message must be at least 10 words';
      }
    }

    // If any error, set them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Send with EmailJS
    setLoadingEmail(true);
    emailjs
      .send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
        {
          to_name: form.name,
          from_name: 'Your Name', // E.g. "Mohamed Farid"
          from_email: form.email,
          to_email: 'mohfarid1webdev@gmail.com',
          subject: form.subject,
          message: form.message,
        },
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY || ''
      )
      .then(
        () => {
          setLoadingEmail(false);
          setConfirmationMessage('Your email has been sent successfully!');
          // Reset form
          setForm({ name: '', email: '', subject: '', message: '' });
          setErrors({});
        },
        (err) => {
          setLoadingEmail(false);
          setConfirmationMessage(
            'Sorry, something went wrong. Please try again.'
          );
          console.error(err);
        }
      );
  };

  // Clear button
  const handleClear = () => {
    setForm({ name: '', email: '', subject: '', message: '' });
    setErrors({});
    setConfirmationMessage('');
  };

  // ----------------------------------------------------------------
  // Skeleton for Main Content
  // ----------------------------------------------------------------
  const SkeletonIntro = () => (
    <div className="text-center space-y-4 animate-pulse">
      <div className="h-8 bg-gray-300 dark:bg-gray-700 w-3/4 mx-auto rounded"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 w-5/6 mx-auto rounded"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 w-2/3 mx-auto rounded"></div>
    </div>
  );

  const SkeletonForm = () => (
    <div className="flex flex-col items-center space-y-3 animate-pulse">
      <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-3/5 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-4 w-2/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-10 w-24 bg-gray-300 dark:bg-gray-700 rounded mt-4"></div>
    </div>
  );

  const SkeletonBentoBoxes = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 animate-pulse">
      {[...Array(4)].map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center p-6 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md"
        >
          <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      ))}
    </div>
  );

  const renderSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
      <SkeletonIntro />
      <SkeletonForm />
      <SkeletonBentoBoxes />
    </div>
  );

  // ----------------------------------------------------------------
  // Final Render
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Outer Wrapper to match layout */}
      <div className="max-w-6xl w-full">
        {/* NAVBAR (no extra margin-top) */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <FaInfoCircle className="mr-1" />
              Home
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Contact
            </span>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 
                       text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 
                       dark:hover:bg-gray-600 transition-colors duration-200 
                       focus:outline-none focus:ring-2 focus:ring-gray-400 
                       dark:focus:ring-gray-500"
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

        {/* MAIN CONTENT (skeleton or real) */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-8 transition-colors duration-300">
            {renderSkeleton()}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-12 transition-colors duration-300">
            {/* Contact Us Title & Subtext */}
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
                Contact Us
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                We’d love to hear from you! Whether you have a question about
                features, trials, pricing, or anything else, our team is ready
                to assist you.
              </p>
            </div>

            {/* CONTACT FORM */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="max-w-2xl mx-auto space-y-6"
            >
              {/* Name */}
              <div className="flex flex-col text-left">
                <label className="text-gray-800 dark:text-gray-200 mb-1 font-medium">
                  Your Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="First and last name"
                  className={`py-3 px-4 rounded-md outline-none border ${
                    errors.name
                      ? 'border-red-500 bg-red-50 placeholder-red-400'
                      : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 placeholder-gray-400'
                  } text-gray-800 dark:text-gray-100`}
                />
                {errors.name && (
                  <span className="text-red-500 text-sm mt-1">
                    {errors.name}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col text-left">
                <label className="text-gray-800 dark:text-gray-200 mb-1 font-medium">
                  Your Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Your email address"
                  className={`py-3 px-4 rounded-md outline-none border ${
                    errors.email
                      ? 'border-red-500 bg-red-50 placeholder-red-400'
                      : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 placeholder-gray-400'
                  } text-gray-800 dark:text-gray-100`}
                />
                {errors.email && (
                  <span className="text-red-500 text-sm mt-1">
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Subject (Dropdown) */}
              <div className="flex flex-col text-left">
                <label className="text-gray-800 dark:text-gray-200 mb-1 font-medium">
                  Subject
                </label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className={`py-3 px-4 rounded-md outline-none border ${
                    errors.subject
                      ? 'border-red-500 bg-red-50 placeholder-red-400'
                      : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 placeholder-gray-400'
                  } text-gray-800 dark:text-gray-100`}
                >
                  <option value="">-- Select an Issue --</option>
                  <option value="Forgot Password">Forgot Password</option>
                  <option value="Restricted Access">Restricted Access</option>
                  <option value="Upgrade Account">Upgrade Account</option>
                  <option value="Question">Question</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Feature Idea">Feature Idea</option>
                  <option value="Other">Other</option>
                </select>
                {errors.subject && (
                  <span className="text-red-500 text-sm mt-1">
                    {errors.subject}
                  </span>
                )}
              </div>

              {/* Message */}
              <div className="flex flex-col text-left">
                <label className="text-gray-800 dark:text-gray-200 mb-1 font-medium">
                  Your Message
                </label>
                <textarea
                  rows={6}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Please enter at least 10 words"
                  className={`py-3 px-4 rounded-md outline-none border resize-none ${
                    errors.message
                      ? 'border-red-500 bg-red-50 placeholder-red-400'
                      : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 placeholder-gray-400'
                  } text-gray-800 dark:text-gray-100`}
                />
                {errors.message && (
                  <span className="text-red-500 text-sm mt-1">
                    {errors.message}
                  </span>
                )}
              </div>

              {/* Confirmation Message */}
              {confirmationMessage && (
                <div className="text-center text-green-600 font-semibold">
                  {confirmationMessage}
                </div>
              )}

              {/* Buttons: Clear + Submit */}
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 
                             py-2 px-6 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 
                             transition-colors duration-200 focus:outline-none 
                             focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 dark:bg-blue-700 text-white py-2 px-6 
                             rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 
                             transition-colors duration-200 focus:outline-none 
                             focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                >
                  {loadingEmail ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </form>

            {/* Our Links Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Our Links
              </h2>
            </div>

            {/* Bento Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {/* Email Box */}
              <div className="flex flex-col items-center p-6 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
                <FaEnvelope className="text-5xl text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Email
                </h3>
                <a
                  href="mailto:contact@example.com"
                  className="text-lg text-gray-700 dark:text-gray-300 hover:underline"
                >
                  contact@example.com
                </a>
              </div>

              {/* Phone Box */}
              <div className="flex flex-col items-center p-6 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
                <FaPhone className="text-5xl text-green-600 dark:text-green-400" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Call
                </h3>
                <a
                  href="tel:+1234567890"
                  className="text-lg text-gray-700 dark:text-gray-300 hover:underline"
                >
                  +1 (234) 567-890
                </a>
              </div>

              {/* Address Box */}
              <div className="flex flex-col items-center p-6 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
                <FaMapMarkerAlt className="text-5xl text-red-600 dark:text-red-400" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Our Offices
                </h3>
                <a
                  href="https://goo.gl/maps/example"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg text-gray-700 dark:text-gray-300 hover:underline"
                >
                  1234 Main Street <br />
                  City, State, ZIP Code <br />
                  Country
                </a>
              </div>

              {/* Social Media Box */}
              <div className="flex flex-col items-center p-6 space-y-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
                <FaInfoCircle className="text-5xl text-purple-600 dark:text-purple-400" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Social Media
                </h3>
                <div className="flex space-x-4 text-3xl">
                  <a
                    href="https://twitter.com/yourprofile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 dark:text-blue-400 hover:text-blue-600 
                               dark:hover:text-blue-500 transition-colors duration-200"
                  >
                    <FaTwitter />
                  </a>
                  <a
                    href="https://linkedin.com/in/yourprofile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 dark:text-blue-500 hover:text-blue-800 
                               dark:hover:text-blue-600 transition-colors duration-200"
                  >
                    <FaLinkedin />
                  </a>
                  <a
                    href="https://facebook.com/yourprofile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 
                               dark:hover:text-blue-500 transition-colors duration-200"
                  >
                    <FaFacebook />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contact;
