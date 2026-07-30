import React from 'react';

export const SectionCard = ({ title, icon, color = "blue", children }) => {
  const colorClasses = {
    emerald: {
      bg: "bg-gradient-to-br from-emerald-50 to-green-50",
      border: "border-emerald-200",
      icon: "text-emerald-600",
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
      border: "border-blue-200",
      icon: "text-blue-600",
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-pink-50",
      border: "border-purple-200",
      icon: "text-purple-600",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-orange-50",
      border: "border-amber-200",
      icon: "text-amber-600",
    },
    orange: {
        bg: "bg-gradient-to-br from-orange-50 to-amber-50",
        border: "border-orange-200",
        icon: "text-orange-600",
    },
    rose: {
        bg: "bg-gradient-to-br from-rose-50 to-pink-50",
        border: "border-rose-200",
        icon: "text-rose-600",
    },
    teal: {
        bg: "bg-gradient-to-br from-teal-50 to-emerald-50",
        border: "border-teal-200",
        icon: "text-teal-600",
    },
    indigo: {
        bg: "bg-gradient-to-br from-indigo-50 to-blue-50",
        border: "border-indigo-200",
        icon: "text-indigo-600",
    }
  };

  const selectedColor = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden mb-8">
      <div className={`${selectedColor.bg} border-b-2 ${selectedColor.border} px-6 py-4`}>
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
          <span className={`text-2xl ${selectedColor.icon}`}>{icon}</span>
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

export const Alert = ({ type = "info", message, onDismiss }) => {
    const styles = {
      error: "bg-red-50 border-red-300 text-red-800",
      success: "bg-green-50 border-green-300 text-green-800",
      warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
      info: "bg-blue-50 border-blue-300 text-blue-800",
    };
  
    const icons = {
      error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
      success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    };
  
    return (
      <div className={`border-2 rounded-xl p-4 ${styles[type]} flex items-start gap-3 shadow-sm mb-4`}>
        <svg
          className="w-6 h-6 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={icons[type]}
          />
        </svg>
        <p className="text-sm font-medium flex-1">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 hover:opacity-70 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  };
