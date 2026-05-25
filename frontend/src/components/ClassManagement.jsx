import React, { useState, useEffect } from 'react';

export default function ClassManagement({ user, token, onSelectAssignment }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk form tambah kelas (Dosen)
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  // State untuk form join kelas (Mahasiswa)
  const [joinCode, setJoinCode] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);

  // State untuk melacak kelas mana yang sedang diklik untuk dilihat isinya (assignments)
  const [activeClass, setActiveClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // State untuk form tambah tugas (Dosen)
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDesc, setNewAssignDesc] = useState('');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [creatingAssign, setCreatingAssign] = useState(false);

  // Fetch daftar kelas saat komponen dimuat
  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/classes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil daftar kelas.");
      setClasses(data.classes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [token]);

  // Handler Dosen membuat kelas baru
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setCreatingClass(true);
    try {
      const response = await fetch('http://localhost:5000/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newClassName, description: newClassDesc }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat kelas baru.");
      
      alert(`Sukses! Kelas "${newClassName}" berhasil dibuat. Bagikan kode kelas: ${data.class.code}`);
      setNewClassName('');
      setNewClassDesc('');
      fetchClasses(); // Refresh list kelas
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingClass(false);
    }
  };

  // Handler Mahasiswa bergabung ke kelas via kode
  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoiningClass(true);
    try {
      const response = await fetch('http://localhost:5000/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal bergabung ke kelas.");
      
      alert(data.message);
      setJoinCode('');
      fetchClasses(); // Refresh list kelas
    } catch (err) {
      alert(err.message);
    } finally {
      setJoiningClass(false);
    }
  };

  // Handler memuat daftar tugas di kelas tertentu
  const handleSelectClass = async (cls) => {
    setActiveClass(cls);
    setLoadingAssignments(true);
    setAssignments([]);
    try {
      const response = await fetch(`http://localhost:5000/api/classes/${cls.id}/assignments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil daftar tugas.");
      setAssignments(data.assignments || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Handler Dosen membuat tugas baru
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignTitle.trim() || !newAssignDueDate) return;

    setCreatingAssign(true);
    try {
      const response = await fetch(`http://localhost:5000/api/classes/${activeClass.id}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newAssignTitle,
          description: newAssignDesc,
          due_date: new Date(newAssignDueDate).toISOString()
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat tugas baru.");
      
      alert("Sukses membuat sesi tugas baru!");
      setNewAssignTitle('');
      setNewAssignDesc('');
      setNewAssignDueDate('');
      handleSelectClass(activeClass); // Refresh daftar tugas
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingAssign(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* KIRI: DAFTAR KELAS & FORM INPUT */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* PANEL INPUT SESUAI PERAN */}
        {user.role === 'dosen' ? (
          // Form Buat Kelas (Dosen)
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
              Buat Kelas Baru
            </h3>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <input
                type="text"
                required
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Nama Kelas (misal: Proyek TI A)"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <textarea
                value={newClassDesc}
                onChange={(e) => setNewClassDesc(e.target.value)}
                placeholder="Deskripsi Kelas (opsional)"
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={creatingClass}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
              >
                {creatingClass ? "Memproses..." : "Terbitkan Kelas"}
              </button>
            </form>
          </div>
        ) : (
          // Form Join Kelas (Mahasiswa)
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
              Gabung Kelas Baru
            </h3>
            <form onSubmit={handleJoinClass} className="space-y-3">
              <input
                type="text"
                required
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Masukkan 6-Digit Kode Kelas"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center font-bold tracking-widest font-mono"
              />
              <button
                type="submit"
                disabled={joiningClass}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/10"
              >
                {joiningClass ? "Menghubungkan..." : "Masuk ke Kelas"}
              </button>
            </form>
          </div>
        )}

        {/* DAFTAR KELAS AKTIF */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Kelas Anda</h4>
          
          {loading ? (
            <p className="text-xs text-slate-400">Memuat kelas...</p>
          ) : classes.length === 0 ? (
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-400">
              Belum ada kelas terdaftar.
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    activeClass && activeClass.id === cls.id
                      ? "bg-slate-900 text-white border-slate-950 shadow-md"
                      : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold truncate max-w-[70%]">{cls.name}</h5>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      activeClass && activeClass.id === cls.id ? "bg-slate-800 text-indigo-400" : "bg-slate-100 text-slate-600"
                    }`}>
                      {cls.code}
                    </span>
                  </div>
                  {cls.description && (
                    <p className={`text-[10px] mt-1 line-clamp-1 ${
                      activeClass && activeClass.id === cls.id ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {cls.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* KANAN: DETAIL KELAS & DAFTAR SESI TUGAS */}
      <div className="lg:col-span-2 space-y-6">
        
        {activeClass ? (
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xl shadow-slate-100/10 space-y-6">
            
            {/* Header Detail Kelas */}
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-md font-extrabold text-slate-950">{activeClass.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeClass.description || "Tidak ada deskripsi."}</p>
              </div>
              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Kode Kelas: {activeClass.code}
              </span>
            </div>

            {/* FORM BUAT TUGAS BARU (KHUSUS DOSEN) */}
            {user.role === 'dosen' && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                  Buat Sesi Tugas Baru
                </h4>
                <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={newAssignTitle}
                    onChange={(e) => setNewAssignTitle(e.target.value)}
                    placeholder="Judul Tugas (misal: Makalah AI)"
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                  />
                  <input
                    type="datetime-local"
                    required
                    value={newAssignDueDate}
                    onChange={(e) => setNewAssignDueDate(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 text-slate-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={creatingAssign}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {creatingAssign ? "Menerbitkan..." : "Terbitkan Tugas"}
                  </button>
                </form>
              </div>
            )}

            {/* DAFTAR TUGAS AKTIF DI KELAS INI */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sesi Pengumpulan Tugas</h4>
              
              {loadingAssignments ? (
                <p className="text-xs text-slate-400">Memuat daftar tugas...</p>
              ) : assignments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada sesi tugas diterbitkan untuk kelas ini.</p>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assign) => {
                    const isOverdue = new Date(assign.due_date) < new Date();
                    return (
                      <div
                        key={assign.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl hover:bg-slate-50 transition-colors gap-3"
                      >
                        <div className="space-y-1">
                          <h5 className="text-xs font-extrabold text-slate-800">{assign.title}</h5>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                            <span>Dibuat: {new Date(assign.created_at).toLocaleDateString('id-ID')}</span>
                            <span>•</span>
                            <span className={isOverdue ? "text-rose-500 font-bold" : "text-amber-600 font-medium"}>
                              Tenggat: {new Date(assign.due_date).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>

                        {/* Tombol aksi unggah/analisis */}
                        <button
                          onClick={() => onSelectAssignment(assign.id, activeClass.id, assign.title)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-600/10 self-start sm:self-center"
                        >
                          {user.role === 'dosen' ? "Analisis Plagiarisme" : "Unggah Tugas"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xl shadow-slate-100/10 flex flex-col items-center justify-center text-center space-y-3 py-16">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-900">Belum Ada Kelas Terpilih</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Silakan pilih salah satu kelas di sebelah kiri untuk melihat sesi tugas atau menerbitkan tugas baru.
              </p>
            </div>
          </div>
        )}

      </div>
      
    </div>
  );
}
