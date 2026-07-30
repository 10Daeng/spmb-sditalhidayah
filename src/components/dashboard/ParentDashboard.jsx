import React, { useState, useEffect } from 'react';
import ProgressStepper from '../ui/ProgressStepper';
import { 
  ActionRequiredCard, 
  StudentInfoCard, 
  ContactInfoCard 
} from '../ui/StatusCards';
import { ErrorMessage, InfoMessage } from '../ui/Messages';

/**
 * Parent Dashboard Component
 * Halaman untuk mengecek status pendaftaran anak
 */

const ParentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [settings, setSettings] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);

  // Check URL params for registration number
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regNumber = params.get('reg') || params.get('registration');
    
    if (regNumber) {
      setSearchQuery(regNumber);
      fetchRegistration(regNumber);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchRegistration = async (regNumber) => {
    if (!regNumber.trim()) return;
    
    setLoading(true);
    setError(null);
    setSearched(true);
    
    try {
        const response = await fetch(`/api/dashboard/parent?reg=${encodeURIComponent(regNumber.trim())}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Indent tidak ditemukan');
        }

        setRegistration(result.data);
        setSettings(result.settings || {});
    } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setRegistration(null);
        setSettings({});
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRegistration(searchQuery);
  };

  // Render Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl">🎓</a>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Cek Status Pendaftaran</h1>
                <p className="text-xs text-gray-500">SPMB SDIT Al-Hidayah Sumenep</p>
              </div>
            </div>
            <a 
              href="/"
              className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1"
            >
              ← Kembali
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            🔍 Cek Status Pendaftaran
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan No. Registrasi (cth: REG-20260119-1234)"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage 
            errors={[error]} 
            title="Indent tidak ditemukan"
          />
        )}

        {/* No Search Yet */}
        {!searched && !registration && (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Masukkan Nomor Registrasi
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Untuk melihat status Indent, silakan masukkan nomor registrasi 
              yang Anda terima saat mendaftar.
            </p>
          </div>
        )}

        {/* Registration Found - Show Dashboard */}
        {registration && (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">
                    Assalamu'alaikum, Bapak/Ibu {registration.parent_name}
                  </h2>
                  <p className="text-blue-100">
                    Berikut adalah status Indent ananda {registration.student_full_name}
                  </p>
                </div>
                <a 
                  href={`/spmb/cetak-bukti?reg=${registration.registration_number}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg text-sm font-semibold border border-white/30 backdrop-blur-sm whitespace-nowrap"
                >
                  <span>🖨️</span> Cetak Bukti
                </a>
              </div>
            </div>

            {/* Action Required */}
            <ActionRequiredCard 
              status={registration.status}
              studentName={registration.student_full_name}
              actionUrl={`/dashboard/lengkapi-data?reg=${registration.registration_number}`}
            />

            {/* Progress Stepper */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <span>📊</span> Status Proses SPMB
              </h3>
              <ProgressStepper currentStatus={registration.status} />
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StudentInfoCard student={registration} />
              <ContactInfoCard 
                committeeName="Panitia SPMB"
                committeePhone={settings.contact_whatsapp || "0812-3456-7890"}
                scheduleInfo={registration.test_date || 'Akan diumumkan'}
              />
            </div>

            {/* Payment Info */}
            {registration.payments && registration.payments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span>💳</span> Informasi Tagihan
                </h3>
                <div className="space-y-3">
                  {registration.payments.map((p, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex justify-between items-center p-4 border rounded-t-lg bg-gray-50 z-10">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm capitalize">{p.payment_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-bold text-gray-900">Rp {p.amount.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        {p.status === 'paid' || p.status === 'overpaid' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">LUNAS</span>
                        ) : p.status === 'partial' ? (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">DIBAYAR SEBAGIAN</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">BELUM LUNAS</span>
                        )}
                      </div>
                    </div>
                    {p.status !== 'paid' && p.status !== 'overpaid' && (
                      <div className="px-4 pb-4 bg-gray-50 rounded-b-lg border-x border-b -mt-1 pt-2">
                        {p.proof_image_url ? (
                          <div className="text-sm text-blue-700 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span>✅</span> Bukti pembayaran telah diunggah. Menunggu konfirmasi admin.
                          </div>
                        ) : (
                          <PaymentUploader 
                            payment={p} 
                            regNumber={registration.registration_number} 
                            onUploadSuccess={() => fetchRegistration(registration.registration_number)} 
                          />
                        )}
                      </div>
                    )}
                  </div>
                  ))}
                  <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded text-center border border-blue-100">
                    Untuk pembayaran, silakan transfer ke <strong>{settings.bank_account || 'BSI: 123456789 a.n SDIT Al-Hidayah'}</strong>, atau bayar tunai di sekolah, lalu konfirmasi ke panitia (Bawa/kirim/upload bukti pembayaran).
                  </div>
                </div>
              </div>
            )}

            {/* Timeline / History */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📅</span> Riwayat
              </h3>
              <div className="space-y-4">
                <TimelineItem 
                  date={registration.created_at}
                  title="Indent Diterima"
                  description="Formulir Indent berhasil dikirim"
                  status="completed"
                />
                {registration.verified_at && (
                  <TimelineItem 
                    date={registration.verified_at}
                    title={registration.status === 'rejected' ? 'Indent Ditolak' : 'Verifikasi Selesai'}
                    description={registration.verification_notes || 'Berkas telah diverifikasi oleh panitia'}
                    status={registration.status === 'rejected' ? 'rejected' : 'completed'}
                  />
                )}
                {registration.test_date && (
                  <TimelineItem 
                    date={registration.test_date}
                    title="Jadwal Tes/Observasi"
                    description={`Waktu: ${registration.test_time || '-'}, Lokasi: ${registration.test_location || 'SDIT Al-Hidayah'}`}
                    status="active"
                  />
                )}
                {registration.result_announced_at && (
                  <TimelineItem 
                    date={registration.result_announced_at}
                    title="Pengumuman Hasil"
                    description={registration.status === 'lulus' ? 'Selamat! Ananda dinyatakan LULUS' : 'Ananda belum berhasil dalam seleksi'}
                    status={registration.status === 'lulus' ? 'completed' : 'rejected'}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2026 SDIT Al-Hidayah Sumenep. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// Timeline Item Component
const TimelineItem = ({ date, title, description, status = 'pending' }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const statusColors = {
    completed: 'bg-green-500',
    active: 'bg-blue-500 animate-pulse',
    pending: 'bg-gray-300',
    rejected: 'bg-red-500'
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
        <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
      </div>
      <div className="flex-1 pb-4">
        <p className="text-xs text-gray-400 mb-1">{formatDate(date)}</p>
        <p className={`font-semibold ${status === 'rejected' ? 'text-red-700' : 'text-gray-800'}`}>
          {title}
        </p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
};

const PaymentUploader = ({ payment, regNumber, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran maksimal file adalah 2MB');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('payment_id', payment.id);
    formData.append('reg_number', regNumber);

    try {
      const res = await fetch('/api/dashboard/upload-payment', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah bukti');

      alert('Bukti pembayaran berhasil diunggah!');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2">
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Upload Bukti Pembayaran (Maks 2MB)
      </label>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100 disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-blue-600 mt-2 font-medium">⏳ Mengunggah...</p>}
      {error && <p className="text-xs text-red-600 mt-2 font-medium">❌ {error}</p>}
    </div>
  );
};

export default ParentDashboard;
