import React, { useState } from 'react';
import SpmbForm from './SpmbForm.jsx';

const SpmbLoginAndComplete = () => {
    const [authData, setAuthData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [credentials, setCredentials] = useState({
        regNumber: '',
        phone: ''
    });

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/registration/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const result = await res.json();
            
            if (res.ok && result.success) {
                // Check if they are allowed to fill data
                if (result.data.status === 'pending') {
                    // Usually pending means they haven't paid or verified, but we allow them to proceed or show warning
                    // For now, let's just allow it
                }
                
                // Set initial data mapping from what we got or just empty structure
                // We'll pass the registration number to the form
                const initialFormData = {
                    jenisPendaftaran: 'murid_baru',
                    registration_number: result.data.registration_number,
                    // The rest will be empty so they can fill it
                };
                
                setAuthData(initialFormData);
            } else {
                setError(result.error || 'Data pendaftaran tidak ditemukan.');
            }
        } catch (err) {
            setError('Gagal terhubung ke server.');
        } finally {
            setLoading(false);
        }
    };

    if (authData) {
        return (
            <div className="animate-fade-in">
                <SpmbForm initialData={authData} isCompletionMode={true} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-md mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-10 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Login Pendaftar</h2>
                <p className="text-blue-100">Masukkan Nomor Registrasi dan No. HP untuk melengkapi data</p>
            </div>

            <form onSubmit={handleLogin} className="p-6 sm:p-10 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nomor Pendaftaran
                    </label>
                    <input
                        type="text"
                        name="regNumber"
                        value={credentials.regNumber}
                        onChange={handleChange}
                        placeholder="Contoh: REG-20260101-ABCDEF"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono uppercase"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        No. WhatsApp (yang didaftarkan)
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={credentials.phone}
                        onChange={handleChange}
                        placeholder="081234567890"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
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
                        {loading ? 'Memeriksa Data...' : 'Lanjutkan Melengkapi Data'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SpmbLoginAndComplete;
