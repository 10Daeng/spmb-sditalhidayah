import React from 'react';

/**
 * Error Message Component
 * Menampilkan daftar error dengan UI yang user-friendly
 * Terinspirasi dari spmb-frontend
 */

export const ErrorMessage = ({ errors, title = null }) => {
  if (!errors || errors.length === 0) return null;

  const errorList = Array.isArray(errors) ? errors : [errors];

  return (
    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-fade-in">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            {title || `Terdapat ${errorList.length} kesalahan yang harus diperbaiki:`}
          </h3>
          
          {errorList.length === 1 ? (
            <p className="mt-1 text-sm text-red-700">{errorList[0]}</p>
          ) : (
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
              {errorList.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Success Message Component
 */
export const SuccessMessage = ({ message, title = 'Berhasil!' }) => {
  if (!message) return null;

  return (
    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-green-800">{title}</h3>
          <p className="mt-1 text-sm text-green-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Warning Message Component
 */
export const WarningMessage = ({ message, title = 'Perhatian' }) => {
  if (!message) return null;

  return (
    <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-yellow-800">{title}</h3>
          <p className="mt-1 text-sm text-yellow-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Info Message Component
 */
export const InfoMessage = ({ message, title = 'Informasi' }) => {
  if (!message) return null;

  return (
    <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-blue-800">{title}</h3>
          <p className="mt-1 text-sm text-blue-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Field Error Component (inline)
 */
export const FieldError = ({ error }) => {
  if (!error) return null;

  return (
    <p className="mt-1 text-sm text-red-600 flex items-center gap-1 animate-fade-in">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{error}</span>
    </p>
  );
};

export default {
  ErrorMessage,
  SuccessMessage,
  WarningMessage,
  InfoMessage,
  FieldError
};
