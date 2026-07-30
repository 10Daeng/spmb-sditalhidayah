import React from 'react';

/**
 * Progress Stepper Component
 * Menampilkan visual progress Indent dengan step-by-step indicator
 * Terinspirasi dari spmb-frontend tapi disesuaikan untuk sistem SPMB SDIT Al-Hidayah
 */

const ProgressStepper = ({ currentStatus, orientation = 'horizontal' }) => {
  // Definisikan semua langkah Indent
  const steps = [
    { 
      id: 'submitted', 
      name: 'Pendaftaran', 
      description: 'Formulir terkirim',
      icon: '📝'
    },
    { 
      id: 'payment', 
      name: 'Pembayaran', 
      description: 'Menunggu/Lunas',
      icon: '💰'
    },
    { 
      id: 'verified', 
      name: 'Verifikasi Data', 
      description: 'Berkas diverifikasi',
      icon: '✅'
    },
    { 
      id: 'calon_peserta', 
      name: 'Calon Peserta', 
      description: 'Penetapan & Jadwal',
      icon: '📋'
    },
    { 
      id: 'assessment', 
      name: 'Assesment', 
      description: 'Psikologis & Observasi',
      icon: '🧠'
    },
    { 
      id: 'interview', 
      name: 'Wawancara', 
      description: 'Wawancara Orangtua',
      icon: '🗣️'
    },
    { 
      id: 'result', 
      name: 'Pengumuman', 
      description: 'Hasil seleksi',
      icon: '📢'
    }
  ];

  // Tentukan langkah aktif berdasarkan status dari database
  const getActiveStepIndex = () => {
    switch (currentStatus) {
      case 'pending':
        return 0; // Or 1 if we consider payment pending, but let's say 0 is pendaftaran. We don't have a distinct payment status passed here unless we fetch it. Let's map pending to 0 or 1. If pending, it's at payment/verifikasi. Let's make pending = 1 (Pembayaran).
      case 'verified':
      case 'document_complete':
        return 2;
      case 'calon_peserta':
      case 'scheduled':
        return 3;
      case 'assessment':
        return 4;
      case 'interview':
        return 5;
      case 'lulus':
      case 'cadangan':
      case 'tidak_lulus':
      case 'enrolled':
        return 6;
      case 'rejected':
        return -1; // Ditolak
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex();
  const isRejected = currentStatus === 'rejected';

  // Fungsi untuk menentukan style (completed, active, pending, rejected)
  const getStepState = (index) => {
    if (isRejected) return 'rejected';
    if (index < activeIndex) return 'completed';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  // Horizontal Layout (Default)
  if (orientation === 'horizontal') {
    return (
      <div className="w-full">
        {/* Rejected Banner */}
        {isRejected && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <h4 className="font-semibold text-red-800">Indent Ditolak</h4>
                <p className="text-sm text-red-600">Silakan hubungi panitia SPMB untuk informasi lebih lanjut.</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-start justify-between">
          {steps.map((step, index) => {
            const state = getStepState(index);
            
            return (
              <React.Fragment key={step.id}>
                {/* Step Item */}
                <div className="flex flex-col items-center flex-1 relative">
                  {/* Circle */}
                  <div 
                    className={`
                      w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center
                      text-lg md:text-xl font-bold transition-all duration-300 shadow-sm
                      ${state === 'completed' 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white ring-4 ring-green-100' 
                        : state === 'active'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-4 ring-blue-100 animate-pulse'
                        : state === 'rejected'
                        ? 'bg-red-100 text-red-400 ring-4 ring-red-50'
                        : 'bg-gray-100 text-gray-400 ring-4 ring-gray-50'
                      }
                    `}
                  >
                    {state === 'completed' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="mt-3 text-center">
                    <p className={`
                      text-xs md:text-sm font-semibold
                      ${state === 'completed' ? 'text-green-700' 
                        : state === 'active' ? 'text-blue-700' 
                        : state === 'rejected' ? 'text-red-400'
                        : 'text-gray-400'
                      }
                    `}>
                      {step.name}
                    </p>
                    <p className={`
                      text-xs mt-0.5 hidden md:block
                      ${state === 'completed' ? 'text-green-500' 
                        : state === 'active' ? 'text-blue-500' 
                        : 'text-gray-300'
                      }
                    `}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 flex items-center mt-6 md:mt-7 mx-1">
                    <div 
                      className={`
                        h-1 w-full rounded-full transition-all duration-500
                        ${index < activeIndex 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gray-200'
                        }
                      `}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Current Status Text */}
        <div className="mt-8 text-center">
          <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            ${activeIndex >= 0 
              ? 'bg-blue-50 text-blue-700' 
              : 'bg-red-50 text-red-700'
            }
          `}>
            <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
            Status saat ini: <strong className="capitalize">{currentStatus?.replace(/_/g, ' ') || 'Menunggu'}</strong>
          </div>
        </div>
      </div>
    );
  }

  // Vertical Layout
  return (
    <div className="w-full">
      {isRejected && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
          <p className="text-sm text-red-700 font-medium">❌ Indent Ditolak</p>
        </div>
      )}

      <div className="space-y-0">
        {steps.map((step, index) => {
          const state = getStepState(index);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex items-start">
              {/* Circle & Line */}
              <div className="flex flex-col items-center mr-4">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${state === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : state === 'active'
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-400'
                    }
                  `}
                >
                  {state === 'completed' ? '✓' : step.icon}
                </div>
                {!isLast && (
                  <div 
                    className={`
                      w-0.5 h-12
                      ${index < activeIndex ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <p className={`
                  font-semibold
                  ${state === 'completed' ? 'text-green-700' 
                    : state === 'active' ? 'text-blue-700' 
                    : 'text-gray-400'
                  }
                `}>
                  {step.name}
                </p>
                <p className={`
                  text-sm
                  ${state === 'completed' ? 'text-green-500' 
                    : state === 'active' ? 'text-blue-500' 
                    : 'text-gray-300'
                  }
                `}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressStepper;
