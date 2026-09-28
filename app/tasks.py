import time
from celery import shared_task
from app.utils.plagiarism_detector import PlagiarismDetector
from app.db import get_supabase_client, get_supabase_admin_client
from app.utils.email import send_plagiarism_alert_email

def safe_update_state(task_obj, state, meta):
    try:
        task_obj.update_state(state=state, meta=meta)
    except Exception as e:
        print(f"[State Update Ignored] {e}")

@shared_task(bind=True)
def process_documents_task(self, documents, assignment_id=None, mahasiswa_id=None, filenames=None, threshold=70.0):
    """
    Celery task asinkron untuk melakukan analisis plagiarisme teks.
    Tugas ini mensimulasikan latensi NLP yang berat dengan melaporkan
    progres pengerjaan secara berkala ke Redis backend agar dapat dibaca frontend.
    Jika metadata lengkap disediakan, hasil akan otomatis disinkronkan ke PostgreSQL.
    """
    # Tahap 1: Memulai tahapan pembersihan teks bahasa Indonesia
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 1, 'total_steps': 4, 'status_message': 'Melakukan tokenisasi dan pembersihan stopword bahasa Indonesia...'}
    )
    time.sleep(0.5)

    # Tahap 2: Memulai pembobotan leksikal kata dengan TF-IDF
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 2, 'total_steps': 4, 'status_message': 'Pembersihan selesai. Sedang membangun kamus kata leksikal & matriks TF-IDF...'}
    )
    time.sleep(0.5)

    # Tahap 3: Memulai pemahaman semantik menggunakan transformer
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 3, 'total_steps': 4, 'status_message': 'Mengekstrak makna semantik kalimat menggunakan model neural transformer...'}
    )
    
    # Inisialisasi objek pendeteksi plagiarisme
    detector = PlagiarismDetector(documents)
    # Mengeksekusi kalkulasi kesamaan leksikal kata dan kesamaan konteks semantik
    plagiarism_results = detector.analyze()

    # Tahap 4: Finalisasi hasil analisis
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 4, 'total_steps': 4, 'status_message': 'Sinkronisasi hasil analisis ke database Supabase...'}
    )

    max_score = 0.0

    # Menyimpan hasil ke database jika data disediakan
    if assignment_id and mahasiswa_id:
        try:
            supabase = get_supabase_admin_client()
            submission_ids = []
            
            # 1. Simpan setiap dokumen ke tabel submissions
            for idx, text in enumerate(documents):
                file_name = filenames[idx] if (filenames and idx < len(filenames)) else f"dokumen_{idx+1}.txt"
                new_sub = {
                    "assignment_id": assignment_id,
                    "mahasiswa_id": mahasiswa_id,
                    "file_url": f"text://{text}", # Menyimpan teks asli dengan skema text://
                    "file_name": file_name
                }
                sub_res = supabase.table('submissions').insert(new_sub).execute()
                if sub_res.data:
                    submission_ids.append(sub_res.data[0]['id'])
                else:
                    submission_ids.append(None)

            # 2. Simpan perbandingan kemiripan pairwise ke similarity_results
            semantic_matrix = plagiarism_results["semantic_similarity"]
            overlap_details = plagiarism_results["overlap_details"]

            for i in range(len(documents)):
                for j in range(len(documents)):
                    if i != j and submission_ids[i] and submission_ids[j]:
                        score = semantic_matrix[i][j]
                        max_score = max(max_score, score)
                        
                        overlap_data = overlap_details.get(f"{i}_{j}", [])
                        
                        new_sim = {
                            "submission_a_id": submission_ids[i],
                            "submission_b_id": submission_ids[j],
                            "similarity_score": round(score, 2),
                            "overlap_details": overlap_data
                        }
                        supabase.table('similarity_results').insert(new_sim).execute()

            # 3. Ambil profil pengguna & kelas untuk dikirimi email otomatis
            student_query = supabase.table('users').select('email, fullname').eq('id', mahasiswa_id).single().execute()
            if student_query.data:
                student_email = student_query.data['email']
                student_name = student_query.data['fullname']
                
                assign_query = supabase.table('assignments').select('title, class_id').eq('id', assignment_id).single().execute()
                if assign_query.data:
                    assignment_title = assign_query.data['title']
                    class_id = assign_query.data['class_id']
                    
                    class_query = supabase.table('classes').select('name, dosen_id').eq('id', class_id).single().execute()
                    if class_query.data:
                        class_name = class_query.data['name']
                        dosen_id = class_query.data['dosen_id']
                        
                        dosen_query = supabase.table('users').select('email').eq('id', dosen_id).single().execute()
                        dosen_email = dosen_query.data['email'] if (dosen_query.data and dosen_query.data.get('email')) else "dosen@plagiarismchecker.edu"
                        
                        # Kirim notifikasi email
                        send_plagiarism_alert_email(
                            student_email=student_email,
                            student_name=student_name,
                            teacher_email=dosen_email,
                            assignment_title=assignment_title,
                            class_name=class_name,
                            max_score=max_score,
                            threshold=threshold
                        )
        except Exception as db_err:
            print(f"[Database ERROR] Gagal melakukan sinkronisasi database asinkron: {str(db_err)}")

    time.sleep(0.5)

    # Mengembalikan hasil analisis plagiarisme ke Redis backend
    return {
        "status": "COMPLETED",
        "total_documents_processed": len(documents),
        "results": plagiarism_results
    }


@shared_task(bind=True)
def audit_submissions_task(self, submission_ids, documents, filenames, assignment_id, threshold=70.0):
    """
    Celery task asinkron untuk melakukan analisis plagiarisme batch kelas pada submissions yang sudah terdaftar.
    """
    # Tahap 1: Memulai pembersihan teks
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 1, 'total_steps': 4, 'status_message': 'Melakukan tokenisasi dan pembersihan stopword bahasa Indonesia...'}
    )
    time.sleep(0.5)

    # Tahap 2: Memulai pembobotan leksikal
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 2, 'total_steps': 4, 'status_message': 'Pembersihan selesai. Sedang membangun kamus kata leksikal & matriks TF-IDF...'}
    )
    time.sleep(0.5)

    # Tahap 3: Memulai pemahaman semantik menggunakan transformer
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 3, 'total_steps': 4, 'status_message': 'Mengekstrak makna semantik kalimat menggunakan model neural transformer...'}
    )
    
    detector = PlagiarismDetector(documents)
    plagiarism_results = detector.analyze()

    # Tahap 4: Finalisasi hasil analisis & sinkronisasi database
    safe_update_state(
        self,
        state='PROGRESS', 
        meta={'current_step': 4, 'total_steps': 4, 'status_message': 'Menghapus data kesamaan lama & menyinkronkan hasil audit baru ke database Supabase...'}
    )

    try:
        supabase = get_supabase_admin_client()
        
        # 1. Hapus similarity results lama terkait submissions ini
        for sub_id in submission_ids:
            supabase.table('similarity_results').delete().eq('submission_a_id', sub_id).execute()
            supabase.table('similarity_results').delete().eq('submission_b_id', sub_id).execute()

        # 2. Simpan perbandingan kemiripan pairwise ke similarity_results
        semantic_matrix = plagiarism_results["semantic_similarity"]
        overlap_details = plagiarism_results["overlap_details"]

        # Melacak skor maksimum untuk setiap submission untuk keperluan notifikasi email
        max_scores_by_idx = {i: 0.0 for i in range(len(submission_ids))}

        for i in range(len(documents)):
            for j in range(len(documents)):
                if i != j and submission_ids[i] and submission_ids[j]:
                    score = semantic_matrix[i][j]
                    max_scores_by_idx[i] = max(max_scores_by_idx[i], score)
                    
                    overlap_data = overlap_details.get(f"{i}_{j}", [])
                    
                    new_sim = {
                        "submission_a_id": submission_ids[i],
                        "submission_b_id": submission_ids[j],
                        "similarity_score": round(score, 2),
                        "overlap_details": overlap_data
                    }
                    supabase.table('similarity_results').insert(new_sim).execute()

        # 3. Kirim notifikasi email otomatis ke mahasiswa & dosen untuk setiap tugas yang melebihi threshold
        assign_query = supabase.table('assignments').select('title, class_id').eq('id', assignment_id).single().execute()
        if assign_query.data:
            assignment_title = assign_query.data['title']
            class_id = assign_query.data['class_id']
            
            class_query = supabase.table('classes').select('name, dosen_id').eq('id', class_id).single().execute()
            if class_query.data:
                class_name = class_query.data['name']
                dosen_id = class_query.data['dosen_id']
                
                dosen_query = supabase.table('users').select('email').eq('id', dosen_id).single().execute()
                dosen_email = dosen_query.data['email'] if (dosen_query.data and dosen_query.data.get('email')) else "dosen@plagiarismchecker.edu"

                for i, sub_id in enumerate(submission_ids):
                    student_score = max_scores_by_idx[i]
                    
                    # Cari profil mahasiswa
                    sub_detail = supabase.table('submissions').select('mahasiswa_id').eq('id', sub_id).single().execute()
                    if sub_detail.data:
                        m_id = sub_detail.data['mahasiswa_id']
                        student_query = supabase.table('users').select('email, fullname').eq('id', m_id).single().execute()
                        if student_query.data:
                            student_email = student_query.data['email']
                            student_name = student_query.data['fullname']
                            
                            # Kirim notifikasi email otomatis
                            send_plagiarism_alert_email(
                                student_email=student_email,
                                student_name=student_name,
                                teacher_email=dosen_email,
                                assignment_title=assignment_title,
                                class_name=class_name,
                                max_score=student_score,
                                threshold=threshold
                            )
    except Exception as db_err:
        print(f"[Database ERROR] Gagal melakukan sinkronisasi database asinkron audit: {str(db_err)}")

    time.sleep(0.5)

    return {
        "status": "COMPLETED",
        "total_documents_processed": len(documents),
        "filenames": filenames,
        "results": plagiarism_results
    }

