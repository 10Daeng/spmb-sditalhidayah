import React, { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormTextarea, FormRow, FormFileUpload } from '../ui/FormComponents';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { SectionCard } from '../ui/LayoutComponents';
import { ToastContainer, useToast } from '../ui/Toast';
import { ErrorMessage, SuccessMessage, InfoMessage } from '../ui/Messages';
import ProgressStepper from '../ui/ProgressStepper';

/**
 * Complete Data Form Component
 * Form untuk melengkapi data siswa setelah Indent diverifikasi
 */

import { compressImage } from '../../lib/imageCompression';

// Wrapper dengan ToastContainer
const CompleteDataFormWithToast = () => (
  <ToastContainer>
    <CompleteDataFormInner />
  </ToastContainer>
);

const CompleteDataFormInner = () => {
  const toast = useToast();
  
  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);

  // Form data for additional fields
  const [formData, setFormData] = useState({
    // Dokumen Tambahan
    fileKK: null,
    fileAkta: null,
    fileFoto: null,
    fileIjazahTK: null,
    fileRaport: null,
    fileSKHB: null, // Surat Keterangan Sehat
    
    // Data Tambahan
    golonganDarahSiswa: '',
    rhesus: '',
    tinggiBadan: '',
    beratBadan: '',
    ukuranBaju: '',
    ukuranSepatu: '',
    
    // Kontak Darurat
    namaKontakDarurat: '',
    hubunganKontakDarurat: '',
    noHpKontakDarurat: '',
    
    // Pernyataan
    pernyataanDataBenar: false,
    pernyataanTaatPeraturan: false,
    pernyataanBiaya: false,
    
    // Catatan Tambahan
    catatanKhusus: ''
  });

  const [fileNames, setFileNames] = useState({
    fileKK: '',
    fileAkta: '',
    fileFoto: '',
    fileIjazahTK: '',
    fileRaport: '',
    fileSKHB: ''
  });

  // Load registration data on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regNumber = params.get('reg');
    
    if (regNumber) {
      fetchRegistrationData(regNumber);
    } else {
      setError('Nomor registrasi tidak ditemukan di URL. Silakan akses halaman ini melalui link yang dikirim ke Email/WhatsApp Anda.');
      setLoading(false);
    }
  }, []);

  const fetchRegistrationData = async (regNumber) => {
    try {
      const response = await fetch(`/api/dashboard/parent?reg=${encodeURIComponent(regNumber)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Data tidak ditemukan');
      }

      // Check if status allows data completion
      if (!['lulus', 'document_complete'].includes(result.data.status)) {
        if (result.data.status === 'pending') {
          setError('Data Indent Anda masih menunggu verifikasi. Lengkapi data ini setelah dinyatakan Lulus.');
        } else if (result.data.status === 'verified' || result.data.status === 'scheduled') {
          setError('Anda masih dalam tahap tes/pembayaran awal. Silakan selesaikan tahapan tersebut. Lengkapi data daftar ulang setelah Anda dinyatakan Lulus.');
        } else if (result.data.status === 'rejected' || result.data.status === 'tidak_lulus') {
          setError('Maaf, Indent Anda tidak dapat dilanjutkan karena ditolak atau tidak lulus seleksi.');
        } else {
          setError(`Status saat ini (${result.data.status}) tidak mengizinkan pengisian data kelengkapan.`);
        }
        setLoading(false);
        return;
      }

      setRegistration(result.data);
      
      // Pre-fill existing data if available
      if (result.data.students) {
        setStudentData(result.data.students);
      }

      // Load existing uploaded files info
      if (result.data.document_urls) {
        // TODO: Parse and show existing files
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      let file = files[0];
      if (file) {
        try {
          file = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
        } catch (err) {
          console.error("Compression error:", err);
        }
      }
      setFormData(prev => ({ ...prev, [name]: file }));
      setFileNames(prev => ({ ...prev, [name]: file ? file.name : '' }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  const nextStep = () => {
    setStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate pernyataan
    if (!formData.pernyataanDataBenar || !formData.pernyataanTaatPeraturan || !formData.pernyataanBiaya) {
      toast.showError('Mohon centang semua pernyataan untuk melanjutkan.');
      return;
    }

    setSubmitting(true);

    try {
      toast.showInfo('Menyimpan data...', 'Mohon Tunggu');

      const formDataToSend = new FormData();
      
      // Add registration number
      formDataToSend.append('registration_number', registration.registration_number);
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== null && value !== undefined && value !== '') {
          formDataToSend.append(key, value);
        }
      });

      const response = await fetch('/api/dashboard/complete-data', {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan data');
      }

      setSuccess(true);
      toast.showSuccess('Data berhasil disimpan!', '✅ Berhasil');

    } catch (err) {
      console.error('Submit error:', err);
      toast.showError(err.message, 'Gagal Menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data Indent...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Dapat Mengakses</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="/dashboard/parent"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Berhasil Dilengkapi!</h2>
          <p className="text-gray-600 mb-6">
            Terima kasih telah melengkapi data ananda <strong>{registration.student_full_name}</strong>. 
            Anda akan dihubungi kembali untuk jadwal tes/observasi.
          </p>
          
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <h4 className="font-semibold text-blue-800 mb-2">📋 Langkah Selanjutnya:</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Tunggu informasi jadwal tes/observasi via WhatsApp</li>
              <li>Siapkan ananda untuk mengikuti tes</li>
              <li>Pantau status di Dashboard Orang Tua</li>
            </ol>
          </div>
          
          <a 
            href={`/dashboard/parent?reg=${registration.registration_number}`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            📊 Lihat Status Indent
          </a>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Lengkapi Data Siswa</h1>
                <p className="text-xs text-gray-500">SPMB SDIT Al-Hidayah Sumenep</p>
              </div>
            </div>
            <a 
              href={`/dashboard/parent?reg=${registration?.registration_number || ''}`}
              className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Student Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <p className="text-blue-100 text-sm">Data Siswa</p>
              <h2 className="text-xl font-bold">{registration?.student_full_name}</h2>
              <p className="text-blue-200 text-sm font-mono">{registration?.registration_number}</p>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center relative px-4">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-500" 
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            
            {['Dokumen', 'Data Fisik', 'Darurat', 'Pernyataan'].map((label, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                  ${step > idx + 1 ? 'bg-green-500 text-white' : step === idx + 1 ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-400'}
                `}>
                  {step > idx + 1 ? '✓' : idx + 1}
                </div>
                <span className={`text-xs font-semibold ${step >= idx + 1 ? 'text-blue-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Step 1: Dokumen */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <SectionCard title="Upload Dokumen Pendukung" icon="📂" color="orange">
                <InfoMessage 
                  message="Upload dokumen dengan jelas dan terbaca. Format: JPG, PNG, atau PDF (Maks 2MB per file)" 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <FormFileUpload 
                    name="fileKK" 
                    label="Kartu Keluarga (KK)" 
                    onChange={handleChange}
                    fileName={fileNames.fileKK}
                    hint="Wajib"
                    required
                  />
                  <FormFileUpload 
                    name="fileAkta" 
                    label="Akta Kelahiran" 
                    onChange={handleChange}
                    fileName={fileNames.fileAkta}
                    hint="Wajib"
                    required
                  />
                  <FormFileUpload 
                    name="fileFoto" 
                    label="Pas Foto 3x4 (Latar Merah)" 
                    onChange={handleChange}
                    fileName={fileNames.fileFoto}
                    accept="image/*"
                    hint="Wajib"
                    required
                  />
                  <FormFileUpload 
                    name="fileIjazahTK" 
                    label="Ijazah/STTB TK" 
                    onChange={handleChange}
                    fileName={fileNames.fileIjazahTK}
                    hint="Jika ada"
                  />
                  <FormFileUpload 
                    name="fileRaport" 
                    label="Rapor TK Terakhir" 
                    onChange={handleChange}
                    fileName={fileNames.fileRaport}
                    hint="Jika ada"
                  />
                  <FormFileUpload 
                    name="fileSKHB" 
                    label="Surat Keterangan Sehat" 
                    onChange={handleChange}
                    fileName={fileNames.fileSKHB}
                    hint="Dari Puskesmas/RS"
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* Step 2: Data Fisik */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <SectionCard title="Data Fisik & Kesehatan" icon="📏" color="teal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormRow label="Golongan Darah">
                    <FormSelect name="golonganDarahSiswa" value={formData.golonganDarahSiswa} onChange={handleChange}>
                      <option value="">Pilih...</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                      <option value="Belum Tahu">Belum Tahu</option>
                    </FormSelect>
                  </FormRow>
                  
                  <FormRow label="Rhesus">
                    <FormSelect name="rhesus" value={formData.rhesus} onChange={handleChange}>
                      <option value="">Pilih...</option>
                      <option value="Positif (+)">Positif (+)</option>
                      <option value="Negatif (-)">Negatif (-)</option>
                      <option value="Belum Tahu">Belum Tahu</option>
                    </FormSelect>
                  </FormRow>
                  
                  <FormRow label="Tinggi Badan (cm)">
                    <FormInput 
                      type="number" 
                      name="tinggiBadan" 
                      value={formData.tinggiBadan} 
                      onChange={handleChange}
                      placeholder="Cth: 110"
                    />
                  </FormRow>
                  
                  <FormRow label="Berat Badan (kg)">
                    <FormInput 
                      type="number" 
                      name="beratBadan" 
                      value={formData.beratBadan} 
                      onChange={handleChange}
                      placeholder="Cth: 20"
                    />
                  </FormRow>
                  
                  <FormRow label="Ukuran Baju Seragam">
                    <FormSelect name="ukuranBaju" value={formData.ukuranBaju} onChange={handleChange}>
                      <option value="">Pilih...</option>
                      <option value="XS (4-5 Tahun)">XS (4-5 Tahun)</option>
                      <option value="S (6-7 Tahun)">S (6-7 Tahun)</option>
                      <option value="M (8-9 Tahun)">M (8-9 Tahun)</option>
                      <option value="L (10-11 Tahun)">L (10-11 Tahun)</option>
                      <option value="XL (12+ Tahun)">XL (12+ Tahun)</option>
                    </FormSelect>
                  </FormRow>
                  
                  <FormRow label="Ukuran Sepatu">
                    <FormInput 
                      type="number" 
                      name="ukuranSepatu" 
                      value={formData.ukuranSepatu} 
                      onChange={handleChange}
                      placeholder="Cth: 28"
                    />
                  </FormRow>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Step 3: Kontak Darurat */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <SectionCard title="Kontak Darurat" icon="📞" color="red">
                <InfoMessage 
                  message="Kontak yang dapat dihubungi selain orang tua jika terjadi keadaan darurat." 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <FormRow label="Nama Kontak Darurat" required className="md:col-span-2">
                    <FormInput 
                      name="namaKontakDarurat" 
                      value={formData.namaKontakDarurat} 
                      onChange={handleChange}
                      placeholder="Nama lengkap"
                      required
                    />
                  </FormRow>
                  
                  <FormRow label="Hubungan dengan Siswa" required>
                    <FormSelect name="hubunganKontakDarurat" value={formData.hubunganKontakDarurat} onChange={handleChange} required>
                      <option value="">Pilih...</option>
                      <option value="Kakek">Kakek</option>
                      <option value="Nenek">Nenek</option>
                      <option value="Paman">Paman</option>
                      <option value="Bibi">Bibi</option>
                      <option value="Kakak">Kakak</option>
                      <option value="Tetangga">Tetangga</option>
                      <option value="Lainnya">Lainnya</option>
                    </FormSelect>
                  </FormRow>
                  
                  <FormRow label="No. HP Kontak Darurat" required>
                    <FormInput 
                      name="noHpKontakDarurat" 
                      value={formData.noHpKontakDarurat} 
                      onChange={handleChange}
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </FormRow>
                </div>

                <div className="mt-6">
                  <FormRow label="Catatan Khusus (Opsional)">
                    <FormTextarea 
                      name="catatanKhusus" 
                      value={formData.catatanKhusus} 
                      onChange={handleChange}
                      placeholder="Informasi tambahan yang perlu diketahui sekolah (alergi, kondisi kesehatan khusus, dll)"
                      rows={3}
                    />
                  </FormRow>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Step 4: Pernyataan */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <SectionCard title="Surat Pernyataan Orang Tua/Wali" icon="✍️" color="purple">
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm mb-6">
                    Dengan ini saya sebagai orang tua/wali dari <strong>{registration?.student_full_name}</strong> 
                    menyatakan bahwa:
                  </p>
                  
                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      name="pernyataanDataBenar"
                      checked={formData.pernyataanDataBenar}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      <strong>Data yang saya berikan adalah benar</strong> dan dapat dipertanggungjawabkan. 
                      Jika dikemudian hari ditemukan ketidaksesuaian, saya bersedia menerima sanksi sesuai ketentuan yang berlaku.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      name="pernyataanTaatPeraturan"
                      checked={formData.pernyataanTaatPeraturan}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      <strong>Bersedia mematuhi seluruh peraturan sekolah</strong> dan mendukung program pembelajaran 
                      yang diselenggarakan oleh SDIT Al-Hidayah Sumenep.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      name="pernyataanBiaya"
                      checked={formData.pernyataanBiaya}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      <strong>Bersedia memenuhi kewajiban finansial</strong> sesuai ketentuan yang berlaku, 
                      termasuk biaya Indent, SPP, dan biaya lainnya yang telah ditentukan.
                    </span>
                  </label>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Perhatian:</strong> Dengan mengirimkan formulir ini, Anda menyetujui semua pernyataan di atas. 
                    Pastikan semua data sudah benar sebelum melanjutkan.
                  </p>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {step > 1 ? (
              <SecondaryButton type="button" onClick={prevStep}>
                ← Kembali
              </SecondaryButton>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <PrimaryButton type="button" onClick={nextStep}>
                Selanjutnya →
              </PrimaryButton>
            ) : (
              <PrimaryButton 
                type="submit" 
                loading={submitting}
                disabled={!formData.pernyataanDataBenar || !formData.pernyataanTaatPeraturan || !formData.pernyataanBiaya}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                ✅ Kirim Data
              </PrimaryButton>
            )}
          </div>
        </form>
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

export default CompleteDataFormWithToast;
