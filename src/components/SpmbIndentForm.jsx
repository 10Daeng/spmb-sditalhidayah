import React, { useState } from 'react';

const SpmbIndentForm = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [regNumber, setRegNumber] = useState('');

    const [formData, setFormData] = useState({
        jalur: 'murid_baru',
        namaLengkap: '',
        namaOrangTua: '',
        noHp: '',
        email: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));

        try {
            const res = await fetch('/api/registration/indent', {
                method: 'POST',
                body: data
            });

            const result = await res.json();
            if (res.ok && result.success) {
                setSuccess(true);
                setRegNumber(result.registration_number);
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = `/spmb/success?reg=${result.registration_number}`;
                }, 1500);
            } else {
                setError(result.error || 'Terjadi kesalahan saat mendaftar.');
            }
        } catch (err) {
            setError('Gagal menghubungi server. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center border-t-4 border-green-500">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pendaftaran Berhasil!</h3>
                <p className="text-gray-600 mb-4">Nomor Pendaftaran Anda:</p>
                <div className="bg-blue-50 text-blue-700 text-xl font-mono font-bold py-3 px-6 rounded-lg inline-block mb-6">
                    {regNumber}
                </div>
                <p className="text-sm text-gray-500">Mengarahkan ke halaman selanjutnya...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Pendaftaran Indent</h2>
                <p className="text-blue-100">Silakan isi data awal untuk mengamankan kursi pendaftaran.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                        <p className="font-medium">Pendaftaran Gagal</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Jalur Pendaftaran <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="jalur"
                        value={formData.jalur}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                    >
                        <option value="murid_baru">Siswa Baru Reguler</option>
                        <option value="mutasi">Siswa Pindahan (Mutasi)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nama Lengkap Calon Siswa <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="namaLengkap"
                        value={formData.namaLengkap}
                        onChange={handleChange}
                        placeholder="Sesuai Akta Kelahiran"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                        minLength={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nama Orang Tua / Wali <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="namaOrangTua"
                        value={formData.namaOrangTua}
                        onChange={handleChange}
                        placeholder="Nama Ayah/Ibu/Wali"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                        minLength={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        No. WhatsApp (Aktif) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        name="noHp"
                        value={formData.noHp}
                        onChange={handleChange}
                        placeholder="081234567890"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Nomor ini akan digunakan untuk login melengkapi data.</p>
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Email (Opsional)
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="email@contoh.com"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                Memproses...
                            </>
                        ) : (
                            <>
                                Daftar Indent & Lanjut Bayar <span className="material-symbols-outlined">arrow_forward</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SpmbIndentForm;
