import React, { useState, useCallback } from 'react';
import { FormInput, FormSelect, FormTextarea, FormRow, FormFileUpload } from './ui/FormComponents';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';
import { SectionCard, Alert } from './ui/LayoutComponents';
import { ToastContainer, useToast } from './ui/Toast';
import { ErrorMessage, SuccessMessage } from './ui/Messages';
import { validateNIK, validatePhone, validateRequired, validateFile } from '../lib/validation';

import { compressImage } from '../lib/imageCompression';

const API_BASE_URL = ''; // Relative path for same-origin API (Astro)

// Wrapper component dengan ToastContainer
const SpmbFormWithToast = ({ initialData, isCompletionMode }) => (
    <ToastContainer>
        <SpmbFormInner initialData={initialData} isCompletionMode={isCompletionMode} />
    </ToastContainer>
);

const SpmbFormInner = ({ initialData, isCompletionMode }) => {
    const toast = useToast();
    // Start at step 2 if in completion mode, otherwise step 1
    const [step, setStep] = useState(isCompletionMode ? 2 : 1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [registrationResult, setRegistrationResult] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    
    // Initial State - COMPREHENSIVE VERSION
    const [formData, setFormData] = useState(initialData || {
        // --- STEP 0: JENIS PENDAFTARAN ---
        jenisPendaftaran: 'murid_baru',
        
        // --- STEP 1: IDENTITAS SISWA ---
        namaLengkap: '',
        namaPanggilan: '',
        nik: '',
        nisn: '', 
        tempatLahir: '',
        tanggalLahir: '',
        jenisKelamin: 'L',
        agama: '',
        kewarganegaraan: 'WNI',
        anakKe: '',
        jumlahSaudara: '',
        alamatKK: '',
        isDomisiliBerbeda: false,
        alamatDomisili: '',
        bahasaSehariHari: '',

        // --- STEP 2: ORANG TUA / WALI ---
        // Ayah
        namaAyah: '',
        statusAyah: 'Hidup',
        nikAyah: '',
        tempatLahirAyah: '',
        tanggalLahirAyah: '',
        pendidikanAyah: '',
        pekerjaanAyah: '',
        namaKantorAyah: '',
        penghasilanAyah: '',
        noHpAyah: '',
        emailAyah: '',
        
        // Ibu
        namaIbu: '',
        statusIbu: 'Hidup',
        nikIbu: '',
        tempatLahirIbu: '',
        tanggalLahirIbu: '',
        pendidikanIbu: '',
        pekerjaanIbu: '',
        namaKantorIbu: '',
        penghasilanIbu: '',
        noHpIbu: '',
        emailIbu: '',

        // Wali
        adaWali: false,
        namaWali: '',
        hubunganWali: '',
        noHpWali: '',
        pekerjaanWali: '',

        // --- STEP 3: RIWAYAT KESEHATAN & FISIK ---
        tinggiBadan: '',
        beratBadan: '',
        lingkarKepala: '',
        lingkarLenganAtas: '', // NEW
        golonganDarah: '',
        riwayatPenyakit: '',
        riwayatRawatInap: '', // NEW
        alergi: '', 
        imunisasi: '',
        kondisiFisikKhusus: '', // NEW - Kebutuhan Khusus

        // Riwayat Kelahiran (NEW)
        prosesKelahiran: '',
        asupanBayi: '',
        merekSusu: '',
        prosesMerangkak: '',

        // Riwayat Sekolah
        asalSekolah: '', 
        namaSekolahAsal: '',
        alamatSekolahAsal: '',
        
        // --- STEP 4: PERKEMBANGAN & LINGKUNGAN ---
        // Perkembangan Umum (NEW DETAILED)
        perkembanganMotorik: '',
        perkembanganBahasa: '',
        perkembanganSosial: '', 
        kemandirian: '',
        kemandirianToilet: '',
        
        // Kebiasaan (NEW)
        kebiasaanTidur: '',
        kebiasaanMakan: '',
        
        // Akademik Dasar
        kemampuanMembaca: '',
        kemampuanMenulis: '', // NEW
        kemampuanBerhitung: '',
        
        // Psikologis & Minat
        gayaBelajar: '',
        minatBakat: '',
        riwayatBullying: '', // NEW
        
        // Gadget
        durasiGadget: '',
        aturanGadget: '',
        kontenGadget: '',

        // Lingkungan
        jarakKeSekolah: '',
        modaTransportasi: '',
        motivasiMasuk: '',

        // --- STEP 5: DOKUMEN PENDUKUNG ---
        fileKK: null,
        fileAkta: null,
        fileFoto: null,
        fileRapor: null
    });

    const [fileNames, setFileNames] = useState({
        fileKK: '',
        fileAkta: '',
        fileFoto: '',
        fileRapor: ''
    });

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

    const handleStatusOrangTua = (parentType, isDeceased) => {
        setFormData(prev => ({
            ...prev,
            [`status${parentType}`]: isDeceased ? 'Meninggal' : 'Hidup'
        }));
    };

    const nextStep = () => {
        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Validate current step before proceeding
    const validateCurrentStep = () => {
        const errors = [];
        
        if (step === 1) {
            // Validate Step 1
            if (!formData.namaLengkap || formData.namaLengkap.length < 3) {
                errors.push('Nama lengkap minimal 3 karakter');
            }
            if (!formData.tempatLahir) errors.push('Tempat lahir wajib diisi');
            if (!formData.tanggalLahir) errors.push('Tanggal lahir wajib diisi');
            if (!formData.alamatKK || formData.alamatKK.length < 10) {
                errors.push('Alamat lengkap minimal 10 karakter');
            }
            
            // NIK validation
            if (formData.nik) {
                const nikResult = validateNIK(formData.nik, false);
                if (!nikResult.valid) errors.push(`NIK: ${nikResult.error}`);
            }
        }
        
        if (step === 2) {
            // Validate Step 2 - Parent data
            if (!formData.namaAyah && !formData.namaIbu) {
                errors.push('Minimal salah satu nama orang tua harus diisi');
            }
            
            const bothDeceased = formData.statusAyah === 'Meninggal' && formData.statusIbu === 'Meninggal';
            
            if (!bothDeceased) {
                const primaryPhone = formData.noHpAyah || formData.noHpIbu;
                if (!primaryPhone) {
                    errors.push('Minimal satu nomor HP orang tua wajib diisi');
                } else {
                    const phoneResult = validatePhone(primaryPhone, true);
                    if (!phoneResult.valid) errors.push(`No. HP Orang Tua: ${phoneResult.error}`);
                }
            }
            
            if (formData.adaWali) {
                if (!formData.namaWali) errors.push('Nama wali wajib diisi');
                if (!formData.noHpWali) {
                    errors.push('No. HP Wali wajib diisi');
                } else {
                    const phoneResult = validatePhone(formData.noHpWali, true);
                    if (!phoneResult.valid) errors.push(`No. HP Wali: ${phoneResult.error}`);
                }
            } else if (bothDeceased) {
                errors.push('Data wali wajib diisi karena kedua orang tua telah meninggal');
            }
        }
        
        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Final validation
        if (!validateCurrentStep()) {
            toast.showError('Mohon periksa kembali data Anda');
            return;
        }
        
        setLoading(true);
        setSuccess(false);
        setValidationErrors([]);

        try {
            toast.showInfo('Mengirim data Indent...', 'Mohon Tunggu');
            
            const formDataToSend = new FormData();
            
            // Append all fields
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                if (value !== null && value !== undefined) {
                    formDataToSend.append(key, value);
                }
            });

            if (isCompletionMode && initialData?.registration_number) {
                formDataToSend.append('registration_form_number', initialData.registration_number);
            }

            const endpoint = isCompletionMode 
                ? `${API_BASE_URL}/api/registration/complete-data` 
                : `${API_BASE_URL}/api/registration/submit`;

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formDataToSend,
            });

            const result = await response.json();

            if (!response.ok) {
                // Handle validation errors from server
                if (result.errors && Array.isArray(result.errors)) {
                    setValidationErrors(result.errors);
                    throw new Error('Validasi gagal. Mohon periksa data Anda.');
                }
                throw new Error(result.error || 'Terjadi kesalahan saat mengirim Indent.');
            }

            // Success!
            setSuccess(true);
            setRegistrationResult({
                registrationNumber: result.registration_number,
                message: result.message
            });
            
            toast.showSuccess(
                `No. Registrasi: ${result.registration_number}`,
                '🎉 Indent Berhasil!'
            );
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error("Submission Error:", error);
            toast.showError(error.message, 'Indent Gagal');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER STEPS ---

    const renderStep1 = () => (
        <div className="space-y-6 animate-fade-in">
            <SectionCard title="Jenis Indent" icon="📋" color="indigo">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.jenisPendaftaran === 'murid_baru' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="jenisPendaftaran" value="murid_baru" checked={formData.jenisPendaftaran === 'murid_baru'} onChange={handleChange} className="w-5 h-5 text-indigo-600" />
                        <div>
                            <span className="font-semibold text-gray-900">Murid Baru</span>
                            <p className="text-xs text-gray-500 mt-0.5">Belum pernah bersekolah di SDIT Al-Hidayah</p>
                        </div>
                    </label>
                    <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.jenisPendaftaran === 'mutasi' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="jenisPendaftaran" value="mutasi" checked={formData.jenisPendaftaran === 'mutasi'} onChange={handleChange} className="w-5 h-5 text-indigo-600" />
                        <div>
                            <span className="font-semibold text-gray-900">Mutasi / Pindahan</span>
                            <p className="text-xs text-gray-500 mt-0.5">Pindahan dari sekolah lain</p>
                        </div>
                    </label>
                </div>
            </SectionCard>

            <SectionCard title="Identitas Calon Siswa" icon="👤" color="blue">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormRow label="Nama Lengkap" required className="md:col-span-2">
                        <FormInput name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} placeholder="Sesuai Akta Kelahiran" required />
                    </FormRow>
                    <FormRow label="Nama Panggilan" required>
                        <FormInput name="namaPanggilan" value={formData.namaPanggilan} onChange={handleChange} required />
                    </FormRow>
                    <FormRow label="NIK Siswa" required>
                        <FormInput name="nik" value={formData.nik} onChange={handleChange} placeholder="16 digit NIK" required maxLength={16} />
                    </FormRow>
                    <FormRow label="Tempat Lahir" required>
                        <FormInput name="tempatLahir" value={formData.tempatLahir} onChange={handleChange} required />
                    </FormRow>
                    <FormRow label="Tanggal Lahir" required>
                        <FormInput type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleChange} required />
                    </FormRow>
                    <FormRow label="Jenis Kelamin" required>
                        <FormSelect name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange}>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </FormSelect>
                    </FormRow>
                    <FormRow label="Kewarganegaraan" required>
                        <FormSelect name="kewarganegaraan" value={formData.kewarganegaraan} onChange={handleChange}>
                            <option value="WNI">WNI</option>
                            <option value="WNI Keturunan">WNI Keturunan</option>
                            <option value="WNA">Warga Negara Asing</option>
                        </FormSelect>
                    </FormRow>
                    <FormRow label="Anak Ke-" required>
                        <div className="flex gap-4">
                            <FormInput type="number" name="anakKe" value={formData.anakKe} onChange={handleChange} placeholder="Ke" required className="w-1/2" />
                            <FormInput type="number" name="jumlahSaudara" value={formData.jumlahSaudara} onChange={handleChange} placeholder="Dari brp saudara" required className="w-1/2" />
                        </div>
                    </FormRow>
                     <FormRow label="Bahasa Sehari-hari" required>
                        <FormInput name="bahasaSehariHari" value={formData.bahasaSehariHari} onChange={handleChange} placeholder="Cth: Indonesia, Jawa" required />
                    </FormRow>
                </div>
            </SectionCard>

            <SectionCard title="Alamat Tempat Tinggal" icon="🏠" color="amber">
                <div className="space-y-4">
                     <FormRow label="Alamat Lengkap (Sesuai KK)" required>
                        <FormTextarea name="alamatKK" value={formData.alamatKK} onChange={handleChange} required placeholder="Jalan, RT/RW, Kel/Desa, Kec, Kab/Kota" />
                    </FormRow>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="checkbox" 
                            id="domisiliCheck" 
                            checked={formData.isDomisiliBerbeda} 
                            onChange={(e) => setFormData(prev => ({...prev, isDomisiliBerbeda: e.target.checked}))}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="domisiliCheck" className="text-sm text-gray-700">Alamat domisili saat ini <strong>berbeda</strong> dengan KK</label>
                    </div>

                    {formData.isDomisiliBerbeda && (
                        <div className="animate-fade-in-down">
                            <FormRow label="Alamat Domisili Saat Ini" required>
                                <FormTextarea name="alamatDomisili" value={formData.alamatDomisili} onChange={handleChange} required />
                            </FormRow>
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6 animate-fade-in">
            {/* AYAH */}
            <SectionCard title="Data Ayah" icon="👨" color="blue">
                <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center justify-between text-sm">
                     <span className="text-blue-900 font-semibold">Status Ayah:</span>
                     <div className="flex gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={formData.statusAyah === 'Hidup'} onChange={() => handleStatusOrangTua('Ayah', false)} className="text-blue-600" />
                            <span>Hidup</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={formData.statusAyah === 'Meninggal'} onChange={() => handleStatusOrangTua('Ayah', true)} className="text-red-600" />
                            <span className="text-red-600">Meninggal</span>
                        </label>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormRow label="Nama Lengkap Ayah" required className="md:col-span-2">
                        <FormInput name="namaAyah" value={formData.namaAyah} onChange={handleChange} required />
                    </FormRow>
                    
                    {formData.statusAyah === 'Hidup' && (
                        <>
                            <FormRow label="NIK Ayah" required>
                                <FormInput name="nikAyah" value={formData.nikAyah} onChange={handleChange} maxLength={16} required />
                            </FormRow>
                             <FormRow label="Tempat & Tanggal Lahir">
                                <div className="flex gap-2">
                                    <FormInput name="tempatLahirAyah" value={formData.tempatLahirAyah} onChange={handleChange} placeholder="Tempat" className="w-1/2" />
                                    <FormInput type="date" name="tanggalLahirAyah" value={formData.tanggalLahirAyah} onChange={handleChange} className="w-1/2" />
                                </div>
                            </FormRow>
                            <FormRow label="Pendidikan Terakhir">
                                <FormSelect name="pendidikanAyah" value={formData.pendidikanAyah} onChange={handleChange}>
                                    <option value="">Pilih...</option>
                                    <option value="SD">SD/Sederajat</option>
                                    <option value="SMP">SMP/Sederajat</option>
                                    <option value="SMA">SMA/Sederajat</option>
                                    <option value="D3">D3</option>
                                    <option value="S1">S1/Sarjana</option>
                                    <option value="S2">S2/Master</option>
                                    <option value="S3">S3/Doktor</option>
                                </FormSelect>
                            </FormRow>
                            <FormRow label="Pekerjaan">
                                 <FormSelect name="pekerjaanAyah" value={formData.pekerjaanAyah} onChange={handleChange} required>
                                    <option value="">Pilih...</option>
                                    <option value="PNS">PNS / ASN</option>
                                    <option value="TNI/Polri">TNI / Polri</option>
                                    <option value="Wiraswasta">Wiraswasta</option>
                                    <option value="Swasta">Karyawan Swasta</option>
                                    <option value="Buruh">Buruh</option>
                                    <option value="Petani">Petani / Nelayan</option>
                                    <option value="Lainnya">Lainnya</option>
                                </FormSelect>
                            </FormRow>
                            <FormRow label="Nama Kantor / Tempat Kerja">
                                <FormInput name="namaKantorAyah" value={formData.namaKantorAyah} onChange={handleChange} placeholder="Opsional" />
                            </FormRow>
                             <FormRow label="Penghasilan Bulanan">
                                <FormSelect name="penghasilanAyah" value={formData.penghasilanAyah} onChange={handleChange}>
                                    <option value="">Pilih Range...</option>
                                    <option value="< 1 Juta">&lt; Rp 1.000.000</option>
                                    <option value="1 - 3 Juta">Rp 1.000.000 - 3.000.000</option>
                                    <option value="3 - 5 Juta">Rp 3.000.000 - 5.000.000</option>
                                    <option value="5 - 10 Juta">Rp 5.000.000 - 10.000.000</option>
                                    <option value="10 - 20 Juta">Rp 10.000.000 - 20.000.000</option>
                                    <option value="20 - 50 Juta">Rp 20.000.000 - 50.000.000</option>
                                    <option value="> 50 Juta">&gt; Rp 50.000.000</option>
                                </FormSelect>
                            </FormRow>
                            <FormRow label="No. HP / WA" required>
                                <FormInput name="noHpAyah" value={formData.noHpAyah} onChange={handleChange} placeholder="08..." required />
                            </FormRow>
                            <FormRow label="Email (Opsional)">
                                <FormInput type="email" name="emailAyah" value={formData.emailAyah} onChange={handleChange} placeholder="Email aktif" />
                            </FormRow>
                        </>
                    )}
                </div>
            </SectionCard>

            {/* IBU */}
            <SectionCard title="Data Ibu" icon="👩" color="rose">
                 <div className="mb-4 bg-rose-50 p-3 rounded-lg flex items-center justify-between text-sm">
                     <span className="text-rose-900 font-semibold">Status Ibu:</span>
                     <div className="flex gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={formData.statusIbu === 'Hidup'} onChange={() => handleStatusOrangTua('Ibu', false)} className="text-rose-600" />
                            <span>Hidup</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" checked={formData.statusIbu === 'Meninggal'} onChange={() => handleStatusOrangTua('Ibu', true)} className="text-red-600" />
                            <span className="text-red-600">Meninggal</span>
                        </label>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormRow label="Nama Lengkap Ibu" required className="md:col-span-2">
                        <FormInput name="namaIbu" value={formData.namaIbu} onChange={handleChange} required />
                    </FormRow>

                    {formData.statusIbu === 'Hidup' && (
                        <>
                            <FormRow label="NIK Ibu" required>
                                <FormInput name="nikIbu" value={formData.nikIbu} onChange={handleChange} maxLength={16} required />
                            </FormRow>
                             <FormRow label="Tempat & Tanggal Lahir">
                                <div className="flex gap-2">
                                    <FormInput name="tempatLahirIbu" value={formData.tempatLahirIbu} onChange={handleChange} placeholder="Tempat" className="w-1/2" />
                                    <FormInput type="date" name="tanggalLahirIbu" value={formData.tanggalLahirIbu} onChange={handleChange} className="w-1/2" />
                                </div>
                            </FormRow>
                            <FormRow label="Pendidikan Terakhir">
                                <FormSelect name="pendidikanIbu" value={formData.pendidikanIbu} onChange={handleChange}>
                                    <option value="">Pilih...</option>
                                    <option value="SD">SD/Sederajat</option>
                                    <option value="SMP">SMP/Sederajat</option>
                                    <option value="SMA">SMA/Sederajat</option>
                                    <option value="D3">D3</option>
                                    <option value="S1">S1/Sarjana</option>
                                    <option value="S2">S2/Master</option>
                                    <option value="S3">S3/Doktor</option>
                                </FormSelect>
                            </FormRow>
                            <FormRow label="Pekerjaan">
                                <FormSelect name="pekerjaanIbu" value={formData.pekerjaanIbu} onChange={handleChange} required>
                                    <option value="">Pilih...</option>
                                    <option value="IRT">Ibu Rumah Tangga</option>
                                    <option value="PNS">PNS / ASN</option>
                                    <option value="Swasta">Karyawan Swasta</option>
                                    <option value="Wiraswasta">Wiraswasta</option>
                                    <option value="Lainnya">Lainnya</option>
                                </FormSelect>
                            </FormRow>
                            <FormRow label="Penghasilan Bulanan">
                                <FormSelect name="penghasilanIbu" value={formData.penghasilanIbu} onChange={handleChange}>
                                    <option value="">Pilih Range...</option>
                                    <option value="Tidak Ada">Tidak Ada / IRT</option>
                                    <option value="< 1 Juta">&lt; Rp 1.000.000</option>
                                    <option value="1 - 3 Juta">Rp 1.000.000 - 3.000.000</option>
                                    <option value="3 - 5 Juta">Rp 3.000.000 - 5.000.000</option>
                                    <option value="5 - 10 Juta">Rp 5.000.000 - 10.000.000</option>
                                    <option value="10 - 20 Juta">Rp 10.000.000 - 20.000.000</option>
                                    <option value="20 - 50 Juta">Rp 20.000.000 - 50.000.000</option>
                                    <option value="> 50 Juta">&gt; Rp 50.000.000</option>
                                </FormSelect>
                            </FormRow>
                             <FormRow label="No. HP / WA" required>
                                <FormInput name="noHpIbu" value={formData.noHpIbu} onChange={handleChange} placeholder="08..." required />
                            </FormRow>
                        </>
                    )}
                </div>
            </SectionCard>
            
            {/* WALI */}
            <SectionCard title="Data Wali (Opsional)" icon="👴" color="purple">
                 <div className="flex items-center gap-2 mb-4">
                        <input 
                            type="checkbox" 
                            id="waliCheck" 
                            checked={formData.adaWali} 
                            onChange={(e) => setFormData(prev => ({...prev, adaWali: e.target.checked}))}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                        <label htmlFor="waliCheck" className="text-gray-700 font-medium text-sm">Siswa tinggal bersama Wali (Bukan orang tua kandung)</label>
                </div>

                {formData.adaWali && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-down">
                        <FormRow label="Nama Wali" required><FormInput name="namaWali" value={formData.namaWali} onChange={handleChange} /></FormRow>
                        <FormRow label="Hubungan" required><FormInput name="hubunganWali" value={formData.hubunganWali} onChange={handleChange} placeholder="Paman/Kakek/Tante" /></FormRow>
                        <FormRow label="Pekerjaan Wali"><FormInput name="pekerjaanWali" value={formData.pekerjaanWali} onChange={handleChange} /></FormRow>
                        <FormRow label="No. HP Wali" required><FormInput name="noHpWali" value={formData.noHpWali} onChange={handleChange} /></FormRow>
                     </div>
                )}
            </SectionCard>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-fade-in">
             {/* RIWAYAT PENDIDIKAN */}
             <SectionCard title="Riwayat Sekolah & Kesehatan" icon="🏥" color="teal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormRow label="Asal Sekolah" required>
                        <FormSelect name="asalSekolah" value={formData.asalSekolah} onChange={handleChange} required>
                            {formData.jenisPendaftaran === 'mutasi' ? (
                                <>
                                    <option value="">Pilih...</option>
                                    <option value="SD Swasta">SD Swasta</option>
                                    <option value="SD Negeri">SD Negeri</option>
                                    <option value="Sekolah Lainnya">Sekolah Lainnya</option>
                                </>
                            ) : (
                                <>
                                    <option value="">Pilih...</option>
                                    <option value="TK B">Lulusan TK B</option>
                                    <option value="TK A">TK A</option>
                                    <option value="PAUD/KB">PAUD / Kelompok Bermain</option>
                                    <option value="Sekolah Lainnya">Sekolah Lainnya</option>
                                    <option value="Belum Sekolah">Belum Pernah Sekolah</option>
                                </>
                            )}
                        </FormSelect>
                    </FormRow>
                    {formData.asalSekolah !== 'Belum Sekolah' && (
                        <>
                            <FormRow label="Nama Sekolah Asal" required>
                                <FormInput name="namaSekolahAsal" value={formData.namaSekolahAsal} onChange={handleChange} placeholder="Nama Sekolah..." />
                            </FormRow>
                             <FormRow label="Alamat Sekolah" className="md:col-span-2">
                                <FormInput name="alamatSekolahAsal" value={formData.alamatSekolahAsal} onChange={handleChange} placeholder="Kota/Kecamatan Sekolah" />
                            </FormRow>
                        </>
                    )}
                    
                    <div className="md:col-span-2 border-t border-gray-100 my-2"></div>
                    
                    {/* DATA FISIK */}
                    <h4 className="md:col-span-2 font-bold text-teal-800 flex items-center gap-2">
                        <span>📏</span> Data Fisik
                    </h4>

                    <FormRow label="Tinggi / Berat Badan">
                        <div className="flex gap-4">
                            <FormInput type="number" name="tinggiBadan" value={formData.tinggiBadan} onChange={handleChange} placeholder="CM" className="w-1/2" />
                            <FormInput type="number" name="beratBadan" value={formData.beratBadan} onChange={handleChange} placeholder="KG" className="w-1/2" />
                        </div>
                    </FormRow>
                    <FormRow label="Lingkar Kepala / Lengan">
                         <div className="flex gap-4 items-center">
                            <FormInput type="number" name="lingkarKepala" value={formData.lingkarKepala} onChange={handleChange} placeholder="Lingkar Kepala (CM)" className="w-1/2" />
                            <FormInput type="number" name="lingkarLenganAtas" value={formData.lingkarLenganAtas} onChange={handleChange} placeholder="Lengan Atas (CM)" className="w-1/2" />
                         </div>
                    </FormRow>
                    <FormRow label="Golongan Darah">
                        <FormSelect name="golonganDarah" value={formData.golonganDarah} onChange={handleChange}>
                            <option value="">-</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="AB">AB</option>
                            <option value="O">O</option>
                            <option value="Belum Tahu">Belum Tahu</option>
                        </FormSelect>
                    </FormRow>

                    {/* RIWAYAT KELAHIRAN */}
                    <h4 className="md:col-span-2 font-bold text-teal-800 flex items-center gap-2 mt-4">
                        <span>👶</span> Riwayat Kelahiran & Bayi
                    </h4>
                    <FormRow label="Proses Kelahiran">
                        <FormSelect name="prosesKelahiran" value={formData.prosesKelahiran} onChange={handleChange}>
                            <option value="">Pilih...</option>
                            <option value="Normal">Normal</option>
                            <option value="Caesar">Caesar (Sesar)</option>
                            <option value="Water Birth">Water Birth</option>
                        </FormSelect>
                    </FormRow>
                    <FormRow label="Asupan Saat Bayi">
                        <FormSelect name="asupanBayi" value={formData.asupanBayi} onChange={handleChange}>
                            <option value="">Pilih...</option>
                            <option value="ASI">ASI Eksklusif</option>
                            <option value="Sufor">Susu Formula</option>
                            <option value="Campuran">ASI + Sufor</option>
                        </FormSelect>
                    </FormRow>
                    {formData.asupanBayi !== 'ASI' && formData.asupanBayi !== '' && (
                         <FormRow label="Merek Susu Formula">
                            <FormInput name="merekSusu" value={formData.merekSusu} onChange={handleChange} placeholder="Nama Merek..." />
                        </FormRow>
                    )}
                    <FormRow label="Melewati Fase Merangkak?">
                        <FormSelect name="prosesMerangkak" value={formData.prosesMerangkak} onChange={handleChange}>
                            <option value="">Pilih...</option>
                            <option value="Ya">Ya, Merangkak</option>
                            <option value="Tidak">Tidak (Langsung Jalan/Ngesot)</option>
                        </FormSelect>
                    </FormRow>

                    {/* KESAHATAN */}
                    <h4 className="md:col-span-2 font-bold text-teal-800 flex items-center gap-2 mt-4">
                        <span>🩺</span> Kondisi Kesehatan
                    </h4>
                    
                    <FormRow label="Status Imunisasi" required>
                         <FormSelect name="imunisasi" value={formData.imunisasi} onChange={handleChange} required>
                            <option value="">Pilih...</option>
                            <option value="Lengkap">Lengkap (Sesuai Usia)</option>
                            <option value="Belum Lengkap">Belum Lengkap</option>
                            <option value="Tidak Tahu">Tidak Tahu</option>
                        </FormSelect>
                    </FormRow>
                    
                    <div className="md:col-span-2 space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormRow label="Riwayat Penyakit Serius">
                                <FormTextarea rows={2} name="riwayatPenyakit" value={formData.riwayatPenyakit} onChange={handleChange} placeholder="Kejang, asma, TBC, dll. (- jika tidak ada)" />
                            </FormRow>
                            <FormRow label="Riwayat Rawat Inap (Opname)">
                                <FormTextarea rows={2} name="riwayatRawatInap" value={formData.riwayatRawatInap} onChange={handleChange} placeholder="Kapan & sakit apa... (- jika tidak pernah)" />
                            </FormRow>
                         </div>
                         <FormRow label="Alergi / Pantangan">
                            <FormTextarea rows={2} name="alergi" value={formData.alergi} onChange={handleChange} placeholder="Makanan, obat, debu, dingin... (- jika tidak ada)" />
                        </FormRow>
                        
                        {/* KEBUTUHAN KHUSUS */}
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                             <FormRow label="Kondisi Fisik / Kebutuhan Khusus" hint="Sebutkan jika ananda menggunakan alat bantu (kacamata, alat dengar) atau memiliki kondisi fisik tertentu.">
                                <FormTextarea rows={2} name="kondisiFisikKhusus" value={formData.kondisiFisikKhusus} onChange={handleChange} placeholder="Ceritakan secara detail jika ada..." />
                            </FormRow>
                        </div>
                    </div>
                </div>
             </SectionCard>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6 animate-fade-in">
             <SectionCard title="Perkembangan & Lingkungan" icon="🌱" color="emerald">
                 
                 {/* Subsection: Perkembangan Umum */}
                 <div className="mb-6">
                    <h4 className="font-bold text-emerald-800 mb-4 pb-2 border-b border-emerald-100">Perkembangan Umum</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormRow label="Perkembangan Motorik (Gerak)">
                            <FormSelect name="perkembanganMotorik" value={formData.perkembanganMotorik} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Sangat Aktif">Sangat Aktif (Tidak bisa diam)</option>
                                <option value="Aktif Normal">Aktif Normal / Wajar</option>
                                <option value="Pasif">Cenderung Pasif / Diam</option>
                            </FormSelect>
                        </FormRow>
                         <FormRow label="Perkembangan Bahasa (Bicara)">
                            <FormSelect name="perkembanganBahasa" value={formData.perkembanganBahasa} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Sangat Lancar">Sangat Lancar / Cerewet</option>
                                <option value="Lancar">Lancar (Sesuai Usia)</option>
                                <option value="Lambat">Terlambat Bicara (Speech Delay)</option>
                            </FormSelect>
                        </FormRow>
                        <FormRow label="Perkembangan Sosial (Bergaul)">
                            <FormSelect name="perkembanganSosial" value={formData.perkembanganSosial} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Mudah Bergaul">Mudah Bergaul / Supel</option>
                                <option value="Normal">Normal (Butuh Pemanasan)</option>
                                <option value="Pemalu">Pemalu / Menarik Diri</option>
                            </FormSelect>
                        </FormRow>
                        <FormRow label="Kemandirian">
                             <FormSelect name="kemandirian" value={formData.kemandirian} onChange={handleChange} required>
                                <option value="">Pilih...</option>
                                <option value="Mandiri">Mandiri Sepenuhnya</option>
                                <option value="Bantuan Kecil">Bisa dengan sedikit bantuan</option>
                                <option value="Bantuan Penuh">Masih butuh bantuan penuh</option>
                            </FormSelect>
                        </FormRow>
                         <FormRow label="Toilet Training">
                             <FormSelect name="kemandirianToilet" value={formData.kemandirianToilet} onChange={handleChange} required>
                                <option value="">Pilih...</option>
                                <option value="Mandiri">Mandiri (Sudah Bisa)</option>
                                <option value="Kadang Ngompol">Kadang Masih Ngompol</option>
                                <option value="Diapers">Masih Pakai Diapers</option>
                            </FormSelect>
                        </FormRow>
                    </div>
                 </div>

                 {/* Subsection: Kebiasaan */}
                 <div className="mb-6">
                    <h4 className="font-bold text-emerald-800 mb-4 pb-2 border-b border-emerald-100">Kebiasaan Sehari-hari</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormRow label="Kebiasaan Tidur">
                            <FormSelect name="kebiasaanTidur" value={formData.kebiasaanTidur} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Teratur">Teratur / Mudah Tidur</option>
                                <option value="Kurang Tidur">Susah Tidur (Insomnia)</option>
                                <option value="Begadang">Suka Begadang</option>
                            </FormSelect>
                        </FormRow>
                        <FormRow label="Kebiasaan Makan">
                            <FormSelect name="kebiasaanMakan" value={formData.kebiasaanMakan} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Mudah">Mudah Makan / Lahap</option>
                                <option value="Pilih-pilih">Pilih-pilih (Picky Eater)</option>
                                <option value="GTM">Susah Makan / GTM</option>
                            </FormSelect>
                        </FormRow>
                     </div>
                 </div>

                 {/* Subsection: Kemampuan Akademik */}
                 <div className="mb-6">
                    <h4 className="font-bold text-emerald-800 mb-4 pb-2 border-b border-emerald-100">Kemampuan Akademik Awal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormRow label="Kemampuan Membaca">
                            <FormSelect name="kemampuanMembaca" value={formData.kemampuanMembaca} onChange={handleChange} required>
                                <option value="">Pilih...</option>
                                <option value="Belum Bisa">Belum Bisa</option>
                                <option value="Mengenal Huruf">Hanya Mengenal Huruf</option>
                                <option value="Mengeja">Mengeja Suku Kata</option>
                                <option value="Lancar">Sudah Lancar Membaca</option>
                            </FormSelect>
                        </FormRow>
                        <FormRow label="Kemampuan Menulis">
                            <FormSelect name="kemampuanMenulis" value={formData.kemampuanMenulis} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Belum Bisa">Belum Bisa</option>
                                <option value="Coret-coret">Mencoret-coret</option>
                                <option value="Meniru Huruf">Meniru/Menulis Huruf & Angka</option>
                                <option value="Lancar">Lancar Menulis Kata</option>
                            </FormSelect>
                        </FormRow>
                         <FormRow label="Kemampuan Berhitung">
                            <FormSelect name="kemampuanBerhitung" value={formData.kemampuanBerhitung} onChange={handleChange} required>
                                <option value="">Pilih...</option>
                                <option value="Belum Bisa">Belum Bisa</option>
                                <option value="1-10">Membilang 1-10</option>
                                <option value="1-20">Membilang 1-20</option>
                                <option value="Penjumlahan">Bisa Penjumlahan Sederhana</option>
                            </FormSelect>
                        </FormRow>
                         <FormRow label="Gaya Belajar">
                            <FormSelect name="gayaBelajar" value={formData.gayaBelajar} onChange={handleChange}>
                                <option value="">Pilih (Opsional)...</option>
                                <option value="Visual">Visual (Suka melihat gambar)</option>
                                <option value="Auditori">Auditori (Suka mendengar cerita)</option>
                                <option value="Kinestetik">Kinestetik (Suka bergerak)</option>
                            </FormSelect>
                        </FormRow>
                    </div>
                </div>

                {/* Subsection: Psikologis & Gadget */}
                 <div className="mb-6">
                    <h4 className="font-bold text-emerald-800 mb-4 pb-2 border-b border-emerald-100">Psikologis & Gadget</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormRow label="Minat / Bakat Khusus">
                             <FormInput name="minatBakat" value={formData.minatBakat} onChange={handleChange} placeholder="Cth: Menggambar, Lego, Menyanyi" />
                        </FormRow>
                        <FormRow label="Riwayat Bullying (Korban/Pelaku)">
                            <FormSelect name="riwayatBullying" value={formData.riwayatBullying} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Tidak Pernah">Tidak Pernah</option>
                                <option value="Pernah (Korban)">Pernah (Sebagai Korban)</option>
                                <option value="Pernah (Pelaku)">Pernah (Sebagai Pelaku)</option>
                            </FormSelect>
                        </FormRow>
                        
                        <div className="md:col-span-2 border-t border-gray-100 my-2"></div>
                        
                        <FormRow label="Durasi Main Gadget (per hari)">
                             <FormSelect name="durasiGadget" value={formData.durasiGadget} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Tidak Pernah">Tidak Pernah / Jarang</option>
                                <option value="< 1 Jam">&lt; 1 Jam</option>
                                <option value="1-3 Jam">1 - 3 Jam</option>
                                <option value="> 3 Jam">&gt; 3 Jam (Intens)</option>
                            </FormSelect>
                        </FormRow>
                        <FormRow label="Aturan Penggunaan">
                             <FormSelect name="aturanGadget" value={formData.aturanGadget} onChange={handleChange}>
                                <option value="">Pilih...</option>
                                <option value="Ketat">Ketat & Dibatasi</option>
                                <option value="Longgar">Longgar / Bebas</option>
                                <option value="Tanpa Aturan">Tidak Ada Aturan Khusus</option>
                            </FormSelect>
                        </FormRow>
                         <FormRow label="Konten yang sering dilihat" className="md:col-span-2">
                             <FormInput name="kontenGadget" value={formData.kontenGadget} onChange={handleChange} placeholder="Cth: Youtube Kids, Game, Tiktok, Kartun..." />
                        </FormRow>
                    </div>
                 </div>

                 <div className="mt-6 pt-4 border-t border-emerald-100">
                    <FormRow label="Apa motivasi Bapak/Ibu mendaftarkan ananda di SDIT Al-Hidayah?" required>
                        <FormTextarea rows={3} name="motivasiMasuk" value={formData.motivasiMasuk} onChange={handleChange} required placeholder="Ceritakan harapan dan alasan memilih sekolah ini..." />
                    </FormRow>
                 </div>
             </SectionCard>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-6 animate-fade-in">
            <SectionCard title="Dokumen Pendukung" icon="📂" color="orange">
                <div className="p-4 bg-orange-50 text-orange-800 rounded-lg mb-6 text-sm border border-orange-100">
                    Silakan upload dokumen yang diminta. Pastikan tulisan terbaca jelas. Format: JPG/PDF, Maks 2MB.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormFileUpload 
                        name="fileKK" 
                        label="Scan Kartu Keluarga (KK)" 
                        onChange={handleChange} 
                        fileName={fileNames.fileKK}
                        hint="Wajib"
                        required
                    />
                     <FormFileUpload 
                        name="fileAkta" 
                        label="Scan Akta Kelahiran" 
                        onChange={handleChange} 
                        fileName={fileNames.fileAkta}
                        hint="Wajib"
                        required
                    />
                     <FormFileUpload 
                        name="fileFoto" 
                        label="Pas Foto Siswa (3x4)" 
                        onChange={handleChange} 
                        fileName={fileNames.fileFoto}
                        accept="image/*"
                        hint="Wajib. Latar belakang bebas."
                        required
                    />
                     <FormFileUpload 
                        name="fileRapor" 
                        label="Scan Rapor TK (Opsional)" 
                        onChange={handleChange} 
                        fileName={fileNames.fileRapor}
                        hint="Jika ada"
                    />
                </div>
            </SectionCard>
        </div>
    );

    const renderStep6 = () => (
        <div className="space-y-6 animate-fade-in">
            <SectionCard title="Review Data Pendaftaran" icon="🔍" color="blue">
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg mb-6 text-sm border border-blue-100">
                    Pastikan semua data di bawah ini sudah benar. Jika ada kesalahan, klik tombol "Kembali" untuk memperbaiki.
                </div>
                
                <div className="space-y-6 text-sm text-gray-700">
                    <div>
                        <h4 className="font-bold text-gray-900 border-b pb-2 mb-3">Identitas Siswa</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500">Nama Lengkap:</span> <span className="font-medium">{formData.namaLengkap || '-'}</span>
                            <span className="text-gray-500">NIK:</span> <span className="font-medium">{formData.nik || '-'}</span>
                            <span className="text-gray-500">Tempat, Tgl Lahir:</span> <span className="font-medium">{formData.tempatLahir}, {formData.tanggalLahir}</span>
                            <span className="text-gray-500">Jenis Kelamin:</span> <span className="font-medium">{formData.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                            <span className="text-gray-500">Alamat:</span> <span className="font-medium">{formData.isDomisiliBerbeda ? formData.alamatDomisili : formData.alamatKK}</span>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-gray-900 border-b pb-2 mb-3">Data Orang Tua / Wali</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500">Nama Ayah:</span> <span className="font-medium">{formData.statusAyah === 'Meninggal' ? 'Meninggal' : formData.namaAyah || '-'}</span>
                            {formData.statusAyah !== 'Meninggal' && (
                                <>
                                    <span className="text-gray-500">No. HP Ayah:</span> <span className="font-medium">{formData.noHpAyah || '-'}</span>
                                </>
                            )}
                            <span className="text-gray-500">Nama Ibu:</span> <span className="font-medium">{formData.statusIbu === 'Meninggal' ? 'Meninggal' : formData.namaIbu || '-'}</span>
                            {formData.statusIbu !== 'Meninggal' && (
                                <>
                                    <span className="text-gray-500">No. HP Ibu:</span> <span className="font-medium">{formData.noHpIbu || '-'}</span>
                                </>
                            )}
                            {formData.adaWali && (
                                <>
                                    <span className="text-gray-500">Nama Wali:</span> <span className="font-medium">{formData.namaWali || '-'}</span>
                                    <span className="text-gray-500">No. HP Wali:</span> <span className="font-medium">{formData.noHpWali || '-'}</span>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-gray-900 border-b pb-2 mb-3">Riwayat Sekolah & Kesehatan</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500">Asal Sekolah:</span> <span className="font-medium">{formData.asalSekolah || '-'} - {formData.namaSekolahAsal || '-'}</span>
                            <span className="text-gray-500">Tinggi / Berat:</span> <span className="font-medium">{formData.tinggiBadan} cm / {formData.beratBadan} kg</span>
                            <span className="text-gray-500">Riwayat Penyakit:</span> <span className="font-medium">{formData.riwayatPenyakit || '-'}</span>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-gray-900 border-b pb-2 mb-3">Dokumen Pendukung</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span className="text-gray-500">Kartu Keluarga:</span> <span className="font-medium">{fileNames.fileKK ? 'Sudah Diunggah ✓' : 'Belum'}</span>
                            <span className="text-gray-500">Akta Kelahiran:</span> <span className="font-medium">{fileNames.fileAkta ? 'Sudah Diunggah ✓' : 'Belum'}</span>
                            <span className="text-gray-500">Pas Foto:</span> <span className="font-medium">{fileNames.fileFoto ? 'Sudah Diunggah ✓' : 'Belum'}</span>
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );

    if (success) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12 px-4 animate-fade-in">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Alhamdulillah, Indent Berhasil!</h2>
                <p className="text-lg text-gray-600 mb-4">
                    Data ananda <strong>{formData.namaLengkap}</strong> telah kami terima.
                </p>
                
                {/* Registration Number Box */}
                {registrationResult && (
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl mb-8 shadow-lg">
                        <p className="text-sm text-blue-100 mb-2">Nomor Registrasi Anda:</p>
                        <p className="text-2xl font-bold font-mono tracking-wider">
                            {registrationResult.registrationNumber}
                        </p>
                        <p className="text-xs text-blue-200 mt-2">Simpan nomor ini untuk mengecek status Indent</p>
                    </div>
                )}
                
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl mb-8 text-left">
                     <h4 className="font-bold text-blue-900 mb-2">📋 Langkah Selanjutnya:</h4>
                     <ul className="list-decimal list-inside text-blue-800 space-y-2">
                         <li><strong>Cetak Bukti Pendaftaran</strong> melalui tombol di bawah atau dari Email/WhatsApp.</li>
                         <li>Serahkan lembar bukti pendaftaran dan fotokopi berkas ke sekolah untuk <strong>Verifikasi</strong>.</li>
                         <li>Selesaikan pembayaran pendaftaran (informasi rekening ada di bukti cetak).</li>
                         <li>Pantau status pendaftaran melalui halaman Cek Status Pendaftaran secara berkala.</li>
                     </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                        href={`/spmb/cetak-bukti?reg=${registrationResult?.registrationNumber || ''}`}
                        target="_blank"
                        className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                        🖨️ Cetak Bukti Pendaftaran (PDF)
                    </a>
                    <a 
                        href={`/dashboard/parent?reg=${registrationResult?.registrationNumber || ''}`}
                        className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 border border-blue-200 font-semibold rounded-xl hover:bg-blue-50 transition-all"
                    >
                        📊 Cek Status Pendaftaran
                    </a>
                    <SecondaryButton onClick={() => window.location.href = '/'}>
                        ← Beranda
                    </SecondaryButton>
                </div>
            </div>
        );
    }

    // Step validation status
    const [stepValidation, setStepValidation] = useState({
        1: false, 2: false, 3: false, 4: false, 5: false, 6: false
    });

    const validateStep = (stepNum) => {
        const errors = [];
        if (stepNum === 1) {
            if (!formData.namaLengkap || formData.namaLengkap.length < 3) errors.push('Nama lengkap minimal 3 karakter');
            if (!formData.tempatLahir) errors.push('Tempat lahir wajib diisi');
            if (!formData.tanggalLahir) errors.push('Tanggal lahir wajib diisi');
            if (!formData.alamatKK || formData.alamatKK.length < 10) errors.push('Alamat lengkap minimal 10 karakter');
            if (formData.nik) {
                const nikResult = validateNIK(formData.nik, false);
                if (!nikResult.valid) errors.push(`NIK: ${nikResult.error}`);
            }
        }
        if (stepNum === 2) {
            if (!formData.namaAyah && !formData.namaIbu) errors.push('Minimal salah satu nama orang tua harus diisi');
            const primaryPhone = formData.noHpAyah || formData.noHpIbu;
            if (!primaryPhone) errors.push('Minimal satu nomor HP orang tua wajib diisi');
            else {
                const phoneResult = validatePhone(primaryPhone, true);
                if (!phoneResult.valid) errors.push(`No. HP: ${phoneResult.error}`);
            }
        }
        return errors.length === 0;
    };

    const markStepValidated = (stepNum) => {
        const isValid = validateStep(stepNum);
        setStepValidation(prev => ({ ...prev, [stepNum]: isValid }));
        return isValid;
    };

    const handleNextStep = () => {
        if (validateCurrentStep()) {
            markStepValidated(step);
            nextStep();
            setValidationErrors([]);
        } else {
            toast.showError('Mohon lengkapi data yang diperlukan');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto relative">
            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-lg font-semibold text-gray-800">Mengirim data...</p>
                    <p className="text-sm text-gray-500">Mohon tunggu sebentar</p>
                </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <ErrorMessage 
                    errors={validationErrors} 
                    title="Mohon lengkapi data berikut:"
                />
            )}
            
            {/* Stepper Header */}
            <div className="mb-10">
                <div className="flex justify-between items-center relative px-4">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-500`} style={{ width: `${((step - 1) / 5) * 100}%` }}></div>
                    
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                        <div key={s} className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                step > s || stepValidation[s] ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-110' : 
                                step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                            }`}>
                                {step > s || stepValidation[s] ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : s}
                            </div>
                            <span className={`text-xs font-semibold hidden md:block ${step >= s ? 'text-blue-700' : 'text-gray-400'}`}>
                                {s === 1 ? 'Siswa' : s === 2 ? 'Orang Tua' : s === 3 ? 'Kesehatan' : s === 4 ? 'Perkembangan' : s === 5 ? 'Dokumen' : 'Review'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
                {step === 6 && renderStep6()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                    {step > 1 ? (
                        <SecondaryButton type="button" onClick={prevStep}>
                            &larr; Kembali
                        </SecondaryButton>
                    ) : (
                        <div></div> 
                    )}

                {step < 6 ? (
                        <PrimaryButton type="button" onClick={handleNextStep}>
                            Selanjutnya &rarr;
                        </PrimaryButton>
                    ) : (
                        <PrimaryButton type="submit" loading={loading} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-200">
                            Kirim Indent ✨
                        </PrimaryButton>
                    )}
                </div>
            </form>
        </div>
    );
};

export default SpmbFormWithToast;
