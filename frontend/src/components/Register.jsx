import React, { useState } from 'react';

export default function Register({ onRegisterSuccess, onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [role, setRole] = useState('mahasiswa'); // Default role 'mahasiswa'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullname || !role) {
      alert("Harap lengkapi semua kolom pendaftaran!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, fullname, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Pendaftaran gagal. Silakan coba kembali.");
      }

      alert("Registrasi Berhasil! Silakan masuk dengan akun baru Anda.");
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xl shadow-slate-100/50 space-y-6">
        
        {/* Header Form */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Plagiarism Detector Sign Up
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Akun Baru</h2>
          <p className="text-xs text-slate-500">Mulai platform deteksi plagiarisme dan bergabunglah ke institusi Anda.</p>
        </div>

        {/* Eror Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="Dr. Budi Santoso, M.T."
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@institusi.ac.id"
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/20"
            />
          </div>

          {/* Pemilih Role */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Peran Anda</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('mahasiswa')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  role === 'mahasiswa' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Mahasiswa
              </button>
              <button
                type="button"
                onClick={() => setRole('dosen')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  role === 'dosen' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Dosen
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.01] flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Mendaftarkan Akun..." : "Buat Akun Sekarang"}
          </button>
        </form>

        {/* Footer Navigasi */}
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Sudah memiliki akun?{" "}
            <button
              onClick={onNavigateToLogin}
              className="text-indigo-600 font-bold hover:underline"
            >
              Masuk Sekarang
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
