import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ClassManagement from './components/ClassManagement';
import SimilarityHeatmap from './components/SimilarityHeatmap';

export default function App() {
  // --- 1. STATE AUTENTIKASI ---
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'register', atau 'dashboard'

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
    setCurrentScreen('login');
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
    const validExtensions = ['txt', 'pdf', 'docx', 'zip'];
    const filteredFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(ext)) {
        alert(`File "${file.name}" dilewati. Hanya mendukung format .txt, .pdf, .docx, atau .zip!`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...filteredFiles]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== index));
  };

  // --- KIRIM BERKAS TUGAS KE BACKEND FLASK ---
  const handleStartAnalysis = async () => {
    if (selectedFiles.length === 0) {
      alert("Silakan pilih berkas tugas terlebih dahulu!");
      return;
    }

    setError(null);
    setResultData(null);
    setStatus('PENDING');
    setProgressInfo({ status_message: "Mempersiapkan pengiriman berkas..." });

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      // Menyertakan referensi ID tugas saat upload
      formData.append('assignment_id', selectedAssignment.id);
      formData.append('threshold', plagiarismThreshold);

      const response = await fetch('http://localhost:5000/api/submissions/upload-files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // Token autentikasi JWT
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengunggah berkas ke server.");

      setTaskId(data.task_id);
      setStatus(data.status);
      setUploadedFilenames(data.filenames || selectedFiles.map(f => f.name));
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
        const response = await fetch(`http://localhost:5000/api/submissions/status/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status);
          setProgressInfo(data.progress);
          
          if (data.status === 'SUCCESS') {
            setResultData(data.result);
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
  if (currentScreen === 'login') {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onNavigateToRegister={() => setCurrentScreen('register')} 
      />
    );
  }

  if (currentScreen === 'register') {
    return (
      <Register 
        onRegisterSuccess={() => setCurrentScreen('login')} 
        onNavigateToLogin={() => setCurrentScreen('login')} 
      />
    );
  }

  // SCREEN DASHBOARD UTAMA
  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        
        {/* Navigation Bar Premium */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xl shadow-slate-100/30 gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Connected Full-Stack Portal
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Academic Plagiarism Checker</span>
              {selectedAssignment && (
                <span className="text-xs font-bold text-slate-400">&rarr; Sesi Tugas</span>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              Masuk sebagai: <span className="font-bold text-slate-800">{user?.fullname}</span> ({user?.role === 'dosen' ? 'Dosen Pengampu' : 'Mahasiswa'})
            </p>
          </div>
          
          <div className="flex items-center space-x-2 self-start sm:self-center">
            {resultData && (
              <div className="bg-slate-100 p-1.5 rounded-2xl flex space-x-1">
                <button
                  onClick={() => setSelectedTab('semantic')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                    selectedTab === 'semantic' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  Semantic (MiniLM)
                </button>
                <button
                  onClick={() => setSelectedTab('tfidf')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                    selectedTab === 'tfidf' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  Lexical (TF-IDF)
                </button>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl transition-colors"
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

        {/* VIEW 2: UNGGAHAN BATCH DRAG-AND-DROP FILE UPLOAD PER-TUGAS */}
        {selectedAssignment && (!status || status === 'SUCCESS' || status === 'FAILURE') && (
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xl shadow-slate-100/20 space-y-6">
            
            {/* Header Komparasi Tugas */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Sesi Pengumpulan
                </span>
                <h3 className="text-md font-extrabold text-slate-950 mt-1">Mengunggah untuk Tugas: {selectedAssignment.title}</h3>
                <p className="text-xs text-slate-500">Unggah berkas ZIP/PDF/DOCX untuk menjalankan analisis plagiarisme.</p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                &larr; Kembali ke Kelas
              </button>
            </div>

            {/* Drag and Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-10 px-4 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                isDragActive ? "border-indigo-500 bg-indigo-50/40" : "border-slate-300 bg-slate-50/20 hover:bg-slate-50/60"
              }`}
            >
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.zip"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Tarik & Lepas berkas tugas di sini</p>
                  <p className="text-xs text-slate-500 mt-1">Atau klik area ini untuk browsing berkas</p>
                </div>
              </div>
            </div>

            {/* Render List File */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Berkas Siap Diunggah ({selectedFiles.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[80%]">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slider Toleransi Plagiarisme (Langkah F.1) */}
            <div className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Toleransi Plagiarisme Maksimal
                  </label>
                  <p className="text-[11px] text-slate-500">Skor kemiripan di atas batas ini akan otomatis ditandai sebagai indikasi plagiarisme tinggi.</p>
                </div>
                <span className="text-lg font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/50">
                  {plagiarismThreshold}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400">Ketat (10%)</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={plagiarismThreshold}
                  onChange={(e) => setPlagiarismThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-[10px] font-bold text-slate-400">Longgar (100%)</span>
              </div>
            </div>

            {/* Footer Form */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Berkas: {selectedFiles.length}</span>
              <button
                onClick={handleStartAnalysis}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md shadow-indigo-600/10 hover:scale-[1.01]"
              >
                Mulai Analisis Plagiarisme Asinkron
              </button>
            </div>

          </div>
        )}

        {/* LOADING & PROGRESS POLLING UI */}
        {(status === 'PENDING' || status === 'PROGRESS') && (
          <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xl shadow-slate-100/20 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full border-4 border-slate-100 absolute"></span>
              <span className="w-16 h-16 rounded-full border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent absolute animate-spin"></span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-md font-extrabold text-slate-900">Sedang Menganalisis Dokumen...</h3>
              <p className="text-xs text-slate-500 max-w-sm">Teks berkas sedang diekstraksi dan dianalisis secara asinkron oleh Celery NLP worker.</p>
            </div>

            {progressInfo && (
              <div className="w-full max-w-md p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Progress Langkah:</span>
                  <span>{progressInfo.current_step || 0} / {progressInfo.total_steps || 4}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${((progressInfo.current_step || 0) / (progressInfo.total_steps || 4)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-indigo-700 font-bold animate-pulse">
                  &rarr; {progressInfo.status_message}
                </p>
              </div>
            )}
            <span className="text-[10px] text-slate-400 font-mono">Task ID: {taskId}</span>
          </div>
        )}

        {/* ERROR DISPLAY */}
        {error && (
          <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl text-rose-800 text-xs font-medium flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p><strong>Gagal:</strong> {error}</p>
          </div>
        )}

        {/* RENDERING MATRIX HEATMAP NYATA */}
        {status === 'SUCCESS' && resultData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-extrabold text-slate-900">Hasil Analisis Plagiarisme Pasangan NxN</h3>
              <button
                onClick={() => {
                  setStatus(null);
                  setTaskId(null);
                  setResultData(null);
                  setSelectedFiles([]);
                }}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                &larr; Bandingkan Berkas Baru
              </button>
            </div>

            <SimilarityHeatmap 
              matrix={selectedTab === 'semantic' ? resultData.results.semantic_similarity : resultData.results.tfidf_similarity} 
              documents={resultData.results.original_documents || resultData.results.preprocessed_documents} 
              filenames={uploadedFilenames}
              overlapDetails={resultData.results.overlap_details}
            />
          </div>
        )}

      </div>
    </div>
  );
}
