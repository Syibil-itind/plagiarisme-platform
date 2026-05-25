from flask import Blueprint, request, jsonify, g, current_app
from app.db import get_supabase_client, get_supabase_admin_client
from app.utils.decorators import login_required

# Inisialisasi blueprint auth
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Endpoint POST untuk melakukan registrasi pengguna baru (Dosen / Mahasiswa).
    Mendaftarkan pengguna ke Supabase Auth, lalu menyinkronkan data kustom ke tabel publik 'users'.
    """
    data = request.get_json()
    
    # 1. Validasi input payload JSON
    if not data:
        return jsonify({"error": "Data JSON tidak ditemukan!"}), 400
        
    email = data.get('email')
    password = data.get('password')
    fullname = data.get('fullname')
    role = data.get('role') # 'dosen' atau 'mahasiswa'
    
    # Memastikan seluruh kolom wajib terisi
    if not all([email, password, fullname, role]):
        return jsonify({"error": "Harap lengkapi semua field: email, password, fullname, dan role!"}), 400
        
    # Validasi role kustom
    if role not in ['dosen', 'mahasiswa']:
        return jsonify({"error": "Role tidak valid! Harus berupa 'dosen' atau 'mahasiswa'."}), 400
        
    # Validasi keamanan panjang password
    if len(password) < 6:
        return jsonify({"error": "Password terlalu pendek! Minimal harus terdiri atas 6 karakter."}), 400
 
    try:
        supabase = get_supabase_client()
        
        # 2. Daftarkan akun baru ke layanan Supabase GoTrue Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        # Mengambil UUID user unik yang dihasilkan oleh Supabase Auth
        user_auth = auth_response.user
        if not user_auth:
            raise ValueError("Gagal mendapatkan objek user setelah sign up.")
            
        user_id = user_auth.id
 
        # 3. Sinkronisasikan metadata profil ke tabel publik 'users' di PostgreSQL
        user_profile = {
            "id": user_id,
            "email": email,
            "fullname": fullname,
            "role": role
        }
        
        # Eksekusi insert menggunakan client admin bersih terpisah untuk bypass RLS secara tepercaya
        admin_supabase = get_supabase_admin_client()
        admin_supabase.table('users').insert(user_profile).execute()
        
        return jsonify({
            "message": "Registrasi akun berhasil diselesaikan!",
            "user": {
                "id": user_id,
                "email": email,
                "fullname": fullname,
                "role": role
            }
        }), 201
        
    except Exception as e:
        # Menangani jika email sudah pernah terdaftar, atau masalah koneksi database
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "unique constraint" in error_msg.lower():
            return jsonify({"error": "Alamat email ini sudah terdaftar di sistem! Silakan gunakan email lain."}), 400
            
        return jsonify({"error": f"Gagal menyelesaikan registrasi: {error_msg}"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Endpoint POST untuk melakukan login masuk pengguna.
    Memverifikasi email & password lewat Supabase Auth dan mengembalikan JWT Token & Profil Pengguna.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Data JSON tidak ditemukan!"}), 400
        
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Harap isi email dan password Anda!"}), 400

    try:
        supabase = get_supabase_client()
        
        # 1. Autentikasi email dan password melalui Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        # Memastikan sesi login berhasil didapatkan
        session = auth_response.session
        user_auth = auth_response.user
        if not session or not user_auth:
            raise ValueError("Kredensial salah atau tidak valid.")
            
        access_token = session.access_token
        user_id = user_auth.id
        
        # 2. Ambil data profil lengkap & kustom dari tabel publik 'users' menggunakan admin client (bypassing RLS)
        admin_supabase = get_supabase_admin_client()
        profile_query = admin_supabase.table('users').select('fullname, role').eq('id', user_id).single().execute()
        
        if not profile_query.data:
            return jsonify({"error": "Profil pengguna belum tersinkronisasi di tabel utama."}), 404
            
        fullname = profile_query.data.get('fullname')
        role = profile_query.data.get('role')
        
        # 3. Kirim kembali respons sukses dengan token JWT
        return jsonify({
            "message": "Login berhasil! Selamat datang kembali.",
            "access_token": access_token,
            "user": {
                "id": user_id,
                "email": email,
                "fullname": fullname,
                "role": role
            }
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        # Menangani kemungkinan password salah atau email tidak ditemukan
        if "invalid login credentials" in error_msg.lower() or "bad credentials" in error_msg.lower():
            return jsonify({"error": "Email atau password yang Anda masukkan salah. Harap periksa kembali!"}), 401
            
        return jsonify({"error": f"Gagal memproses login: {error_msg}"}), 500


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user_profile():
    """
    Endpoint GET terproteksi (@login_required) untuk mendapatkan profil user aktif berdasarkan JWT token.
    """
    try:
        # Mengambil data menggunakan admin client tepercaya (bypassing RLS)
        admin_supabase = get_supabase_admin_client()
        profile_query = admin_supabase.table('users').select('fullname, role').eq('id', g.user.id).single().execute()
        
        if not profile_query.data:
            return jsonify({"error": "Profil data tidak ditemukan!"}), 404
            
        return jsonify({
            "user": {
                "id": g.user.id,
                "email": g.user.email,
                "fullname": profile_query.data.get('fullname'),
                "role": profile_query.data.get('role')
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Gagal mengambil profil aktif: {str(e)}"}), 500
