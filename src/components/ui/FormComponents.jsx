import React from 'react';

export const FormInput = ({
  type = "text",
  name,
  value,
  onChange,
  disabled = false,
  placeholder = "",
  required = false,
  maxLength,
  className = "",
  ...props
}) => (
  <input
    type={type}
    name={name}
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder}
    required={required}
    maxLength={maxLength}
    className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl 
      focus:border-blue-500 focus:ring-4 focus:ring-blue-100 
      transition-all duration-200 outline-none
      disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
      hover:border-gray-300 disabled:hover:border-gray-200
      ${className}`}
    {...props}
  />
);

export const FormSelect = ({
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  children,
  className = "",
  ...props
}) => (
  <div className="relative">
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl 
        appearance-none cursor-pointer
        focus:border-blue-500 focus:ring-4 focus:ring-blue-100 
        transition-all duration-200 outline-none
        disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
        hover:border-gray-300 disabled:hover:border-gray-200
        ${className}`}
      {...props}
    >
      {children}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

export const FormTextarea = ({
  name,
  value,
  onChange,
  disabled = false,
  placeholder = "",
  required = false,
  rows = 3,
  className = "",
  ...props
}) => (
  <textarea
    name={name}
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder}
    required={required}
    rows={rows}
    className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl 
      focus:border-blue-500 focus:ring-4 focus:ring-blue-100 
      transition-all duration-200 outline-none resize-none
      disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
      hover:border-gray-300 disabled:hover:border-gray-200
      ${className}`}
    {...props}
  />
);

export const FormLabel = ({ label, required = false, hint = "" }) => (
  <div className="mb-2">
    <label className="block text-sm font-semibold text-gray-800">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

export const FormRow = ({
  label,
  children,
  required = false,
  hint = "",
  className = "",
}) => (
  <div className={className}>
    <FormLabel label={label} required={required} hint={hint} />
    {children}
  </div>
);

export const FormFileUpload = ({
  name,
  label,
  onChange,
  accept = "image/*,.pdf",
  required = false,
  className = "",
  hint = "",
  fileName = "" 
}) => {
  return (
    <div className={className}>
      <FormLabel label={label} required={required} hint={hint} />
      <div className={`relative border-2 border-dashed rounded-xl p-6 transition-colors text-center cursor-pointer group
        ${fileName ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:bg-gray-50 hover:border-blue-400'}`}>
        
        <input 
          type="file" 
          name={name} 
          onChange={onChange}
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        
        <div className="space-y-2 pointer-events-none relative z-20">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110
            ${fileName ? 'bg-white text-blue-600 shadow-sm' : 'bg-blue-50 text-blue-500'}`}>
             {fileName ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
             ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
             )}
          </div>
          
          {fileName ? (
             <div>
                <p className="text-blue-900 font-semibold text-sm truncate max-w-[200px] mx-auto">{fileName}</p>
                <p className="text-blue-600 text-xs mt-1">Klik untuk mengganti</p>
             </div>
          ) : (
             <>
                <p className="text-gray-600 font-medium text-sm">Klik atau seret file ke sini</p>
                <p className="text-gray-400 text-xs">JPG, PNG, PDF (Max 2MB)</p>
             </>
          )}
        </div>
      </div>
    </div>
  );
};
