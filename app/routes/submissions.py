from flask import Blueprint, request, jsonify, g
from app.tasks import process_documents_task
from app.utils.file_parser import parse_file
from app.utils.decorators import login_required
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
