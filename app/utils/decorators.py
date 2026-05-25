from functools import wraps
from flask import request, jsonify, g
from app.db import get_supabase_client

def login_required(f):
    """
    Decorator untuk memproteksi route API.
    Memvalidasi token JWT Supabase dari header 'Authorization: Bearer <token>'
    dan menyimpan data user Supabase ke dalam Flask global context 'g.user'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Mengambil token dari header HTTP Authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                "error": "Token otentikasi tidak ditemukan. Harap masuk (login) terlebih dahulu!"
            }), 401
            
        try:
            # Mengurai skema format header "Bearer <token>"
            parts = auth_header.split(" ")
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                raise ValueError("Format header Authorization harus 'Bearer <token>'")
            token = parts[1]
        except Exception as e:
            return jsonify({
                "error": f"Format token tidak valid. Gunakan format 'Bearer <token>'. Detail: {str(e)}"
            }), 401

        try:
            # Meminta client Supabase untuk memvalidasi token JWT ke server Supabase Auth
            supabase = get_supabase_client()
            user_response = supabase.auth.get_user(token)
            
            # Menyimpan objek user Supabase ke global context Flask 'g' agar bisa dibaca di handler route
            g.user = user_response.user
            
        except Exception as e:
            # Menangani jika token kedaluwarsa, tidak cocok, atau dipalsukan
            return jsonify({
                "error": f"Sesi masuk Anda telah kedaluwarsa atau token tidak valid. Silakan login kembali! Detail: {str(e)}"
            }), 401
            
        return f(*args, **kwargs)
    return decorated


def dosen_only(f):
    """
    Decorator untuk memproteksi route khusus yang hanya boleh diakses oleh Dosen.
    Memeriksa data role pengguna dari tabel publik 'users' di Supabase.
    PENTING: Gunakan decorator ini SETELAH decorator @login_required.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Memastikan data pengguna g.user sudah diisi oleh @login_required
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({
                "error": "Akses ditolak. Hak otentikasi pengguna tidak ditemukan!"
            }), 401
            
        try:
            # Hubungi client Supabase untuk membaca tabel publik 'users'
            supabase = get_supabase_client()
            # Mencari baris data user berdasarkan UUID dari tabel users
            query = supabase.table('users').select('role').eq('id', g.user.id).single().execute()
            
            # Validasi jika user tidak ditemukan di database publik kita
            if not query.data:
                return jsonify({
                    "error": "Profil pengguna tidak ditemukan di database utama!"
                }), 404
                
            # Memeriksa apakah role pengguna adalah 'dosen'
            role = query.data.get('role')
            if role != 'dosen':
                return jsonify({
                    "error": "Akses ditolak! Menu/fitur ini hanya diperuntukkan bagi Dosen."
                }), 403
                
            # Menyimpan role pengguna ke global context Flask untuk kemudahan akses
            g.user_role = role
            
        except Exception as e:
            return jsonify({
                "error": f"Gagal melakukan verifikasi hak akses Dosen di database: {str(e)}"
            }), 500
            
        return f(*args, **kwargs)
    return decorated
