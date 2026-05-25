# Import library numpy untuk memproses data array & matriks matematika
import numpy as np
import re
# Import Sastrawi StopWordRemoverFactory untuk membuang kata tidak penting (stopword) bahasa Indonesia
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
# Import Sastrawi StemmerFactory untuk melakukan stemming (mengubah kata berimbuhan ke kata dasar) bahasa Indonesia
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
# Import TfidfVectorizer untuk mengonversi kumpulan teks dokumen menjadi matriks pembobotan kata TF-IDF
from sklearn.feature_extraction.text import TfidfVectorizer
# Import cosine_similarity untuk menghitung derajat kecocokan sudut (cosine) di antara pasangan vektor dokumen
from sklearn.metrics.pairwise import cosine_similarity
# Import SentenceTransformer untuk melakukan kalkulasi semantik berbasis Deep Learning / neural embeddings
from sentence_transformers import SentenceTransformer

# Deklarasi kelas utama untuk mendeteksi tingkat kemiripan plagiarisme antar dokumen
class PlagiarismDetector:
    
    # Fungsi inisialisasi objek (constructor) untuk mempersiapkan data dokumen dan model NLP
    def __init__(self, documents):
        # Menyimpan daftar string (dokumen tugas mahasiswa) ke dalam properti kelas
        self.documents = documents
        
        # Membuat factory pembuat stopword remover bahasa Indonesia dari Sastrawi
        stopword_factory = StopWordRemoverFactory()
        # Menginisialisasi objek stopword remover untuk digunakan saat preprocessing teks
        self.stopword_remover = stopword_factory.create_stop_word_remover()
        
        # Membuat factory pembuat stemmer kata bahasa Indonesia dari Sastrawi
        stemmer_factory = StemmerFactory()
        # Menginisialisasi objek stemmer untuk mengubah kata berimbuhan menjadi kata dasar
        self.stemmer = stemmer_factory.create_stemmer()
        
        # Memuat pre-trained model SentenceTransformer multilingual untuk kemiripan semantik
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

    # Fungsi pembantu untuk memproses satu dokumen teks tunggal bahasa Indonesia
    def preprocess_text(self, text):
        # Mengubah seluruh huruf teks menjadi huruf kecil (case folding) untuk konsistensi data
        text_lower = text.lower()
        # Menghapus kata-kata tidak penting (stopword removal) seperti "yang", "dan", "di" menggunakan Sastrawi
        cleaned_text = self.stopword_remover.remove(text_lower)
        # Melakukan stemming untuk memotong imbuhan kata sehingga tersisa kata dasar saja menggunakan Sastrawi
        stemmed_text = self.stemmer.stem(cleaned_text)
        # Mengembalikan string teks yang telah selesai dibersihkan dan disederhanakan
        return stemmed_text

    # Fungsi untuk menghitung kemiripan kata secara leksikal menggunakan skema TF-IDF dan Cosine Similarity
    def calculate_tfidf_similarity(self, preprocessed_docs):
        # Menginisialisasi objek TfidfVectorizer untuk merepresentasikan kata-kata unik sebagai dimensi fitur
        vectorizer = TfidfVectorizer()
        # Mentransformasikan dokumen teks ter-preprocess menjadi representasi matriks bobot TF-IDF angka numerik
        tfidf_matrix = vectorizer.fit_transform(preprocessed_docs)
        # Menghitung kecocokan sudut (cosine similarity) berpasangan di antara semua baris matriks TF-IDF
        similarity_matrix = cosine_similarity(tfidf_matrix)
        # Mengubah skala desimal [0.0, 1.0] ke persentase [0.0, 100.0] dan melakukan pembatasan (clipping)
        similarity_matrix = np.clip(similarity_matrix, 0.0, 1.0) * 100
        # Mengonversi matriks hasil kalkulasi numpy ke dalam bentuk list bertingkat agar aman dikonversi ke JSON
        return similarity_matrix.tolist()

    # Fungsi untuk menghitung kemiripan dokumen berdasarkan pemahaman konteks makna kalimat (Semantik)
    def calculate_semantic_similarity(self):
        # Melakukan pengodean dokumen asli ke dalam representasi dense embeddings vektor 384-dimensi menggunakan model PyTorch
        embeddings = self.model.encode(self.documents, convert_to_tensor=True)
        # Memindahkan tensor hasil pemrosesan model (bisa dari GPU/CPU) ke CPU lokal lalu mengubahnya menjadi numpy array
        embeddings_np = embeddings.cpu().numpy()
        # Menghitung cosine similarity di antara seluruh vektor representasi semantik dokumen secara pairwise
        similarity_matrix = cosine_similarity(embeddings_np)
        # Mengubah skala desimal [0.0, 1.0] ke persentase [0.0, 100.0] dan melakukan pembatasan (clipping)
        similarity_matrix = np.clip(similarity_matrix, 0.0, 1.0) * 100
        # Mengonversi matriks nilai kecocokan semantik numpy ke dalam format list bertingkat agar siap di-JSON
        return similarity_matrix.tolist()

    # Membagi teks menjadi kalimat-kalimat beserta posisi indeks karakter aslinya
    def get_sentences_with_indices(self, text):
        sentences = []
        # Menggunakan regex untuk mendeteksi kalimat (dipisah titik, tanda tanya, seru, atau baris baru)
        pattern = re.compile(r'[^.!?\n]+[.!?\n]*')
        for match in pattern.finditer(text):
            sentence_text = match.group().strip()
            if len(sentence_text) > 8: # Abaikan kalimat yang terlalu pendek/tidak berarti
                sentences.append({
                    "text": sentence_text,
                    "start": match.start(),
                    "end": match.end()
                })
        return sentences

    # Menghitung pencocokan kalimat pairwise untuk deteksi highlight overlapping
    def get_overlap_highlights(self):
        overlap_matrix = {}
        doc_sentences = [self.get_sentences_with_indices(doc) for doc in self.documents]
        
        all_sentences = []
        sentence_map = [] # Menyimpan tuple (doc_idx, sent_idx)
        
        for d_idx, sents in enumerate(doc_sentences):
            for s_idx, sent in enumerate(sents):
                all_sentences.append(sent["text"])
                sentence_map.append((d_idx, s_idx))
                
        if not all_sentences:
            return {}
            
        # Kalkulasi embeddings untuk seluruh kalimat
        embeddings = self.model.encode(all_sentences, convert_to_tensor=True)
        embeddings_np = embeddings.cpu().numpy()
        sim_matrix = cosine_similarity(embeddings_np)
        
        # Bangun indeks pencocokan pairwise
        for idx1, (d1, s1) in enumerate(sentence_map):
            for idx2, (d2, s2) in enumerate(sentence_map):
                if d1 >= d2: # Cukup bandingkan sekali, hindari self-comparison
                    continue
                    
                score = float(sim_matrix[idx1][idx2])
                if score >= 0.78: # Threshold sensitivitas plagiarisme kalimat semantik
                    sent1 = doc_sentences[d1][s1]
                    sent2 = doc_sentences[d2][s2]
                    
                    # Hubungan d1 -> d2
                    key_forward = f"{d1}_{d2}"
                    if key_forward not in overlap_matrix:
                        overlap_matrix[key_forward] = []
                    overlap_matrix[key_forward].append({
                        "start_self": sent1["start"],
                        "end_self": sent1["end"],
                        "start_other": sent2["start"],
                        "end_other": sent2["end"],
                        "score": score
                    })
                    
                    # Hubungan d2 -> d1 (swapped roles)
                    key_backward = f"{d2}_{d1}"
                    if key_backward not in overlap_matrix:
                        overlap_matrix[key_backward] = []
                    overlap_matrix[key_backward].append({
                        "start_self": sent2["start"],
                        "end_self": sent2["end"],
                        "start_other": sent1["start"],
                        "end_other": sent1["end"],
                        "score": score
                    })
                    
        return overlap_matrix

    # Fungsi utama yang mengoordinasikan seluruh tahapan analisis plagiarisme
    def analyze(self):
        # Melakukan proses iterasi pembersihan teks (preprocessing) pada setiap string dokumen di dalam array
        preprocessed_docs = [self.preprocess_text(doc) for doc in self.documents]
        
        # Mengeksekusi kalkulasi kemiripan teks berbasis frekuensi kemunculan kata (TF-IDF)
        tfidf_matrix = self.calculate_tfidf_similarity(preprocessed_docs)
        
        # Mengeksekusi kalkulasi kemiripan makna kalimat (Semantik) menggunakan deep learning transformers
        semantic_matrix = self.calculate_semantic_similarity()
        
        # Mengekstrak kemiripan kalimat detail untuk visualisasi highlight
        overlap_details = self.get_overlap_highlights()
        
        # Membungkus semua hasil olahan data ke dalam struktur kamus (dictionary) Python
        result = {
            "tfidf_similarity": tfidf_matrix,
            "semantic_similarity": semantic_matrix,
            "preprocessed_documents": preprocessed_docs,
            "original_documents": self.documents,
            "overlap_details": overlap_details
        }
        
        # Mengembalikan dictionary berisi matriks NxN yang siap dilempar langsung sebagai JSON ke client/frontend
        return result
