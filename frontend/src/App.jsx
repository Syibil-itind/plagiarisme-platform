import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from './config';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import ClassManagement from './components/ClassManagement';
import SimilarityHeatmap from './components/SimilarityHeatmap';

export default function App() {
  // --- 1. STATE AUTENTIKASI, NAVIGASI & TEMA ---
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('landing'); // 'landing', 'login', 'register', atau 'dashboard'
  const [authRoleContext, setAuthRoleContext] = useState('mahasiswa'); // 'mahasiswa' atau 'dosen'

  // State manajemen tema (Light / Dark) tersimpan di localStorage
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Efek untuk mengaktifkan kelas .dark pada elemen <html> secara global
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- 2. STATE DRAG AND DROP FILE UPLOAD TUGAS ---
  const [selectedAssignment, setSelectedAssignment] = useState(null); // { id, classId, title }
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // --- 3. STATE ANTREAN TUGAS CELERY & POLL ---
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null); // PENDING, PROGRESS, SUCCESS, FAILURE
  const [progressInfo, setProgressInfo] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [uploadedFilenames, setUploadedFilenames] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('semantic'); // 'semantic' atau 'tfidf'
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(70);

  // --- 4. STATE BARU UNTUK OVERHAUL ALUR ---
  const [studentSubmission, setStudentSubmission] = useState(null); // { id, file_name, submitted_at, file_url }
  const [classSubmissions, setClassSubmissions] = useState([]); // List data mahasiswa yg sudah kumpul (Dosen)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Memeriksa status masuk tersimpan saat web di-boot pertama kali
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedProfile = localStorage.getItem('user_profile');
    if (savedToken && savedProfile) {
      setToken(savedToken);
      setUser(JSON.parse(savedProfile));
      setCurrentScreen('dashboard');
    }
  }, []);

  // Handler sukses masuk
  const handleLoginSuccess = (accessToken, userProfile) => {
    setToken(accessToken);
    setUser(userProfile);
    setCurrentScreen('dashboard');
  };

  const fetchSubmissions = async (assignmentId) => {
    if (!assignmentId) return;
    setLoadingSubmissions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/assignment/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (user?.role === 'dosen') {
          setClassSubmissions(data.submissions || []);
        } else {
          setStudentSubmission(data.submissions && data.submissions.length > 0 ? data.submissions[0] : null);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data pengumpulan:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (selectedAssignment && token) {
      fetchSubmissions(selectedAssignment.id);
    }
  }, [selectedAssignment, token]);

  // Handler keluar (Logout)
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
    setToken(null);
    setUser(null);
    setSelectedAssignment(null);
    setResultData(null);
    setStatus(null);
    setTaskId(null);
    setCurrentScreen('landing');
  };

  // --- LOGIKA DRAG AND DROP FILE UPLOAD ---
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const validateAndAddFiles = (files) => {
    const validExtensions = ['pdf', 'docx'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    const filteredFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(ext)) {
        alert(`File "${file.name}" ditolak! Hanya mendukung format dokumen .pdf atau .docx.`);
        return false;
      }
      if (file.size > maxSizeBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        alert(`File "${file.name}" ditolak! Ukuran berkas (${fileSizeMB} MB) melebihi batas maksimal 5MB.`);
        return false;
      }
      return true;
    });

    if (filteredFiles.length > 0) {
      setSelectedFiles([filteredFiles[0]]);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== index));
  };

  // --- KIRIM BERKAS TUGAS MAHASISWA ---
  const handleStudentSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert("Silakan pilih berkas tugas terlebih dahulu!");
      return;
    }

    setError(null);
    setStatus('PENDING');

    try {
      const formData = new FormData();
      formData.append('files', selectedFiles[0]); // Mahasiswa mengunggah file tunggal
      formData.append('assignment_id', selectedAssignment.id);

      const response = await fetch(`${API_BASE_URL}/api/submissions/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengumpulkan tugas.");

      alert("Tugas berhasil dikumpulkan!");
      setStudentSubmission(data.submission);
      setSelectedFiles([]);
      setStatus(null);
    } catch (err) {
      setError(err.message);
      setStatus(null);
    }
  };

  // --- JALANKAN AUDIT PLAGIARISME BATCH KELAS (DOSEN) ---
  const handleRunAudit = async () => {
    setError(null);
    setResultData(null);
    setStatus('PENDING');
    setProgressInfo({ status_message: "Mempersiapkan audit plagiarisme batch kelas..." });

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          threshold: plagiarismThreshold
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menjalankan audit plagiarisme.");

      setTaskId(data.task_id);
      setStatus(data.status);
    } catch (err) {
      setError(err.message);
      setStatus(null);
    }
  };

  // --- POLLING STATUS CELERY ---
  useEffect(() => {
    if (!taskId || (status !== 'PENDING' && status !== 'PROGRESS')) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/submissions/status/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status);
          setProgressInfo(data.progress);

          if (data.status === 'SUCCESS') {
            setResultData(data.result);
            if (data.result && data.result.filenames) {
              setUploadedFilenames(data.result.filenames);
            }
            clearInterval(interval);
          } else if (data.status === 'FAILURE') {
            setError(data.error || "Terjadi kesalahan saat pemrosesan NLP.");
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Gagal polling status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, status]);

  // --- RENDERING ROUTING PER LAYAR ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-charcoal text-slate-800 dark:text-slate-100 selection:bg-gold selection:text-charcoal transition-colors duration-200">
      {/* Unified Global Floating Theme Toggle Button */}
      <button
        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-[100] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-2xl shadow-lg dark:shadow-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
        title={theme === 'dark' ? "Ganti ke Mode Terang (Siang)" : "Ganti ke Mode Gelap (Malam)"}
      >
        {theme === 'dark' ? (
          // Ikon Matahari (☀️)
          <svg className="w-5 h-5 text-gold fill-gold" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          // Ikon Bulan (🌙)
          <svg className="w-5 h-5 text-slate-500 fill-slate-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>

      {/* Unified Routing Container */}
      {(() => {
        if (currentScreen === 'landing') {
          return (
            <LandingPage
              theme={theme}
              onSelectPortal={(role) => {
                setAuthRoleContext(role);
                setCurrentScreen('login');
              }}
            />
          );
        }

        if (currentScreen === 'login') {
          return (
            <Login
              initialRole={authRoleContext}
              onLoginSuccess={handleLoginSuccess}
              onNavigateToRegister={() => setCurrentScreen('register')}
              onBackToLanding={() => setCurrentScreen('landing')}
            />
          );
        }

        if (currentScreen === 'register') {
          return (
            <Register
              initialRole={authRoleContext}
              onRegisterSuccess={() => setCurrentScreen('login')}
              onNavigateToLogin={() => setCurrentScreen('login')}
              onBackToLanding={() => setCurrentScreen('landing')}
            />
          );
        }

        // SCREEN DASHBOARD UTAMA (PREMIUM DUAL-THEME)
        return (
          <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">

            {/* Navigation Bar Premium */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl dark:shadow-2xl gap-4 transition-colors">
              <div className="space-y-1">
                <span className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-gold bg-gold/10 border border-gold/25 px-2.5 py-1 rounded-full">
                  Connected Full-Stack Portal
                </span>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => setSelectedAssignment(null)}>
                  <span>Academic Plagiarism Checker</span>
                  {selectedAssignment && (
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">&rarr; Sesi Tugas</span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Masuk sebagai: <span className="font-bold text-slate-800 dark:text-slate-200">{user?.fullname}</span> ({user?.role === 'dosen' ? 'Dosen Pengampu' : 'Mahasiswa'})
                </p>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-center pr-12 md:pr-16">
                {resultData && (
                  <div className="bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl flex space-x-1 border border-slate-200 dark:border-slate-850">
                    <button
                      onClick={() => setSelectedTab('semantic')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${selectedTab === 'semantic' ? "bg-gold text-charcoal shadow-sm" : "text-slate-500 dark:text-slate-400"
                        }`}
                    >
                      Semantic (BERT)
                    </button>
                    <button
                      onClick={() => setSelectedTab('tfidf')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${selectedTab === 'tfidf' ? "bg-gold text-charcoal shadow-sm" : "text-slate-500 dark:text-slate-400"
                        }`}
                    >
                      Lexical (TF-IDF)
                    </button>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* VIEW 1: MANAJEMEN KELAS & TUGAS */}
            {!selectedAssignment && (
              <ClassManagement
                user={user}
                token={token}
                onSelectAssignment={(id, classId, title) => {
                  setSelectedAssignment({ id, classId, title });
                  setSelectedFiles([]);
                  setResultData(null);
                  setStatus(null);
                }}
              />
            )}

            {/* VIEW 2: PORTAL UNGGAHAN MAHASISWA / AUDIT DOSEN PER-TUGAS */}
            {selectedAssignment && (!status || status === 'SUCCESS' || status === 'FAILURE') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl dark:shadow-2xl space-y-6 transition-colors">

                {/* JIKA USER ADALAH MAHASISWA */}
                {user?.role === 'mahasiswa' && (
                  <>
                    {/* Header Pengumpulan Tugas (Mahasiswa) */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded">
                          Portal Mahasiswa
                        </span>
                        <h3 className="text-md font-extrabold text-slate-900 dark:text-white mt-1">Kumpulkan Tugas: {selectedAssignment.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Kumpulkan berkas tugas Anda (.pdf atau .docx) di bawah ini.</p>
                      </div>
                      <button
                        onClick={() => setSelectedAssignment(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                      >
                        &larr; Kembali ke Kelas
                      </button>
                    </div>

                    {/* Status Pengumpulan */}
                    {studentSubmission ? (
                      <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-500 text-white rounded-full">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                            Tugas Berhasil Dikumpulkan
                          </span>
                        </div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium space-y-1 pl-7">
                          <p>Nama Berkas: <strong className="text-emerald-900 dark:text-white">{studentSubmission.file_name}</strong></p>
                          <p>Diserahkan Pada: <strong className="text-emerald-900 dark:text-white">{new Date(studentSubmission.submitted_at).toLocaleString('id-ID')}</strong></p>
                          {studentSubmission.file_url && studentSubmission.file_url.startsWith('http') && (
                            <p className="mt-2 pt-1 border-t border-emerald-200 dark:border-emerald-900/30">
                              <a
                                href={studentSubmission.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-gold font-black hover:text-gold-hover underline"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Lihat Dokumen Terunggah
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 font-medium">
                        Status: <strong className="text-slate-600 dark:text-slate-400">Belum Mengumpulkan</strong>
                      </div>
                    )}

                    {/* Drag and Drop Box */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-10 px-4 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${isDragActive ? "border-gold bg-gold/5" : "border-slate-300 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/40 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                        }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 bg-gold/10 text-gold rounded-full border border-gold/10">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {studentSubmission ? "Unggah berkas baru untuk mengubah pengumpulan" : "Tarik & Lepas berkas tugas di sini"}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Hanya mendukung berkas .pdf & .docx (Ukuran maksimal 5MB)</p>
                        </div>
                      </div>
                    </div>

                    {/* Render List File */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Berkas Terpilih</h4>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80%]">{selectedFiles[0].name}</span>
                          <button
                            onClick={() => handleRemoveFile(0)}
                            className="text-slate-400 hover:text-rose-500 font-bold cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Footer Form */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {studentSubmission ? "*Mengunggah berkas baru akan menggantikan pengumpulan sebelumnya." : "Siap mengumpulkan berkas."}
                      </span>
                      <button
                        onClick={handleStudentSubmit}
                        disabled={selectedFiles.length === 0}
                        className="px-6 py-3 bg-gold hover:bg-gold-hover text-charcoal text-xs font-extrabold rounded-2xl transition-all shadow-md shadow-gold/10 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Kumpulkan Tugas
                      </button>
                    </div>
                  </>
                )}

                {/* JIKA USER ADALAH DOSEN */}
                {user?.role === 'dosen' && (
                  <>
                    {/* Header Audit (Dosen) */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded">
                          Pusat Kendali Dosen
                        </span>
                        <h3 className="text-md font-extrabold text-slate-950 dark:text-white mt-1">Audit Plagiarisme: {selectedAssignment.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Analisis kesamaan leksikal dan semantik untuk seluruh tugas mahasiswa.</p>
                      </div>
                      <button
                        onClick={() => setSelectedAssignment(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
                      >
                        &larr; Kembali ke Kelas
                      </button>
                    </div>

                    {/* Daftar Pengumpulan Mahasiswa */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Pengumpulan Kelas ({classSubmissions.length} Mahasiswa)</h4>

                      {loadingSubmissions ? (
                        <p className="text-xs text-slate-500 animate-pulse">Memuat berkas pengumpulan...</p>
                      ) : classSubmissions.length === 0 ? (
                        <div className="p-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500 shadow-inner">
                          Belum ada mahasiswa yang mengumpulkan tugas untuk sesi ini.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-charcoal border-b border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3">Nama Mahasiswa</th>
                                <th className="p-3">Nama Berkas</th>
                                <th className="p-3">Tanggal Pengumpulan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classSubmissions.map((sub) => (
                                <tr key={sub.id} className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{sub.users?.fullname || "Mahasiswa"}</td>
                                  <td className="p-3 font-mono text-gold font-semibold">{sub.file_name}</td>
                                  <td className="p-3 text-slate-500 dark:text-slate-400">{new Date(sub.submitted_at).toLocaleString('id-ID')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Slider Toleransi Plagiarisme (Langkah F.1) */}
                    <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-xs font-extrabold text-slate-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Toleransi Plagiarisme Maksimal
                          </label>
                          <p className="text-[11px] text-slate-500">Skor kemiripan di atas batas ini akan otomatis ditandai sebagai indikasi plagiarisme tinggi.</p>
                        </div>
                        <span className="text-lg font-black text-gold bg-gold/5 px-3 py-1.5 rounded-xl border border-gold/20">
                          {plagiarismThreshold}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-600">Ketat (10%)</span>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={plagiarismThreshold}
                          onChange={(e) => setPlagiarismThreshold(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold"
                        />
                        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-600">Longgar (100%)</span>
                      </div>
                    </div>

                    {/* Footer Audit */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {classSubmissions.length < 2
                          ? "*Minimal diperlukan 2 pengumpulan mahasiswa untuk diaudit."
                          : "Siap menjalankan audit plagiarisme batch kelas."}
                      </span>
                      <button
                        onClick={handleRunAudit}
                        disabled={classSubmissions.length < 2}
                        className="px-6 py-3 bg-gold hover:bg-gold-hover text-charcoal text-xs font-extrabold rounded-2xl transition-all shadow-md shadow-gold/10 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Jalankan Audit Plagiarisme Kelas
                      </button>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* LOADING & PROGRESS POLLING UI */}
            {(status === 'PENDING' || status === 'PROGRESS') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl dark:shadow-2xl flex flex-col items-center justify-center space-y-6 text-center text-slate-900 dark:text-white transition-colors">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <span className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 absolute"></span>
                  <span className="w-16 h-16 rounded-full border-4 border-t-gold border-r-gold border-b-transparent border-l-transparent absolute animate-spin"></span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-md font-extrabold text-slate-900 dark:text-slate-100">Sedang Menganalisis Dokumen...</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Teks berkas sedang diekstraksi dan dianalisis secara asinkron oleh Celery NLP worker.</p>
                </div>

                {progressInfo && (
                  <div className="w-full max-w-md p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Progress Langkah:</span>
                      <span>{progressInfo.current_step || 0} / {progressInfo.total_steps || 4}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold transition-all duration-500"
                        style={{ width: `${((progressInfo.current_step || 0) / (progressInfo.total_steps || 4)) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gold font-bold animate-pulse">
                      &rarr; {progressInfo.status_message}
                    </p>
                  </div>
                )}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Task ID: {taskId}</span>
              </div>
            )}

            {/* ERROR DISPLAY */}
            {error && (
              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-3xl text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-3">
                <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p><strong>Gagal:</strong> {error}</p>
              </div>
            )}

            {/* RENDERING MATRIX HEATMAP NYATA */}
            {status === 'SUCCESS' && resultData && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-extrabold text-slate-900 dark:text-white">Hasil Analisis Plagiarisme Pasangan NxN</h3>
                  <button
                    onClick={() => {
                      setStatus(null);
                      setTaskId(null);
                      setResultData(null);
                      setSelectedFiles([]);
                    }}
                    className="text-xs text-gold font-bold hover:underline cursor-pointer"
                  >
                    &larr; Bandingkan Berkas Baru
                  </button>
                </div>

                <SimilarityHeatmap
                  mode={selectedTab}
                  matrix={selectedTab === 'semantic' ? resultData.results.semantic_similarity : resultData.results.tfidf_similarity}
                  documents={resultData.results.original_documents || resultData.results.preprocessed_documents}
                  filenames={uploadedFilenames}
                  overlapDetails={resultData.results.overlap_details}
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
