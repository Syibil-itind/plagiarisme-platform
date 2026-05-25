import React, { useState } from 'react';

export default function Login({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Harap lengkapi email dan password Anda!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal masuk. Silakan periksa kembali kredensial Anda.");
      }

      // Menyimpan token dan data user ke localStorage
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_profile', JSON.stringify(data.user));

      // Trigger callback ke App.jsx
      onLoginSuccess(data.access_token, data.user);
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
            Plagiarism Detector Sign In
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selamat Datang</h2>
          <p className="text-xs text-slate-500">Masuk menggunakan akun institusi Dosen atau akun Mahasiswa Anda.</p>
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
              placeholder="••••••••"
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.01] flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Menghubungkan Sesi..." : "Masuk ke Dashboard"}
          </button>
        </form>

        {/* Footer Navigasi */}
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Belum memiliki akun?{" "}
            <button
              onClick={onNavigateToRegister}
              className="text-indigo-600 font-bold hover:underline"
            >
              Daftar Sekarang
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
