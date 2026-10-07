import random
import string
from flask import Blueprint, request, jsonify, g
from app.db import get_supabase_client
from app.utils.decorators import login_required, dosen_only

# Inisialisasi blueprint classes
classes_bp = Blueprint('classes', __name__)

def generate_class_code(length=6) -> str:
    """
    Fungsi helper untuk menghasilkan kode unik kelas (misal: 'TR91A5').
    """
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(length))


@classes_bp.route('', methods=['POST', 'OPTIONS'])
@login_required
@dosen_only
def create_class():
    """
    Endpoint POST /api/classes (Khusus Dosen)
    Membuat kelas baru, menghasilkan kode unik kelas, dan menyimpannya ke database.
    """
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"error": "Nama kelas wajib diisi!"}), 400
        
    name = data.get('name')
    description = data.get('description', '')

    try:
        supabase = get_supabase_client()
        
        # Menghasilkan kode kelas unik dan memastikan tidak duplikat
        code_unique = False
        class_code = ""
        while not code_unique:
            class_code = generate_class_code()
            # Periksa apakah kode kelas sudah terdaftar di db
            query = supabase.table('classes').select('id').eq('code', class_code).execute()
            if not query.data:
                code_unique = True
                
        # Menyimpan data kelas baru ke tabel classes
        new_class = {
            "name": name,
            "description": description,
            "code": class_code,
            "dosen_id": g.user.id # Diambil dari global context @login_required
        }
        
        insert_response = supabase.table('classes').insert(new_class).execute()
        
        if not insert_response.data:
            raise ValueError("Gagal menyimpan data kelas ke database.")
            
        return jsonify({
            "message": "Kelas baru berhasil dibuat!",
            "class": insert_response.data[0]
        }), 210
        
    except Exception as e:
        return jsonify({"error": f"Gagal membuat kelas: {str(e)}"}), 500


@classes_bp.route('/join', methods=['POST', 'OPTIONS'])
@login_required
def join_class():
    """
    Endpoint POST /api/classes/join (Khusus Mahasiswa)
    Mahasiswa bergabung ke dalam kelas menggunakan kode unik kelas yang dibagikan Dosen.
    """
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({"error": "Kode kelas wajib diisi!"}), 400
        
    class_code = data.get('code').strip().upper()

    try:
        supabase = get_supabase_client()
        
        # 1. Validasi apakah user adalah mahasiswa
        user_query = supabase.table('users').select('role').eq('id', g.user.id).single().execute()
        if not user_query.data or user_query.data.get('role') != 'mahasiswa':
            return jsonify({"error": "Hanya mahasiswa yang dapat bergabung ke dalam kelas!"}), 403

        # 2. Cari kelas berdasarkan kode kelas unik
        class_query = supabase.table('classes').select('id, name').eq('code', class_code).execute()
        if not class_query.data:
            return jsonify({"error": "Kelas tidak ditemukan. Harap periksa kembali kode kelas Anda!"}), 404
            
        class_id = class_query.data[0]['id']
        class_name = class_query.data[0]['name']

        # 3. Periksa apakah mahasiswa sudah terdaftar di kelas ini sebelumnya
        enroll_query = supabase.table('class_enrollments') \
            .select('class_id') \
            .eq('class_id', class_id) \
            .eq('mahasiswa_id', g.user.id) \
            .execute()
            
        if enroll_query.data:
            return jsonify({"error": f"Anda sudah terdaftar di dalam kelas '{class_name}' sebelumnya!"}), 400

        # 4. Masukkan relasi many-to-many ke tabel class_enrollments
        new_enrollment = {
            "class_id": class_id,
            "mahasiswa_id": g.user.id
        }
        supabase.table('class_enrollments').insert(new_enrollment).execute()
        
        return jsonify({
            "message": f"Berhasil bergabung ke dalam kelas '{class_name}'!",
            "class_id": class_id,
            "class_name": class_name
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Gagal bergabung ke kelas: {str(e)}"}), 500


@classes_bp.route('', methods=['GET', 'OPTIONS'])
@login_required
def get_user_classes():
    """
    Endpoint GET /api/classes
    Mengembalikan daftar kelas kustom berdasarkan role user aktif.
    - Dosen: Mengembalikan semua kelas yang mereka ampu/buat.
    - Mahasiswa: Mengembalikan kelas-kelas yang mereka ikuti.
    """
    try:
        supabase = get_supabase_client()
        
        # 1. Cari data role user aktif
        user_query = supabase.table('users').select('role').eq('id', g.user.id).single().execute()
        if not user_query.data:
            return jsonify({"error": "Profil pengguna tidak ditemukan!"}), 404
            
        role = user_query.data.get('role')

        if role == 'dosen':
            # Dosen: Dapatkan kelas berdasarkan dosen_id
            classes_query = supabase.table('classes').select('*').eq('dosen_id', g.user.id).order('created_at', desc=True).execute()
            return jsonify({
                "role": "dosen",
                "classes": classes_query.data
            }), 200
        else:
            # Mahasiswa: Dapatkan kelas melalui tabel relasi class_enrollments
            # Supabase secara cerdas melakukan join jika relasi kunci asing disetel dengan benar
            enroll_query = supabase.table('class_enrollments') \
                .select('classes(*)') \
                .eq('mahasiswa_id', g.user.id) \
                .execute()
                
            # Mengekstrak daftar data kelas dari hasil query join
            classes = [item['classes'] for item in enroll_query.data if item.get('classes')]
            
            return jsonify({
                "role": "mahasiswa",
                "classes": classes
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"Gagal mengambil daftar kelas: {str(e)}"}), 500


@classes_bp.route('/<class_id>/assignments', methods=['POST', 'OPTIONS'])
@login_required
@dosen_only
def create_assignment(class_id):
    """
    Endpoint POST /api/classes/<class_id>/assignments (Khusus Dosen)
    Dosen membuat sesi pengumpulan tugas baru di dalam kelas mereka.
    """
    data = request.get_json()
    if not data or 'title' not in data or 'due_date' not in data:
        return jsonify({"error": "Judul tugas (title) dan tenggat waktu (due_date) wajib diisi!"}), 400
        
    title = data.get('title')
    description = data.get('description', '')
    due_date = data.get('due_date') # Format ISO string: '2026-06-01T23:59:59Z'

    try:
        supabase = get_supabase_client()
        
        # 1. Validasi apakah dosen yang membuat tugas adalah pemilik kelas tersebut
        class_query = supabase.table('classes').select('dosen_id').eq('id', class_id).single().execute()
        if not class_query.data:
            return jsonify({"error": "Kelas tidak ditemukan!"}), 404
            
        if class_query.data.get('dosen_id') != g.user.id:
            return jsonify({"error": "Akses ditolak! Anda bukan pemilik pengampu kelas ini."}), 403

        # 2. Simpan tugas baru ke tabel assignments
        new_assignment = {
            "class_id": class_id,
            "title": title,
            "description": description,
            "due_date": due_date
        }
        
        insert_response = supabase.table('assignments').insert(new_assignment).execute()
        
        if not insert_response.data:
            raise ValueError("Gagal menyimpan data tugas ke database.")
            
        return jsonify({
            "message": "Sesi tugas baru berhasil dibuat!",
            "assignment": insert_response.data[0]
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Gagal membuat tugas: {str(e)}"}), 500


@classes_bp.route('/<class_id>/assignments', methods=['GET', 'OPTIONS'])
@login_required
def get_class_assignments(class_id):
    """
    Endpoint GET /api/classes/<class_id>/assignments
    Mengembalikan seluruh daftar sesi tugas di dalam kelas tertentu.
    """
    try:
        supabase = get_supabase_client()
        
        # Ambil daftar tugas diurutkan berdasarkan tanggal dibuat terbaru
        assignments_query = supabase.table('assignments') \
            .select('*') \
            .eq('class_id', class_id) \
            .order('created_at', desc=True) \
            .execute()
            
        return jsonify({
            "class_id": class_id,
            "assignments": assignments_query.data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Gagal mengambil daftar tugas: {str(e)}"}), 500
