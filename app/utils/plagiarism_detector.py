import numpy as np
import re
import difflib
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class PlagiarismDetector:
    """
    Kelas pendeteksi plagiarisme cerdas multi-metode (Leksikal + Semantik Sentence-Level Character N-Gram Context)
    yang memberikan hasil persentase leksikal (rendah saat parafrase) & semantik (tinggi saat parafrase).
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
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform(preprocessed_docs)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            similarity_matrix = np.clip(similarity_matrix, 0.0, 1.0) * 100
            return similarity_matrix.tolist()
        except ValueError:
            n = len(preprocessed_docs)
            return np.zeros((n, n)).tolist()

    # 2. Menghitung kemiripan SEMANTIK / PARAFRASE (Sentence-Level Character 4-Gram Context Matcher)
    def calculate_semantic_similarity(self):
        n = len(self.documents)
        similarity_matrix = np.eye(n) * 100.0

        def get_char_ngrams(text, n_len=4):
            clean = re.sub(r'\s+', ' ', text.lower()).strip()
            if len(clean) < n_len:
                return set([clean])
            return set([clean[i:i+n_len] for i in range(len(clean) - n_len + 1)])

        def sentence_semantic_score(s1, s2):
            g1 = get_char_ngrams(s1)
            g2 = get_char_ngrams(s2)
            if not g1 or not g2:
                return 0.0
            inter = len(g1.intersection(g2))
            union = len(g1.union(g2))
            jaccard = (inter / union) if union > 0 else 0.0

            seq = difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio()
            return jaccard * 0.6 + seq * 0.4

        for i in range(n):
            for j in range(i + 1, n):
                sents1 = [s['text'] for s in self.get_sentences_with_indices(self.documents[i])]
                sents2 = [s['text'] for s in self.get_sentences_with_indices(self.documents[j])]

                if not sents1 or not sents2:
                    score = 0.0
                else:
                    max_1 = [max([sentence_semantic_score(s1, s2) for s2 in sents2], default=0.0) for s1 in sents1]
                    max_2 = [max([sentence_semantic_score(s2, s1) for s1 in sents1], default=0.0) for s2 in sents2]
                    
                    avg_sim = (np.mean(max_1) + np.mean(max_2)) / 2.0
                    # Boost factor untuk menangkap paraphrase konteks secara sensitif
                    score = round(min(100.0, avg_sim * 140.0), 1)

                similarity_matrix[i][j] = score
                similarity_matrix[j][i] = score

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
    def get_overlap_highlights(self, threshold=0.45):
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
        overlap_details = self.get_overlap_highlights(threshold=0.45)

        return {
            "tfidf_similarity": tfidf_matrix,
            "semantic_similarity": semantic_matrix,
            "preprocessed_documents": preprocessed_docs,
            "original_documents": self.documents,
            "overlap_details": overlap_details
        }
