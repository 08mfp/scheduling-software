import React, { useState } from 'react';
import { FaRegCopy, FaCheck } from 'react-icons/fa';

interface CopyButtonProps {
  textToCopy: string;
  tooltipDefault?: string;
  tooltipSuccess?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  tooltipDefault = 'Copy to clipboard',
  tooltipSuccess = 'Copied!',
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 inline-flex items-center justify-center"
        aria-label={copied ? tooltipSuccess : tooltipDefault}
      >
        {copied ? (
          <FaCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-500" />
        ) : (
          <FaRegCopy className="w-3.5 h-3.5" />
        )}
      </button>
      <div
        role="tooltip"
        className={`absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm transition-opacity duration-300 ${
          copied ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {copied ? tooltipSuccess : tooltipDefault}
        <div className="tooltip-arrow" data-popper-arrow></div>
      </div>
    </div>
  );
};

export default CopyButton;
