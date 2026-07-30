import React from 'react';
import ProgressStepper from './ProgressStepper';

/**
 * Status Card Component
 * Card untuk menampilkan status dan aksi yang dibutuhkan di dashboard
 * Terinspirasi dari spmb-frontend parent dashboard
 */

// Action Required Card
export const ActionRequiredCard = ({ 
  status, 
  studentName, 
  onAction,
  actionLabel = 'Lengkapi Sekarang',
  actionUrl = '/spmb'
}) => {
  // Determine message and style based on status
  const getConfig = () => {
    switch (status) {
      case 'pending':
        return {
          show: true,
          color: 'yellow',
          icon: '⏳',
          title: 'Menunggu Verifikasi',
          message: `Indent ananda ${studentName} sedang dalam proses verifikasi oleh panitia. Harap tunggu notifikasi lebih lanjut.`,
          showAction: false
        };
      case 'verified':
        return {
          show: true,
          color: 'blue',
          icon: '📝',
          title: 'Menunggu Pembayaran Indent',
          message: `Data Indent ananda ${studentName} telah diverifikasi. Silakan periksa informasi tagihan di bawah, atau tunggu arahan pembayaran.`,
          showAction: false
        };
      case 'calon_peserta':
      case 'assessment':
      case 'interview':
      case 'scheduled':
        return {
          show: true,
          color: 'purple',
          icon: '📅',
          title: 'Jadwal Tes/Observasi',
          message: `Berkas dan pembayaran telah terverifikasi. Jadwal tes untuk ananda ${studentName} sudah tersedia. Silakan cetak kartu ujian/observasi.`,
          showAction: true,
          actionLabel: '🖨️ Cetak Kartu Ujian',
          actionUrl: '/spmb/cetak-kartu-tes'
        };
      case 'lulus':
        return {
          show: true,
          color: 'green',
          icon: '🎉',
          title: 'Selamat! Anda Lulus!',
          message: `Alhamdulillah, ananda ${studentName} dinyatakan LULUS seleksi. Silakan lakukan proses daftar ulang dengan melengkapi data siswa.`,
          showAction: true,
          actionLabel: 'Daftar Ulang',
          actionUrl: actionUrl !== '/spmb' ? actionUrl : '/dashboard/lengkapi-data'
        };
      case 'tidak_lulus':
        return {
          show: true,
          color: 'red',
          icon: '😔',
          title: 'Mohon Maaf',
          message: `Ananda ${studentName} belum berhasil dalam seleksi kali ini. Tetap semangat dan jangan menyerah!`,
          showAction: false
        };
      case 'rejected':
        return {
          show: true,
          color: 'red',
          icon: '❌',
          title: 'Indent Ditolak',
          message: `Indent ananda ${studentName} ditolak. Silakan hubungi panitia untuk informasi lebih lanjut.`,
          showAction: true,
          actionLabel: 'Hubungi Panitia'
        };
      default:
        return { show: false };
    }
  };

  const config = getConfig();

  if (!config.show) return null;

  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    blue: 'bg-blue-50 border-blue-400 text-blue-800',
    green: 'bg-green-50 border-green-400 text-green-800',
    red: 'bg-red-50 border-red-400 text-red-800',
    purple: 'bg-purple-50 border-purple-400 text-purple-800'
  };

  const buttonClasses = {
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  };

  return (
    <div className={`p-6 rounded-xl border-l-4 ${colorClasses[config.color]} animate-fade-in`}>
      <div className="flex items-start gap-4">
        <span className="text-3xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{config.title}</h3>
          <p className="mt-2">{config.message}</p>
          
          {config.showAction && (
            <div className="mt-4">
              {onAction ? (
                <button 
                  onClick={onAction}
                  className={`px-6 py-2 text-white rounded-lg shadow-md transition-all ${buttonClasses[config.color]}`}
                >
                  {config.actionLabel || actionLabel} →
                </button>
              ) : (
                <a 
                  href={actionUrl}
                  className={`inline-block px-6 py-2 text-white rounded-lg shadow-md transition-all ${buttonClasses[config.color]}`}
                >
                  {config.actionLabel || actionLabel} →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Student Info Card
export const StudentInfoCard = ({ student }) => {
  if (!student) return null;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100">
      <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
        <span>👤</span> Data Siswa
      </h4>
      <div className="space-y-3 text-sm">
        <InfoRow label="Nama Lengkap" value={student.full_name || student.student_full_name} />
        <InfoRow label="No. Registrasi" value={student.registration_number || student.registration_id} mono />
        <InfoRow label="Status" value={
          <StatusBadge status={student.status} />
        } />
        {student.date_of_birth && (
          <InfoRow label="Tanggal Lahir" value={new Date(student.date_of_birth).toLocaleDateString('id-ID')} />
        )}
        {student.gender && (
          <InfoRow label="Jenis Kelamin" value={student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} />
        )}
      </div>
    </div>
  );
};

// Contact Info Card
export const ContactInfoCard = ({ 
  committeeName = 'Panitia SPMB', 
  committeePhone = '0812-3456-7890',
  scheduleInfo = 'Jadwal akan diumumkan'
}) => {
  return (
    <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm border border-emerald-100">
      <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
        <span>📞</span> Informasi & Jadwal
      </h4>
      <div className="space-y-3 text-sm">
        <InfoRow label={committeeName} value={committeePhone} />
        <InfoRow label="Jadwal Tes" value={scheduleInfo} />
      </div>
    </div>
  );
};

// Registration Status Dashboard
export const RegistrationStatusDashboard = ({ registration }) => {
  if (!registration) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl">
        <p className="text-gray-500">Belum ada data Indent.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Card */}
      <ActionRequiredCard 
        status={registration.status}
        studentName={registration.student_full_name || registration.full_name}
      />
      
      {/* Progress Stepper */}
      <div className="p-6 bg-white rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Status Proses SPMB</h2>
        <ProgressStepper currentStatus={registration.status} />
      </div>
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StudentInfoCard student={registration} />
        <ContactInfoCard />
      </div>
    </div>
  );
};

// Helper Components
const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-600">{label}:</span>
    <span className={`font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
      {value}
    </span>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
    lulus: 'bg-green-100 text-green-800',
    tidak_lulus: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    enrolled: 'bg-emerald-100 text-emerald-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
};

export default {
  ActionRequiredCard,
  StudentInfoCard,
  ContactInfoCard,
  RegistrationStatusDashboard
};
