from flask import Blueprint, request, jsonify, g
from app.tasks import process_documents_task, audit_submissions_task
from app.utils.file_parser import parse_file, parse_file_from_bytes
from app.utils.decorators import login_required, dosen_only
from app.db import get_supabase_client
from celery.result import AsyncResult

# Inisialisasi blueprint submissions
submissions_bp = Blueprint('submissions', __name__)

@submissions_bp.route('/upload', methods=['POST'])
@login_required
def upload_documents():
    """
    Endpoint POST untuk memicu analisis deteksi plagiarisme secara asinkron.
    Menerima body JSON berupa array/list dari string dokumen.
    """
    data = request.get_json()
    
    if not data or 'documents' not in data:
        return jsonify({
            "error": "Format data salah. Silakan kirimkan objek JSON dengan field 'documents'!"
        }), 400
        
    documents = data['documents']
    
    if not isinstance(documents, list):
        return jsonify({
            "error": "Field 'documents' harus berupa array berisi string teks!"
        }), 400
        
    if len(documents) < 2:
        return jsonify({
            "error": "Tugas memerlukan minimal 2 dokumen atau lebih untuk dibandingkan kemiripannya!"
        }), 400

    assignment_id = data.get('assignment_id')
    mahasiswa_id = g.user.id
    filenames = data.get('filenames')
    
    threshold_val = data.get('threshold', 70)
    try:
        threshold = float(threshold_val)
    except (ValueError, TypeError):
        threshold = 70.0

    try:
        task = process_documents_task.delay(documents, assignment_id, mahasiswa_id, filenames, threshold)
        return jsonify({
            "task_id": task.id,
            "status": task.state,
            "message": "Dokumen berhasil diunggah. Pemrosesan plagiarisme sedang berjalan di latar belakang."
        }), 202
    except Exception as e:
        return jsonify({
            "error": f"Gagal mengirimkan tugas ke antrean Celery/Redis: {str(e)}"
        }), 500


@submissions_bp.route('/upload-files', methods=['POST'])
@login_required
def upload_files():
    """
    Endpoint POST untuk menerima unggahan banyak berkas (multipart/form-data).
    Mendukung format berkas .pdf, .docx, .txt, dan .zip.
    Akan mengekstraksi isi teks berkas secara otomatis di backend dan
    memprosesnya secara asinkron lewat Celery.
    """
    # Validasi apakah berkas dikirimkan
    if 'files' not in request.files:
        return jsonify({
            "error": "Tidak ada berkas yang dikirimkan. Pastikan menggunakan key 'files'!"
        }), 400
        
    uploaded_files = request.files.getlist('files')
    
    if not uploaded_files or len(uploaded_files) == 0 or uploaded_files[0].filename == '':
        return jsonify({
            "error": "Tidak ada berkas terpilih untuk diunggah!"
        }), 400

    assignment_id = request.form.get('assignment_id')
    mahasiswa_id = g.user.id
    
    threshold_val = request.form.get('threshold', 70)
    try:
        threshold = float(threshold_val)
    except (ValueError, TypeError):
        threshold = 70.0

    documents_text = []
    documents_name = []

    try:
        # Melakukan iterasi dan parsing pada setiap file yang diunggah
        for file_storage in uploaded_files:
            parsed_docs = parse_file(file_storage)
            for doc in parsed_docs:
                documents_text.append(doc['text'])
                documents_name.append(doc['filename'])
                
        # Validasi jumlah dokumen minimal setelah ekstraksi (terutama jika dari zip)
        if len(documents_text) < 2:
            return jsonify({
                "error": f"Ditemukan {len(documents_text)} dokumen. Anda memerlukan minimal 2 dokumen untuk dibandingkan!"
            }), 400

        # Menjalankan tugas Celery asinkron menggunakan isi teks dokumen hasil ekstraksi beserta metadata database
        task = process_documents_task.delay(documents_text, assignment_id, mahasiswa_id, documents_name, threshold)
        
        return jsonify({
            "task_id": task.id,
            "status": task.state,
            "filenames": documents_name,
            "message": f"Berhasil mengekstrak {len(documents_text)} dokumen. Pemrosesan plagiarisme asinkron telah dimulai."
        }), 202

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({
            "error": f"Terjadi kesalahan saat mengekstrak berkas: {str(e)}"
        }), 500


@submissions_bp.route('/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """
    Endpoint GET untuk melakukan polling status penyelesaian tugas analisis plagiarisme.
    """
    task_result = AsyncResult(task_id)
    
    if task_result.state == 'PENDING':
        response = {
            "task_id": task_id,
            "status": task_result.state,
            "progress": {
                "current_step": 0,
                "total_steps": 4,
                "status_message": "Tugas sedang mengantre di server..."
            }
        }
    elif task_result.state == 'PROGRESS':
        response = {
            "task_id": task_id,
            "status": task_result.state,
            "progress": task_result.info
        }
    elif task_result.state == 'SUCCESS':
        response = {
            "task_id": task_id,
            "status": task_result.state,
            "progress": {
                "current_step": 4,
                "total_steps": 4,
                "status_message": "Analisis sukses diselesaikan!"
            },
            "result": task_result.result
        }
    elif task_result.state == 'FAILURE':
        response = {
            "task_id": task_id,
            "status": task_result.state,
            "progress": {
                "current_step": 0,
                "total_steps": 4,
                "status_message": "Terjadi kegagalan pemrosesan."
            },
            "error": str(task_result.info)
        }
    else:
        response = {
            "task_id": task_id,
            "status": task_result.state,
            "progress": {
                "status_message": "Tugas dalam transisi atau sedang diulang..."
            }
        }
        
    return jsonify(response), 200


@submissions_bp.route('/submit', methods=['POST'])
@login_required
def submit_assignment():
    """
    Endpoint POST /api/submissions/submit (Khusus Mahasiswa)
    Menerima unggahan berkas tugas tunggal, mengunggah file fisik ke Supabase Storage,
    dan menyimpan URL publik berkas beserta catatan metadata ke tabel submissions di Supabase.
    Jika sudah ada pengumpulan sebelumnya, berkas fisik lama di cloud dan catatan lama di DB akan dihapus.
    """
    if 'files' not in request.files:
        return jsonify({"error": "Tidak ada berkas yang dikirimkan. Gunakan key 'files'!"}), 400
        
    uploaded_files = request.files.getlist('files')
    if not uploaded_files or len(uploaded_files) == 0 or uploaded_files[0].filename == '':
        return jsonify({"error": "Tidak ada berkas terpilih untuk diunggah!"}), 400

    assignment_id = request.form.get('assignment_id')
    if not assignment_id:
        return jsonify({"error": "assignment_id wajib disertakan!"}), 400

    mahasiswa_id = g.user.id
    file_storage = uploaded_files[0] # Ambil berkas pertama saja (tunggal)

    try:
        supabase = get_supabase_client()
        
        # 1. Validasi role user adalah mahasiswa
        user_query = supabase.table('users').select('role').eq('id', mahasiswa_id).single().execute()
        if not user_query.data or user_query.data.get('role') != 'mahasiswa':
            return jsonify({"error": "Hanya mahasiswa yang diperbolehkan mengumpulkan tugas!"}), 403

        # 2. Baca bytes berkas dan lakukan parsing validasi format secara lokal
        file_bytes = file_storage.read()
        parsed_docs = parse_file_from_bytes(file_bytes, file_storage.filename)
        if not parsed_docs:
            return jsonify({"error": "Gagal mengekstrak teks dari berkas!"}), 400
            
        filename = parsed_docs[0]['filename']

        # 3. Cek & hapus submission lama jika sudah ada (overwrite) baik dari DB maupun Storage
        existing = supabase.table('submissions') \
            .select('id, file_url') \
            .eq('assignment_id', assignment_id) \
            .eq('mahasiswa_id', mahasiswa_id) \
            .execute()
            
        if existing.data:
            for old_sub in existing.data:
                old_url = old_sub.get('file_url', '')
                if "/tugas-mahasiswa/" in old_url:
                    parts = old_url.split("/tugas-mahasiswa/")
                    if len(parts) == 2:
                        old_storage_path = parts[1]
                        try:
                            # Hapus file fisik lama di Supabase Storage
                            supabase.storage.from_('tugas-mahasiswa').remove([old_storage_path])
                        except Exception as storage_err:
                            print(f"[Storage Warning] Gagal menghapus file lama {old_storage_path}: {str(storage_err)}")
                
                # Hapus baris database lama
                supabase.table('submissions').delete().eq('id', old_sub['id']).execute()

        # 4. Unggah berkas fisik baru ke Supabase Storage tugas-mahasiswa bucket
        storage_path = f"{assignment_id}/{mahasiswa_id}/{filename}"
        ext = filename.split('.')[-1].lower()
        content_type = "application/pdf" if ext == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == "docx" else "text/plain"

        supabase.storage.from_('tugas-mahasiswa').upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )

        # Dapatkan URL Publik file yang telah diunggah ke storage
        public_url = supabase.storage.from_('tugas-mahasiswa').get_public_url(storage_path)

        # 5. Simpan catatan metadata ke database submissions
        new_sub = {
            "assignment_id": assignment_id,
            "mahasiswa_id": mahasiswa_id,
            "file_url": public_url,
            "file_name": filename
        }
        
        insert_res = supabase.table('submissions').insert(new_sub).execute()
        if not insert_res.data:
            raise ValueError("Gagal menyimpan data pengumpulan tugas ke database.")

        return jsonify({
            "message": "Tugas berhasil dikumpulkan!",
            "submission": {
                "id": insert_res.data[0]['id'],
                "file_name": filename,
                "file_url": public_url,
                "submitted_at": insert_res.data[0]['submitted_at']
            }
        }), 201

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan saat mengumpulkan tugas: {str(e)}"}), 500


@submissions_bp.route('/assignment/<assignment_id>', methods=['GET'])
@login_required
def get_assignment_submissions(assignment_id):
    """
    Endpoint GET /api/submissions/assignment/<assignment_id>
    Mengembalikan seluruh berkas pengumpulan mahasiswa untuk sesi tugas tertentu.
    Bisa diakses oleh dosen untuk audit, atau mahasiswa untuk memverifikasi status pengumpulannya.
    """
    try:
        supabase = get_supabase_client()
        
        # Cari role user aktif
        user_query = supabase.table('users').select('role').eq('id', g.user.id).single().execute()
        role = user_query.data.get('role') if user_query.data else 'mahasiswa'

        if role == 'dosen':
            # Dosen: Dapatkan seluruh submissions untuk assignment ini joined dengan users (mahasiswa)
            query = supabase.table('submissions') \
                .select('id, file_name, submitted_at, mahasiswa_id, users(fullname, email)') \
                .eq('assignment_id', assignment_id) \
                .order('submitted_at', desc=True) \
                .execute()
            return jsonify({
                "role": "dosen",
                "submissions": query.data
            }), 200
        else:
            # Mahasiswa: Hanya dapatkan submission milik dirinya sendiri untuk assignment ini
            query = supabase.table('submissions') \
                .select('id, file_name, submitted_at') \
                .eq('assignment_id', assignment_id) \
                .eq('mahasiswa_id', g.user.id) \
                .execute()
            return jsonify({
                "role": "mahasiswa",
                "submissions": query.data
            }), 200

    except Exception as e:
        return jsonify({"error": f"Gagal mengambil data pengumpulan: {str(e)}"}), 500


@submissions_bp.route('/audit', methods=['POST'])
@login_required
@dosen_only
def run_plagiarism_audit():
    """
    Endpoint POST /api/submissions/audit (Khusus Dosen)
    Memicu proses analisis plagiarisme batch kelas secara asinkron.
    Mengambil seluruh file yang dikumpulkan mahasiswa pada sesi tugas tertentu dan
    membandingkannya berpasangan lewat Celery task baru 'audit_submissions_task'.
    """
    data = request.get_json()
    if not data or 'assignment_id' not in data:
        return jsonify({"error": "assignment_id wajib disertakan!"}), 400

    assignment_id = data.get('assignment_id')
    threshold_val = data.get('threshold', 70)
    try:
        threshold = float(threshold_val)
    except (ValueError, TypeError):
        threshold = 70.0

    try:
        supabase = get_supabase_client()
        
        # 1. Mengambil seluruh data submissions untuk assignment ini
        submissions_query = supabase.table('submissions') \
            .select('id, file_name, file_url, mahasiswa_id, users(fullname)') \
            .eq('assignment_id', assignment_id) \
            .execute()
            
        submissions_list = submissions_query.data or []
        
        if len(submissions_list) < 2:
            return jsonify({
                "error": f"Ditemukan {len(submissions_list)} pengumpulan tugas mahasiswa. Minimal harus ada 2 pengumpulan tugas untuk menjalankan audit plagiarisme!"
            }), 400

        # 2. Parsing text, student IDs, dan filenames untuk Celery
        documents = []
        filenames = []
        submission_ids = []
        
        for sub in submissions_list:
            file_url = sub['file_url']
            if file_url.startswith('text://'):
                text = file_url[7:]
            else:
                text = ""
                # Download berkas fisik secara dinamis dari Supabase Storage
                if "/tugas-mahasiswa/" in file_url:
                    parts = file_url.split("/tugas-mahasiswa/")
                    if len(parts) == 2:
                        storage_path = parts[1]
                        try:
                            file_bytes = supabase.storage.from_('tugas-mahasiswa').download(storage_path)
                            parsed_docs = parse_file_from_bytes(file_bytes, sub['file_name'])
                            if parsed_docs:
                                text = parsed_docs[0]['text']
                        except Exception as storage_err:
                            print(f"[Storage Error] Gagal mengunduh file {storage_path} dari cloud storage: {str(storage_err)}")
                            
            documents.append(text)
            
            student_name = sub['users']['fullname'] if (sub.get('users') and sub['users'].get('fullname')) else "Mahasiswa"
            filenames.append(f"{student_name} ({sub['file_name']})")
            
            submission_ids.append(sub['id'])

        # 3. Jalankan Celery Task Audit Asinkron
        task = audit_submissions_task.delay(
            submission_ids=submission_ids,
            documents=documents,
            filenames=filenames,
            assignment_id=assignment_id,
            threshold=threshold
        )
        
        return jsonify({
            "task_id": task.id,
            "status": task.state,
            "message": f"Audit plagiarisme batch untuk {len(submissions_list)} dokumen berhasil dimulai secara asinkron."
        }), 202

    except Exception as e:
        return jsonify({"error": f"Gagal menjalankan audit plagiarisme asinkron: {str(e)}"}), 500

