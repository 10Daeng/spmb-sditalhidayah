import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Toast Notification System
 * Terinspirasi dari spmb-frontend untuk memberikan feedback yang lebih baik ke user
 */

// Toast Context
const ToastContext = createContext(null);

// Toast Types
const TOAST_TYPES = {
  success: {
    icon: '✅',
    bgColor: 'bg-green-50',
    borderColor: 'border-l-4 border-green-500',
    textColor: 'text-green-800',
    progressColor: 'bg-green-500'
  },
  error: {
    icon: '❌',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-4 border-red-500',
    textColor: 'text-red-800',
    progressColor: 'bg-red-500'
  },
  warning: {
    icon: '⚠️',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-l-4 border-yellow-500',
    textColor: 'text-yellow-800',
    progressColor: 'bg-yellow-500'
  },
  info: {
    icon: 'ℹ️',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-4 border-blue-500',
    textColor: 'text-blue-800',
    progressColor: 'bg-blue-500'
  }
};

// Individual Toast Component
const Toast = ({ id, type, message, title, onClose, duration = 5000 }) => {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg shadow-lg max-w-sm w-full
        ${config.bgColor} ${config.borderColor}
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">{config.icon}</span>
          <div className="flex-1 min-w-0">
            {title && (
              <p className={`font-semibold ${config.textColor}`}>{title}</p>
            )}
            <p className={`text-sm ${config.textColor} ${title ? 'mt-1' : ''}`}>
              {message}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
        <div 
          className={`h-full ${config.progressColor} animate-shrink`}
          style={{ 
            animation: `shrink ${duration}ms linear forwards` 
          }}
        />
      </div>
    </div>
  );
};

// Toast Container Component
export const ToastContainer = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message, title = 'Berhasil') => {
    return addToast({ type: 'success', message, title });
  }, [addToast]);

  const showError = useCallback((message, title = 'Error') => {
    return addToast({ type: 'error', message, title });
  }, [addToast]);

  const showWarning = useCallback((message, title = 'Perhatian') => {
    return addToast({ type: 'warning', message, title });
  }, [addToast]);

  const showInfo = useCallback((message, title = 'Info') => {
    return addToast({ type: 'info', message, title });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      
      {/* Toast Portal */}
      <div 
        className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              type={toast.type}
              message={toast.message}
              title={toast.title}
              onClose={removeToast}
              duration={toast.duration}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastContainer');
  }
  return context;
};

// Standalone toast functions (untuk penggunaan di luar React context)
let toastRef = null;

export const setToastRef = (ref) => {
  toastRef = ref;
};

export const showSuccess = (message, title) => {
  if (toastRef) {
    toastRef.showSuccess(message, title);
  } else {
    console.log('✅', title || 'Success:', message);
  }
};

export const showError = (message, title) => {
  if (toastRef) {
    toastRef.showError(message, title);
  } else {
    console.error('❌', title || 'Error:', message);
  }
};

export const showWarning = (message, title) => {
  if (toastRef) {
    toastRef.showWarning(message, title);
  } else {
    console.warn('⚠️', title || 'Warning:', message);
  }
};

export const showInfo = (message, title) => {
  if (toastRef) {
    toastRef.showInfo(message, title);
  } else {
    console.info('ℹ️', title || 'Info:', message);
  }
};

export default ToastContainer;
