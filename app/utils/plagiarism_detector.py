import numpy as np
import re
import difflib
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class PlagiarismDetector:
    """
    Kelas pendeteksi plagiarisme cerdas multi-metode (Leksikal + Semantik N-Gram Context)
    yang memberikan hasil persentase leksikal & semantik yang berbeda serta highlight pencocokan kalimat.
    """
    def __init__(self, documents):
        self.documents = documents
        
        # Stopword remover & Stemmer dari Sastrawi untuk Bahasa Indonesia
        stopword_factory = StopWordRemoverFactory()
        self.stopword_remover = stopword_factory.create_stop_word_remover()
        
        stemmer_factory = StemmerFactory()
        self.stemmer = stemmer_factory.create_stemmer()

    # Preprocessing teks Bahasa Indonesia (Case folding, Stopword Removal, Stemming)
    def preprocess_text(self, text):
        text_lower = text.lower()
        cleaned_text = self.stopword_remover.remove(text_lower)
        stemmed_text = self.stemmer.stem(cleaned_text)
        return stemmed_text

    # 1. Menghitung kemiripan LEKSIKAL (TF-IDF + Cosine Similarity)
    def calculate_tfidf_similarity(self, preprocessed_docs):
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2))
            tfidf_matrix = vectorizer.fit_transform(preprocessed_docs)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            similarity_matrix = np.clip(similarity_matrix, 0.0, 1.0) * 100
            return similarity_matrix.tolist()
        except ValueError:
            n = len(preprocessed_docs)
            return np.zeros((n, n)).tolist()

    # 2. Menghitung kemiripan SEMANTIK / STRUKTURAL (Character & Word N-Gram Jaccard + SequenceMatcher)
    def calculate_semantic_similarity(self):
        n = len(self.documents)
        similarity_matrix = np.eye(n) * 100.0

        for i in range(n):
            for j in range(i + 1, n):
                doc1 = self.documents[i]
                doc2 = self.documents[j]

                # Extract n-grams (3-gram kata dan 5-gram karakter untuk menangkap susunan konteks)
                words1 = re.findall(r'\w+', doc1.lower())
                words2 = re.findall(r'\w+', doc2.lower())

                if not words1 or not words2:
                    sim_score = 0.0
                else:
                    # N-gram Jaccard similarity
                    ngrams1 = set(zip(*[words1[k:] for k in range(min(3, len(words1)))]))
                    ngrams2 = set(zip(*[words2[k:] for k in range(min(3, len(words2)))]))

                    intersection = len(ngrams1.intersection(ngrams2))
                    union = len(ngrams1.union(ngrams2))
                    jaccard_score = (intersection / union) if union > 0 else 0.0

                    # SequenceMatcher ratio (urutan susunan kalimat)
                    seq_matcher = difflib.SequenceMatcher(None, doc1.lower(), doc2.lower())
                    seq_score = seq_matcher.ratio()

                    # Gabungan skor semantik konteks & struktur
                    combined_score = (jaccard_score * 0.4 + seq_score * 0.6) * 100.0
                    sim_score = min(100.0, max(0.0, combined_score))

                similarity_matrix[i][j] = round(sim_score, 1)
                similarity_matrix[j][i] = round(sim_score, 1)

        return similarity_matrix.tolist()

    # Membagi teks menjadi kalimat beserta indeks posisi karakternya
    def get_sentences_with_indices(self, text):
        sentences = []
        pattern = re.compile(r'[^.!?\n]+[.!?\n]*')
        for match in pattern.finditer(text):
            sentence_text = match.group().strip()
            if len(sentence_text) >= 8:
                sentences.append({
                    "text": sentence_text,
                    "start": match.start(),
                    "end": match.end()
                })
        return sentences

    # 3. Menghitung pencocokan kalimat (Highlight Overlap) berbasis Fuzzy Pairwise Matching
    def get_overlap_highlights(self, threshold=0.55):
        overlap_matrix = {}
        doc_sentences = [self.get_sentences_with_indices(doc) for doc in self.documents]

        for d1 in range(len(self.documents)):
            for d2 in range(len(self.documents)):
                if d1 == d2:
                    continue

                sents1 = doc_sentences[d1]
                sents2 = doc_sentences[d2]

                key = f"{d1}_{d2}"
                overlap_matrix[key] = []

                for s1 in sents1:
                    for s2 in sents2:
                        matcher = difflib.SequenceMatcher(None, s1["text"].lower(), s2["text"].lower())
                        score = matcher.ratio()

                        if score >= threshold:
                            overlap_matrix[key].append({
                                "start_self": s1["start"],
                                "end_self": s1["end"],
                                "start_other": s2["start"],
                                "end_other": s2["end"],
                                "score": round(score * 100, 1)
                            })

        return overlap_matrix

    # 4. Fungsi Utama Analisis Plagiarisme
    def analyze(self):
        preprocessed_docs = [self.preprocess_text(doc) for doc in self.documents]
        tfidf_matrix = self.calculate_tfidf_similarity(preprocessed_docs)
        semantic_matrix = self.calculate_semantic_similarity()
        overlap_details = self.get_overlap_highlights(threshold=0.55)

        return {
            "tfidf_similarity": tfidf_matrix,
            "semantic_similarity": semantic_matrix,
            "preprocessed_documents": preprocessed_docs,
            "original_documents": self.documents,
            "overlap_details": overlap_details
        }
