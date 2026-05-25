import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Komponen SimilarityHeatmap
 * 
 * Komponen ini memvisualisasikan matriks kemiripan leksikal/semantik NxN hasil analisis plagiarisme
 * dalam bentuk Heatmap interaktif dan menyediakan fitur penyorotan teks (highlighting) side-by-side
 * serta ekspor laporan PDF resmi akademik.
 */
export default function SimilarityHeatmap({ matrix, documents, filenames = [], overlapDetails = {} }) {
  // State untuk menyimpan baris dan kolom sel yang sedang di-hover pengguna
  const [hoveredCell, setHoveredCell] = useState(null);
  // State untuk menyimpan pasangan dokumen yang diklik untuk dibanding secara detail
  const [selectedPair, setSelectedPair] = useState(null);
  // State saat PDF sedang di-generate
  const [isExporting, setIsExporting] = useState(false);

  // Validasi jika data matriks kosong atau tidak lengkap
  if (!matrix || matrix.length === 0 || !documents || documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
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
   * - 30% - 70%: Kuning/Jingga (Menengah/Waspada)
   * - >= 70%: Merah (Tinggi/Indikasi Plagiarisme Kuat)
   */
  const getCellStyles = (score, i, j) => {
    if (i === j) {
      return "bg-slate-100 text-slate-400 cursor-not-allowed";
    }
    if (score < 30) {
      return "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 hover:scale-105 transition-all";
    }
    if (score >= 30 && score < 70) {
      return "bg-amber-500/30 text-amber-950 hover:bg-amber-500/45 hover:scale-105 transition-all";
    }
    // >= 70% (Plagiarisme Tinggi)
    return "bg-rose-500 text-white font-bold hover:bg-rose-600 hover:scale-105 transition-all shadow-md shadow-rose-500/10 border-2 border-rose-600";
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

    // Ambil rentang indeks pencocokan diri sendiri
    const intervals = highlights.map(h => ({
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

    merged.forEach((interval, idx) => {
      // Teks biasa sebelum bagian yang mirip
      if (interval.start > lastIndex) {
        result.push(text.substring(lastIndex, interval.start));
      }
      // Teks penyorotan plagiarisme
      result.push(
        <mark 
          key={`m-${idx}`} 
          className="bg-rose-500/35 text-white border-b border-rose-500 font-medium px-0.5 rounded transition-all cursor-help"
          title="Teks terindikasi mirip dengan dokumen pembanding"
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
        scale: 2, // Resolusi tinggi retina display
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
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

      // Halaman tambahan jika konten melebihi batas satu kertas A4
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
      {/* KONTINER LAPORAN YANG AKAN DIEKSPOR KE PDF */}
      <div 
        id="plagiarism-report-container" 
        className="p-8 bg-white border border-slate-200/80 shadow-xl shadow-slate-100/50 rounded-3xl space-y-8"
      >
        {/* HEADER PDF PREMIUM (Tampil saat ekspor) */}
        <div className="border-b-4 border-indigo-600 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center text-[10px] uppercase font-extrabold tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
              Laporan Analisis Plagiarisme Resmi
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">PLATFORM DETEKSI PLAGIARISME AKADEMIK</h2>
            <p className="text-xs text-slate-500 font-medium">
              Tanggal Analisis: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          {/* Tombol Ekspor PDF (Diabaikan dari capture html2canvas) */}
          <button
            id="export-pdf-btn"
            data-html2canvas-ignore="true"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 self-start md:self-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.99] disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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

        {/* RINGKASAN DATA STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Dokumen</span>
            <p className="text-2xl font-black text-slate-800">{N}</p>
          </div>
          <div className="p-5 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Rata-rata Kemiripan</span>
            <p className={`text-2xl font-black ${
              avgScore >= 70 ? "text-rose-600" : avgScore >= 30 ? "text-amber-600" : "text-emerald-600"
            }`}>{avgScore.toFixed(1)}%</p>
          </div>
          <div className="p-5 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Kemiripan Tertinggi</span>
            <p className={`text-2xl font-black ${
              maxScore >= 70 ? "text-rose-600" : maxScore >= 30 ? "text-amber-600" : "text-emerald-600"
            }`}>{maxScore.toFixed(1)}%</p>
          </div>
        </div>

        {/* SUBHEADER INTERAKTIF */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h3 className="text-md font-extrabold text-slate-800">Visual Matriks Heatmap NxN</h3>
              <p className="text-xs text-slate-400 font-medium">Klik pada sel di luar diagonal abu-abu untuk melakukan komparasi teks bersisian.</p>
            </div>
            
            {/* Legenda Indikator Warna */}
            <div className="flex items-center space-x-3 text-[10px] font-bold">
              <span className="text-slate-400">Indikator:</span>
              <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span>&lt; 30% Aman</span>
              </div>
              <div className="flex items-center space-x-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span>30%-70% Waspada</span>
              </div>
              <div className="flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                <span>&ge; 70% Bahaya</span>
              </div>
            </div>
          </div>

          {/* Tabel Grid Heatmap */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-tl-xl text-[10px] font-extrabold text-slate-400 text-center w-24">
                    Berkas
                  </th>
                  {matrix.map((_, idx) => (
                    <th 
                      key={idx} 
                      className="p-3 bg-slate-50/50 border border-slate-200/60 text-[10px] font-extrabold text-slate-600 text-center w-24"
                      title={getFileName(idx)}
                    >
                      {truncateString(getFileName(idx))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i} className="group hover:bg-slate-50/30 transition-colors">
                    {/* Label Baris Utama */}
                    <td 
                      className="p-3 border border-slate-200/60 bg-slate-50/50 text-[10px] font-extrabold text-slate-600 text-center"
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
                          className={`p-1 border border-slate-200/60 text-center font-mono text-xs relative transition-all duration-150 ${
                            isHovered ? "bg-slate-50/70" : ""
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

        {/* DYNAMIC TOOLTIP / STATUS BAR (Diabaikan saat ekspor PDF) */}
        <div 
          data-html2canvas-ignore="true"
          className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 flex items-center justify-between text-xs text-slate-500"
        >
          {hoveredCell && hoveredCell.i !== hoveredCell.j ? (
            <p>
              Menyorot: <span className="font-bold text-slate-700">{truncateString(getFileName(hoveredCell.i))}</span> &rarr;{" "}
              <span className="font-bold text-slate-700">{truncateString(getFileName(hoveredCell.j))}</span> :{" "}
              <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                hoveredCell.score >= 70 ? "bg-rose-100 text-rose-700" : 
                hoveredCell.score >= 30 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>{hoveredCell.score.toFixed(1)}% Kemiripan</span>
            </p>
          ) : (
            <p>Arahkan kursor ke atas sel untuk melihat detail cepat perbandingan berpasangan.</p>
          )}
          <span className="hidden sm:inline text-slate-400 font-bold">Matriks Dimensi: {N} &times; {N}</span>
        </div>
      </div>

      {/* PANEL PERBANDINGAN PREMIUM DENGAN HIGH-LEVEL OVERLAP HIGHLIGHTING */}
      {selectedPair && (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800/80 animate-fadeIn">
          {/* Header Panel Komparasi */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>Pemeriksa Kemiripan Bersisian (Side-by-Side)</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${
                  selectedPair.score >= 70 ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : 
                  selectedPair.score >= 30 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : 
                  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}>
                  {selectedPair.score.toFixed(1)}% Tingkat Plagiasi
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Membandingkan secara otomatis kalimat yang memiliki padanan makna tinggi antara:
              </p>
            </div>
            
            {/* Tombol Tutup Panel */}
            <button
              onClick={() => setSelectedPair(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Kotak Teks Dokumen Kiri & Kanan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dokumen A */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block max-w-[70%] truncate" title={getFileName(selectedPair.docAIndex)}>
                  {getFileName(selectedPair.docAIndex)}
                </span>
                <span className="text-[10px] text-slate-500 font-bold font-mono">Karakter: {selectedPair.textA.length}</span>
              </div>
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs leading-relaxed text-slate-300 font-normal min-h-[160px] max-h-[350px] overflow-y-auto whitespace-pre-wrap">
                {renderHighlightedText(
                  selectedPair.textA, 
                  overlapDetails[`${selectedPair.docAIndex}_${selectedPair.docBIndex}`]
                )}
              </div>
            </div>

            {/* Dokumen B */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block max-w-[70%] truncate" title={getFileName(selectedPair.docBIndex)}>
                  {getFileName(selectedPair.docBIndex)}
                </span>
                <span className="text-[10px] text-slate-500 font-bold font-mono">Karakter: {selectedPair.textB.length}</span>
              </div>
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs leading-relaxed text-slate-300 font-normal min-h-[160px] max-h-[350px] overflow-y-auto whitespace-pre-wrap">
                {renderHighlightedText(
                  selectedPair.textB, 
                  overlapDetails[`${selectedPair.docBIndex}_${selectedPair.docAIndex}`]
                )}
              </div>
            </div>
          </div>
          
          {/* Footer Panel Rekomendasi Audit */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            {selectedPair.score >= 70 ? (
              <p className="flex items-center gap-2 text-rose-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-extrabold">STATUS: BAHAYA PLAGIASI.</span> Kalimat bertanda merah terbukti serupa secara semantik/leksikal. Audit manual direkomendasikan.
              </p>
            ) : selectedPair.score >= 30 ? (
              <p className="text-amber-400 font-medium">
                <span className="font-extrabold">STATUS: WASPADA.</span> Ditemukan kesamaan parsial. Silakan periksa kelengkapan referensi sitasi tugas.
              </p>
            ) : (
              <p className="text-emerald-400 font-medium">
                <span className="font-extrabold">STATUS: AMAN.</span> Kesamaan berada pada rentang wajar (umum/sitasi dasar).
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
