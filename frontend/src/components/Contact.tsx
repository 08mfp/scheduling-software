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

/*
* I got this code from one of my older personal projects: https://github.com/08mfp/portfolio-website-V2, which was inspired by a yt video
*/

const Contact: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('theme') === 'dark'
      : false;
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

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
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
  const nameRegEx = /^[a-zA-Z]+ [a-zA-Z]+$/;
  const emailRegEx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirmationMessage('');

    const newErrors: { [key: string]: string } = {};

    if (!form.name) {
      newErrors.name = 'This field is required';
    } else if (!nameRegEx.test(form.name)) {
      newErrors.name = 'Please enter your first and last name';
    }

    if (!form.email) {
      newErrors.email = 'This field is required';
    } else if (!emailRegEx.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.subject) {
      newErrors.subject = 'Please choose a subject';
    }

    if (!form.message) {
      newErrors.message = 'This field is required';
    } else {
      const wordCount = form.message.trim().split(/\s+/).length;
      if (wordCount < 10) {
        newErrors.message = 'Message must be at least 10 words';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoadingEmail(true);
    emailjs
      .send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
        {
          to_name: form.name,
          from_name: 'Your Name',
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
          setForm({ name: '', email: '', subject: '', message: '' });
          setErrors({});
        },
        (err) => {
          setLoadingEmail(false);
          setConfirmationMessage('Sorry, something went wrong. Please try again.');
          console.error(err);
        }
      );
  };

  const handleClear = () => {
    setForm({ name: '', email: '', subject: '', message: '' });
    setErrors({});
    setConfirmationMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl w-full">
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

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-12 transition-colors duration-300">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              We’d love to hear from you! Whether you have a question about features, trials, pricing, or anything else, our team is ready to assist you.
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto space-y-6"
          >
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
                <span className="text-red-500 text-sm mt-1">{errors.name}</span>
              )}
            </div>

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
                <span className="text-red-500 text-sm mt-1">{errors.email}</span>
              )}
            </div>

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
                <span className="text-red-500 text-sm mt-1">{errors.subject}</span>
              )}
            </div>

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
                <span className="text-red-500 text-sm mt-1">{errors.message}</span>
              )}
            </div>
            {confirmationMessage && (
              <div className="text-center text-green-600 font-semibold">
                {confirmationMessage}
              </div>
            )}
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800"
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
          </div>
      </div>
    </div>
  );
};

export default Contact;
