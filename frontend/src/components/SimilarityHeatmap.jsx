import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Komponen SimilarityHeatmap
 * 
 * Komponen ini memvisualisasikan matriks kemiripan leksikal/semantik NxN hasil analisis plagiarisme
 * dalam bentuk Heatmap interaktif dan menyediakan fitur penyorotan teks (highlighting) side-by-side
 * berbentuk overlay modal berskala besar serta ekspor laporan PDF resmi akademik.
 */
export default function SimilarityHeatmap({ matrix, documents, filenames = [], overlapDetails = {}, mode = 'semantic' }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedPair, setSelectedPair] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  // State Slider Toleransi Dinamis (Default: 30%)
  const [tolerance, setTolerance] = useState(30);

  // Efek keyboard untuk menutup modal dengan menekan tombol 'Esc'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPair(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Validasi jika data matriks kosong atau tidak lengkap
  if (!matrix || matrix.length === 0 || !documents || documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-550 dark:text-slate-500 transition-colors">
        <p className="text-sm font-medium">Tidak ada data matriks kemiripan untuk ditampilkan.</p>
      </div>
    );
  }

  const N = matrix.length;

  // Helper untuk mendapatkan nama file
  const getFileName = (index) => {
    return filenames[index] || `Dokumen ${index + 1}`;
  };

  /**
   * Mengembalikan kelas warna Tailwind yang sesuai berdasarkan skor kemiripan.
   * - Diagonal (i === j): Neutral/Abu-abu (perbandingan dokumen yang sama)
   * - < 30%: Hijau (Aman/Rendah)
   * - 30% - 70%: Emas kustom (Menengah/Waspada)
   * - >= 70%: Merah (Tinggi/Indikasi Plagiarisme Kuat)
   */
  const getCellStyles = (score, i, j) => {
    if (i === j) {
      return "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed";
    }
    if (score < tolerance) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 hover:scale-105 transition-all cursor-pointer";
    }
    if (score >= tolerance && score < Math.min(100, tolerance + 30)) {
      return "bg-gold/15 text-yellow-800 dark:text-gold hover:bg-gold/25 dark:hover:bg-gold/30 hover:scale-105 transition-all cursor-pointer border border-gold/25 dark:border-gold/30";
    }
    return "bg-rose-500 text-white font-bold hover:bg-rose-600 hover:scale-105 transition-all shadow-md shadow-rose-500/10 border-2 border-rose-600 cursor-pointer animate-pulse";
  };

  // Menangani aksi klik pada salah satu sel heatmap
  const handleCellClick = (i, j, score) => {
    if (i === j) return;
    
    setSelectedPair({
      docAIndex: i,
      docBIndex: j,
      score: score,
      textA: documents[i],
      textB: documents[j]
    });
  };

  /**
   * Fungsi untuk memotong string panjang agar tidak memakan space UI
   */
  const truncateString = (str, num = 15) => {
    if (!str) return '';
    if (str.length <= num) return str;
    return str.slice(0, num) + '...';
  };

  /**
   * Fungsi untuk merender teks dengan tag <mark> pada bagian kalimat yang overlap (plagiat)
   */
  const renderHighlightedText = (text, highlights = []) => {
    if (!text) return '';
    if (!highlights || highlights.length === 0) return text;

    // Filter highlights berdasarkan toleransi slider jika ada atribut score
    const validHighlights = highlights.filter(h => h.score === undefined || h.score >= tolerance);
    if (validHighlights.length === 0) return text;

    // Ambil rentang indeks pencocokan diri sendiri
    const intervals = validHighlights.map(h => ({
      start: h.start_self,
      end: h.end_self
    }));

    // Urutkan rentang berdasarkan indeks mulai
    intervals.sort((a, b) => a.start - b.start);

    // Gabungkan interval yang tumpang tindih atau bersentuhan
    const merged = [];
    for (const interval of intervals) {
      if (merged.length === 0) {
        merged.push(interval);
      } else {
        const last = merged[merged.length - 1];
        if (interval.start <= last.end) {
          last.end = Math.max(last.end, interval.end);
        } else {
          merged.push(interval);
        }
      }
    }

    // Bangun rangkaian React node dengan tanda highlight <mark>
    const result = [];
    let lastIndex = 0;

    const isSemantic = mode === 'semantic';
    const markStyle = isSemantic
      ? "bg-sky-500/20 text-sky-950 dark:text-sky-300 border-b-2 border-sky-500 font-semibold px-0.5 rounded transition-all cursor-help"
      : "bg-amber-500/20 text-amber-950 dark:text-amber-300 border-b-2 border-amber-500 font-semibold px-0.5 rounded transition-all cursor-help";

    merged.forEach((interval, idx) => {
      // Teks biasa sebelum bagian yang mirip
      if (interval.start > lastIndex) {
        result.push(text.substring(lastIndex, interval.start));
      }
      // Teks penyorotan plagiarisme
      result.push(
        <mark 
          key={`m-${idx}`} 
          className={markStyle}
          title={isSemantic ? "Teks terindikasi mirip secara semantik (makna)" : "Teks terindikasi mirip secara leksikal (kosakata persis)"}
        >
          {text.substring(interval.start, interval.end)}
        </mark>
      );
      lastIndex = interval.end;
    });

    // Sisa teks setelah bagian penyorotan terakhir
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    return result;
  };

  /**
   * Mengekspor laporan lengkap deteksi plagiarisme akademik menjadi PDF
   */
  const handleExportPDF = async () => {
    const element = document.getElementById('plagiarism-report-container');
    if (!element) return;

    setIsExporting(true);

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Resolusi tinggi
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Memaksa mode putih (Light Academic Mode) pada klon dokumen saat diekspor ke PDF
          const reportEl = clonedDoc.getElementById('plagiarism-report-container');
          if (reportEl) {
            reportEl.classList.remove('dark', 'bg-slate-900');
            reportEl.style.backgroundColor = '#ffffff';
            reportEl.style.color = '#0f172a';
            
            // Pastikan semua elemen teks berubah menjadi gelap di atas kertas putih
            const darkTextNodes = reportEl.querySelectorAll('.dark\\:text-slate-100, .dark\\:text-slate-200, .dark\\:text-slate-300, .dark\\:text-white');
            darkTextNodes.forEach(node => {
              node.style.color = '#0f172a';
            });
            
            // Pastikan semua latar belakang kartu komponen menjadi terang/putih
            const darkBgNodes = reportEl.querySelectorAll('.dark\\:bg-slate-900, .dark\\:bg-slate-950, .dark\\:bg-slate-950\\/60');
            darkBgNodes.forEach(node => {
              node.style.backgroundColor = '#f8fafc';
              node.style.color = '#0f172a';
            });

            const darkBorders = reportEl.querySelectorAll('.dark\\:border-slate-800');
            darkBorders.forEach(node => {
              node.style.borderColor = '#e2e8f0';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // Lebar kertas A4 dalam mm
      const pageHeight = 297; // Tinggi kertas A4 dalam mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Halaman pertama
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Halaman tambahan
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const today = new Date().toISOString().split('T')[0];
      pdf.save(`Laporan_Deteksi_Plagiarisme_${today}.pdf`);
    } catch (err) {
      console.error("Gagal melakukan ekspor PDF:", err);
      alert("Terjadi kesalahan saat meng-generate PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Menghitung statistik keseluruhan
  const scores = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i !== j) scores.push(matrix[i][j]);
    }
  }
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / (scores.length || 1);
  const maxScore = Math.max(...(scores.length ? scores : [0]));

  return (
    <div className="w-full space-y-8">
      
      {/* KONTINER LAPORAN YANG AKAN DIEKSPOR KE PDF (DUAL-THEME) */}
      <div 
        id="plagiarism-report-container" 
        className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl rounded-3xl space-y-8 text-slate-850 dark:text-slate-100 transition-all duration-200"
      >
        {/* HEADER PDF PREMIUM */}
        <div className="border-b-4 border-gold pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-gold bg-gold/10 border border-gold/25 px-3 py-1 rounded-full">
              Laporan Analisis Plagiarisme Resmi
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PLATFORM DETEKSI PLAGIARISME AKADEMIK</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tanggal Analisis: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          {/* Tombol Ekspor PDF */}
          <button
            id="export-pdf-btn"
            data-html2canvas-ignore="true"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 self-start md:self-center px-5 py-3 bg-gold hover:bg-gold-hover text-charcoal text-xs font-black rounded-2xl transition-all shadow-lg shadow-gold/10 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-charcoal" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengekspor PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Ekspor Laporan Resmi (PDF)
              </>
            )}
          </button>
        </div>

        {/* RINGKASAN DATA STATISTIK & SLIDER TOLERANSI DINAMIS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 transition-colors">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Dokumen</span>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-200">{N}</p>
          </div>
          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 transition-colors">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Rata-rata Kemiripan</span>
            <p className={`text-2xl font-black ${
              avgScore >= tolerance ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>{avgScore.toFixed(1)}%</p>
          </div>
          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 transition-colors">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Kemiripan Tertinggi</span>
            <p className={`text-2xl font-black ${
              maxScore >= tolerance ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>{maxScore.toFixed(1)}%</p>
          </div>
          
          {/* SLIDER TOLERANSI PLAGIARISME DINAMIS */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-gold/30 rounded-2xl space-y-2 transition-colors relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-gold">Toleransi Plagiasi</span>
              <span className="text-xs font-black text-gold font-mono px-2 py-0.5 bg-gold/10 border border-gold/20 rounded-md">{tolerance}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full accent-gold cursor-pointer"
            />
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Geser untuk mengubah ambang batas warna indikator.</p>
          </div>
        </div>

        {/* SUBHEADER INTERAKTIF */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="text-md font-extrabold text-slate-800 dark:text-slate-200">Visual Matriks Heatmap NxN</h3>
              <p className="text-xs text-slate-500 font-medium">Klik pada sel persentase (sel berwarna merah/kuning) untuk meninjau secara bersisian.</p>
            </div>
            
            {/* Legenda Indikator Warna */}
            <div className="flex items-center space-x-3 text-[10px] font-bold">
              <span className="text-slate-550 dark:text-slate-550">Indikator:</span>
              <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-2 h-2 bg-emerald-450 rounded-full"></span>
                <span>&lt; 30% Aman</span>
              </div>
              <div className="flex items-center space-x-1 text-yellow-800 dark:text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                <span className="w-2 h-2 bg-gold rounded-full"></span>
                <span>30%-70% Waspada</span>
              </div>
              <div className="flex items-center space-x-1 text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                <span className="w-2 h-2 bg-rose-450 rounded-full animate-pulse"></span>
                <span>&ge; 70% Bahaya</span>
              </div>
            </div>
          </div>

          {/* Tabel Grid Heatmap */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-tl-xl text-[10px] font-extrabold text-slate-500 dark:text-slate-500 text-center w-24">
                    Berkas
                  </th>
                  {matrix.map((_, idx) => (
                    <th 
                      key={idx} 
                      className="p-3 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-650 dark:text-slate-400 text-center w-24"
                      title={getFileName(idx)}
                    >
                      {truncateString(getFileName(idx))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i} className="group hover:bg-slate-100 dark:hover:bg-slate-850/30 transition-colors">
                    {/* Label Baris Utama */}
                    <td 
                      className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-extrabold text-slate-650 dark:text-slate-400 text-center"
                      title={getFileName(i)}
                    >
                      {truncateString(getFileName(i))}
                    </td>
                    
                    {/* Sel Nilai Matriks */}
                    {row.map((score, j) => {
                      const isHovered = hoveredCell && (hoveredCell.i === i || hoveredCell.j === j);
                      return (
                        <td
                          key={j}
                          className={`p-1 border border-slate-200 dark:border-slate-800 text-center font-mono text-xs relative transition-all duration-150 ${
                            isHovered ? "bg-slate-100 dark:bg-slate-850/40" : ""
                          }`}
                          onMouseEnter={() => setHoveredCell({ i, j, score })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => handleCellClick(i, j, score)}
                        >
                          <button
                            className={`w-full py-3 rounded-lg text-center select-none ${getCellStyles(score, i, j)}`}
                            disabled={i === j}
                            title={`${getFileName(i)} vs ${getFileName(j)}: ${score.toFixed(1)}%`}
                          >
                            {score.toFixed(0)}%
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DYNAMIC TOOLTIP / STATUS BAR */}
        <div 
          data-html2canvas-ignore="true"
          className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 transition-colors"
        >
          {hoveredCell && hoveredCell.i !== hoveredCell.j ? (
            <p>
              Menyorot: <span className="font-bold text-slate-700 dark:text-slate-350">{truncateString(getFileName(hoveredCell.i))}</span> &rarr;{" "}
              <span className="font-bold text-slate-700 dark:text-slate-350">{truncateString(getFileName(hoveredCell.j))}</span> :{" "}
              <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                hoveredCell.score >= 70 ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300" : 
                hoveredCell.score >= 30 ? "bg-gold/10 text-yellow-800 dark:text-gold border border-gold/20 dark:border-gold/30" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
              }`}>{hoveredCell.score.toFixed(1)}% Kemiripan</span>
            </p>
          ) : (
            <p>Arahkan kursor ke atas sel untuk melihat detail cepat perbandingan berpasangan. Klik sel untuk membuka dialog bersisian.</p>
          )}
          <span className="hidden sm:inline text-slate-400 dark:text-slate-600 font-bold">Matriks Dimensi: {N} &times; {N}</span>
        </div>
      </div>

      {/* OVERLAY DIALOG/MODAL BERSKALA BESAR (SIDE-BY-SIDE HIGHLIGHTING) */}
      {selectedPair && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedPair(null)} // Klik backdrop untuk menutup modal
        >
          <div 
            className="w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-scaleUp text-slate-800 dark:text-slate-100 transition-colors"
            onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutup modal
          >
            {/* Header Panel Komparasi Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-2.5 py-0.5 rounded-full">
                  {mode === 'semantic' ? 'Analisis Komparasi Kalimat Semantik (Konteks & Parafrase)' : 'Analisis Komparasi Kosakata Leksikal (TF-IDF & Kata Persis)'}
                </span>
                <h4 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2 mt-1">
                  <span>Pemeriksa Kemiripan Bersisian (Side-by-Side)</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold border ${
                    selectedPair.score >= 70 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30 animate-pulse" : 
                    selectedPair.score >= 30 ? "bg-gold/10 text-yellow-800 dark:text-gold border-gold/20 dark:border-gold/30" : 
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30"
                  }`}>
                    {selectedPair.score.toFixed(1)}% Tingkat Plagiasi
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Membandingkan secara otomatis kalimat yang memiliki padanan makna tinggi antara kedua dokumen terpilih:
                </p>
              </div>
              
              {/* Tombol Tutup Panel Silang (X) */}
              <button
                onClick={() => setSelectedPair(null)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-700"
                title="Tutup (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Kotak Teks Dokumen Kiri & Kanan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dokumen A */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block max-w-[70%] truncate" title={getFileName(selectedPair.docAIndex)}>
                    📄 Dokumen A: {getFileName(selectedPair.docAIndex)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">Karakter: {selectedPair.textA.length}</span>
                </div>
                <div className={`p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-normal h-[350px] overflow-y-auto whitespace-pre-wrap selection:bg-gold selection:text-charcoal border-l-4 ${mode === 'semantic' ? 'border-l-sky-500' : 'border-l-amber-500'}`}>
                  {renderHighlightedText(
                    selectedPair.textA, 
                    overlapDetails[`${selectedPair.docAIndex}_${selectedPair.docBIndex}`]
                  )}
                </div>
              </div>

              {/* Dokumen B */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block max-w-[70%] truncate" title={getFileName(selectedPair.docBIndex)}>
                    📄 Dokumen B: {getFileName(selectedPair.docBIndex)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">Karakter: {selectedPair.textB.length}</span>
                </div>
                <div className={`p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-normal h-[350px] overflow-y-auto whitespace-pre-wrap selection:bg-gold selection:text-charcoal border-l-4 ${mode === 'semantic' ? 'border-l-sky-500' : 'border-l-amber-500'}`}>
                  {renderHighlightedText(
                    selectedPair.textB, 
                    overlapDetails[`${selectedPair.docBIndex}_${selectedPair.docAIndex}`]
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Panel Rekomendasi Audit & Tombol Tutup */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
              {selectedPair.score >= 70 ? (
                <p className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
                  <svg className="w-5 h-5 flex-shrink-0 text-rose-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    <strong className="uppercase">STATUS: BAHAYA PLAGIASI TINGGI.</strong> Kalimat berbayang emas terbukti memiliki makna semantik identik. Direkomendasikan tindakan tegas akademik.
                  </span>
                </p>
              ) : selectedPair.score >= 30 ? (
                <p className="text-yellow-700 dark:text-gold font-medium flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong className="uppercase">STATUS: WASPADA/SIMILARITAS PARSIAL.</strong> Ditemukan kecocokan moderat. Mohon verifikasi penggunaan tanda kutip dan sitasi referensi mahasiswa.
                  </span>
                </p>
              ) : (
                <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong className="uppercase">STATUS: AMAN.</strong> Tingkat kecocokan berada pada batas wajar toleransi sitasi umum.
                  </span>
                </p>
              )}

              <button
                onClick={() => setSelectedPair(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                Tutup Komparasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
