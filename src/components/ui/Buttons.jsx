import React from 'react';

export const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  className = "",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 
      text-white font-bold rounded-xl shadow-lg shadow-blue-200
      hover:shadow-xl hover:shadow-blue-300 hover:from-blue-700 hover:to-indigo-700
      active:scale-95 transition-all duration-200
      disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed 
      disabled:shadow-none disabled:active:scale-100
      flex items-center justify-center gap-2
      ${className}`}
  >
    {loading && (
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )}
    {children}
  </button>
);

export const SecondaryButton = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-8 py-3.5 bg-white border-2 border-gray-300 
      text-gray-700 font-semibold rounded-xl shadow-sm
      hover:bg-gray-50 hover:border-gray-400 hover:shadow-md
      active:scale-95 transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
      ${className}`}
  >
    {children}
  </button>
);
