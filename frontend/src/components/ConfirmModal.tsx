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
  title?: string;
  message: string;
  countdown?: number;
  
  confirmText?: string;
  cancelText?: string;
  retryText?: string;
  okText?: string;

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
  confirmText,
  cancelText,
  retryText,
  okText,
  onConfirm,
  onCancel,
  onRetry,
}) => {

  const getConfirmIcon = () => {
    const effectiveTitle = title || getDefaultTitle();
    const iconColor = effectiveTitle.toLowerCase().includes('delete')
      ? 'text-red-900'
      : 'text-red-600';
    return <FaExclamationTriangle className={`w-12 h-12 ${iconColor} align-middle`} />;
  };

  const getIcon = () => {
    switch (type) {
      case 'confirm':
        return getConfirmIcon();
      case 'loading':
        return <FaSpinner className="w-12 h-12 text-blue-500 animate-spin align-middle" />;
      case 'success':
        return <FaCheckCircle className="w-12 h-12 text-green-500 align-middle" />;
      case 'error':
        return <FaTimesCircle className="w-12 h-12 text-red-700 align-middle" />;
      default:
        return null;
    }
  };

  const defaultConfirmText = confirmText || 'Confirm';
  const defaultCancelText = cancelText || 'Cancel';
  const defaultRetryText = retryText || 'Retry';
  const defaultOkText = okText || 'OK';

  const renderButtons = () => {
    switch (type) {
      case 'confirm':
        return (
          <>
            <button
              onClick={onConfirm}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {defaultConfirmText}
            </button>
            <button
              onClick={onCancel}
              className="mt-3 inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {defaultCancelText}
            </button>
          </>
        );
      case 'loading':
        return null;
      case 'success':
        return (
          <button
            onClick={onCancel}
            className="mt-5 w-full inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
          >
            {defaultOkText}
          </button>
        );
      case 'error':
        return (
          <>
            <button
              onClick={onRetry}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {defaultRetryText}
            </button>
            <button
              onClick={onCancel}
              className="mt-3 inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {defaultCancelText}
            </button>
          </>
        );
      default:
        return null;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'confirm':
        return 'Confirm Action';
      case 'loading':
        return 'Processing...';
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-10 inset-0 overflow-y-auto"
        onClose={type === 'loading' ? () => {} : onCancel || (() => {})}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-50"
            leave="ease-in duration-200"
            leaveFrom="opacity-50"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 transition-opacity" />
          </Transition.Child>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left
              overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full">
                  {getIcon()}
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                  >
                    {title || getDefaultTitle()}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {message}
                    </p>
                    {type === 'success' && countdown !== undefined && countdown > 0 && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        This modal will close in {countdown} second{countdown !== 1 ? 's' : ''}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {type !== 'loading' && (
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  {renderButtons()}
                </div>
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConfirmModal;
