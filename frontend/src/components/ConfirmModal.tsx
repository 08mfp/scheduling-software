// src/components/ConfirmModal.tsx
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
} from 'react-icons/fa';

interface ConfirmModalProps {
  isOpen: boolean;
  type: 'confirm' | 'loading' | 'success' | 'error';
  title: string;
  message: string;
  countdown?: number; // Optional countdown for 'success' type
  onConfirm?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type,
  title,
  message,
  countdown,
  onConfirm,
  onCancel,
  onRetry,
}) => {
  // Function to render the appropriate icon based on modal type
  const renderIcon = () => {
    switch (type) {
      case 'confirm':
        return (
          <FaExclamationTriangle
            className="h-6 w-6 text-red-600"
            aria-hidden="true"
          />
        );
      case 'loading':
        return (
          <FaSpinner
            className="h-6 w-6 text-blue-600 animate-spin"
            aria-hidden="true"
          />
        );
      case 'success':
        return (
          <FaCheckCircle
            className="h-6 w-6 text-green-600"
            aria-hidden="true"
          />
        );
      case 'error':
        return (
          <FaTimesCircle
            className="h-6 w-6 text-red-600"
            aria-hidden="true"
          />
        );
      default:
        return null;
    }
  };

  // Function to render buttons based on modal type
  const renderButtons = () => {
    switch (type) {
      case 'confirm':
        return (
          <>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2
                bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2
                bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </>
        );
      case 'loading':
        return null; // No buttons during loading
      case 'success':
        return (
          <button
            type="button"
            onClick={onCancel}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2
              bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2
              focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            OK
          </button>
        );
      case 'error':
        return (
          <>
            <button
              type="button"
              onClick={onRetry}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2
                bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2
                bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </>
        );
      default:
        return null;
    }
  };

  // Function to get the title based on modal type
  const getTitle = () => {
    switch (type) {
      case 'confirm':
        return title || 'Confirm Deletion';
      case 'loading':
        return title || 'Processing...';
      case 'success':
        return title || 'Success';
      case 'error':
        return title || 'Error';
      default:
        return title;
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={type === 'loading' ? () => {} : onCancel || (() => {})} // Disable closing during loading
      >
        <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Transition.Child
              as="div"
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            />
          </Transition.Child>

          {/* Trick to center the modal contents */}
          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>

          {/* Modal panel */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left
              overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              
              <div className="sm:flex sm:items-start">
                {/* Icon */}
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full
                  bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  {renderIcon()}
                </div>
                
                {/* Title and Message */}
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    {getTitle()}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {message}
                    </p>
                    {/* Display countdown if provided */}
                    {type === 'success' && countdown !== undefined && (
                      <p className="mt-2 text-sm text-gray-500">
                        This modal will close in {countdown} second{countdown !== 1 ? 's' : ''}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {renderButtons()}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConfirmModal;
