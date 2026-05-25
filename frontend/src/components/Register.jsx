import React, { useState } from 'react';

export default function Register({ initialRole = 'mahasiswa', onRegisterSuccess, onNavigateToLogin, onBackToLanding }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [role, setRole] = useState(initialRole || 'mahasiswa'); // Pre-selected role
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-charcoal px-4 font-sans selection:bg-gold selection:text-charcoal relative transition-colors duration-250">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gold/5 rounded-full blur-[90px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl dark:shadow-2xl relative z-10 space-y-6 transition-colors">
        
        {/* Header Form */}
        <div className="text-center space-y-2 relative">

          <span 
            onClick={onBackToLanding}
            className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-gold bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-full cursor-pointer hover:bg-gold/20 transition-all"
          >
            &larr; SYBIL-ITIND Portal
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Daftar Akun Baru</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Mulai platform deteksi plagiarisme dan bergabunglah ke kelas Anda.</p>
        </div>

        {/* Eror Alert */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl text-rose-850 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="Budi Santoso, M.T."
              className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold bg-slate-50 dark:bg-slate-950/50 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@institusi.ac.id"
              className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold bg-slate-50 dark:bg-slate-950/50 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold bg-slate-50 dark:bg-slate-950/50 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all"
            />
          </div>

          {/* Pemilih Role */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pilih Peran Anda</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRole('mahasiswa')}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'mahasiswa' ? "bg-gold text-charcoal shadow-sm" : "text-slate-550 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Mahasiswa
              </button>
              <button
                type="button"
                onClick={() => setRole('dosen')}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'dosen' ? "bg-gold text-charcoal shadow-sm" : "text-slate-550 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Dosen
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gold hover:bg-gold-hover text-charcoal text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-gold/20 hover:scale-[1.01] flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Mendaftarkan Akun..." : "Buat Akun Sekarang"}
          </button>
        </form>

        {/* Footer Navigasi */}
        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sudah memiliki akun?{" "}
            <button
              onClick={onNavigateToLogin}
              className="text-gold font-bold hover:underline cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
