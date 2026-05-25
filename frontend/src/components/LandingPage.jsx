import React from 'react';

export default function LandingPage({ theme, onSelectPortal }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-charcoal text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-gold selection:text-charcoal transition-colors duration-200">
      
      {/* 1. Header/Navbar Premium */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-charcoal/90 backdrop-blur sticky top-0 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer">
            {/* Logo Gold */}
            <div className="p-2 bg-gradient-to-br from-gold to-yellow-600 rounded-xl shadow-lg shadow-gold/10">
              <svg className="w-6 h-6 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white block">SYBIL-ITIND</span>
              <span className="text-[10px] text-gold font-bold uppercase tracking-widest block">Academic Integrity</span>
            </div>
          </div>

          <nav className="flex items-center space-x-3 pr-12 md:pr-16">
            <button
              onClick={() => onSelectPortal('mahasiswa')}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:border-gold/50 dark:hover:border-gold/50 text-slate-700 dark:text-slate-300 hover:text-gold dark:hover:text-gold text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Portal Mahasiswa
            </button>
            <button
              onClick={() => onSelectPortal('dosen')}
              className="px-4 py-2 bg-gold hover:bg-gold-hover text-charcoal text-xs font-black rounded-xl transition-all shadow-md shadow-gold/10 cursor-pointer"
            >
              Login Dosen
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 border-b border-slate-200 dark:border-slate-900">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-10 right-10 w-[200px] h-[200px] bg-yellow-600/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="space-y-6 lg:col-span-7">
            <span className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">
              ✨ Deep Learning & NLP Powered
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
              Platform Deteksi <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-400 to-yellow-600">
                Plagiarisme Akademik
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl font-medium">
              Menjaga kemurnian karya ilmiah mahasiswa dengan analisis kesamaan leksikal dan konteks makna semantik tingkat tinggi secara instan, aman, dan transparan.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onSelectPortal('dosen')}
                className="px-6 py-3.5 bg-gold hover:bg-gold-hover text-charcoal text-xs font-black rounded-2xl transition-all shadow-lg shadow-gold/20 hover:scale-[1.02] cursor-pointer"
              >
                Masuk Dasbor Dosen &rarr;
              </button>
              <button
                onClick={() => onSelectPortal('mahasiswa')}
                className="px-6 py-3.5 border border-slate-300 dark:border-slate-700 hover:border-gold/40 dark:hover:border-gold/40 text-slate-700 dark:text-slate-300 hover:text-gold dark:hover:text-gold text-xs font-bold rounded-2xl transition-all hover:scale-[1.02] cursor-pointer"
              >
                Unggah Tugas Mahasiswa
              </button>
            </div>
          </div>

          {/* Heatmap Mini Mockup */}
          <div className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-yellow-600/10 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-extrabold text-slate-550 dark:text-slate-500 uppercase tracking-widest">Similarity Matrix NxN</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { s: '100%', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
                  { s: '98%', c: 'bg-rose-500 text-white font-bold' },
                  { s: '45%', c: 'bg-gold/20 text-gold font-bold border border-gold/30' },
                  { s: '0%', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  
                  { s: '98%', c: 'bg-rose-500 text-white font-bold' },
                  { s: '100%', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
                  { s: '32%', c: 'bg-gold/20 text-gold font-bold border border-gold/30' },
                  { s: '4%', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  
                  { s: '45%', c: 'bg-gold/20 text-gold font-bold border border-gold/30' },
                  { s: '32%', c: 'bg-gold/20 text-gold font-bold border border-gold/30' },
                  { s: '100%', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
                  { s: '12%', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  
                  { s: '0%', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { s: '4%', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { s: '12%', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { s: '100%', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
                ].map((item, idx) => (
                  <div key={idx} className={`p-2 rounded-lg text-center font-mono text-[10px] ${item.c}`}>
                    {item.s}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-center">
                Visualisasi matriks kesamaan leksikal & semantik real-time.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section Edukasi: Apa itu Platform Plagiarisme */}
      <section className="py-20 bg-white dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-950 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-gold block">Teknologi Inti</span>
            <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">Apa itu Platform Plagiarisme?</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Sebuah infrastruktur akademik modern yang dirancang untuk memetakan kesamaan karya ilmiah antarmahasiswa se-kelas secara presisi, cepat, dan menyeluruh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Kartu 1: BERT Model */}
            <div className="p-6 bg-slate-50 dark:bg-charcoal border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-4 hover:border-gold/30 dark:hover:border-gold/30 transition-all hover:scale-[1.01]">
              <div className="p-3 bg-gold/10 text-gold rounded-2xl w-12 h-12 flex items-center justify-center border border-gold/10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Pemahaman Semantik BERT</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Menggunakan kekuatan model pre-trained neural multilingual **SentenceTransformer (MiniLM)** untuk membaca makna kontekstual kalimat. Mampu mendeteksi parafrase kalimat tingkat tinggi, bukan sekadar membandingkan huruf demi huruf.
              </p>
            </div>

            {/* Kartu 2: Celery Pipeline */}
            <div className="p-6 bg-slate-50 dark:bg-charcoal border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-4 hover:border-gold/30 dark:hover:border-gold/30 transition-all hover:scale-[1.01]">
              <div className="p-3 bg-gold/10 text-gold rounded-2xl w-12 h-12 flex items-center justify-center border border-gold/10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Paralelisme Celery & Redis</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Pemrosesan dokumen yang padat komputasi NLP dipindahkan ke task worker asinkron **Celery** dengan perantara **Redis**. Server utama tetap ringan, responsif, dan bebas hambatan lag bagi pengguna.
              </p>
            </div>

            {/* Kartu 3: Classroom Flow & NxN Heatmap */}
            <div className="p-6 bg-slate-50 dark:bg-charcoal border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-4 hover:border-gold/30 dark:hover:border-gold/30 transition-all hover:scale-[1.01]">
              <div className="p-3 bg-gold/10 text-gold rounded-2xl w-12 h-12 flex items-center justify-center border border-gold/10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Google Classroom Workflow</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Mahasiswa hanya berhak mengunggah berkas tugas murni (PDF/DOCX) secara mandiri ke Cloud Supabase Storage. Seluruh visualisasi heatmap kesamaan NxN dan tombol kontrol audit dikunci eksklusif di Dasbor Dosen demi privasi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-900 py-10 bg-white dark:bg-charcoal text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-800 dark:text-slate-300">Plagiarism Platform</span>
            <span>&copy; 2026. Hak Cipta Dilindungi Undang-Undang.</span>
          </div>
          <div className="flex space-x-4">
            <span className="hover:text-gold transition-colors cursor-pointer">Panduan Akademik</span>
            <span className="hover:text-gold transition-colors cursor-pointer">Hubungi Bantuan</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
