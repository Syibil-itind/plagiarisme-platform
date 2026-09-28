from supabase import create_client, Client
from flask import current_app, g

def get_supabase_client() -> Client:
    """
    Mengambil atau menginisialisasi instance Supabase Client ke dalam context Flask 'g'.
    Ini memastikan client hanya dibuat sekali per request context.
    Catatan: Client ini dapat terikat ke session pengguna jika dipanggil auth operations.
    """
    if 'supabase' not in g:
        url = current_app.config['SUPABASE_URL']
        key = current_app.config['SUPABASE_KEY']
        if not url or not key:
            raise ValueError("Kredensial Supabase tidak ditemukan di konfigurasi Flask!")
        g.supabase = create_client(url, key)
    return g.supabase


def get_supabase_admin_client() -> Client:
    """
    Mengambil atau menginisialisasi instance Supabase Admin Client yang bersih dan
    tidak terikat session pengguna untuk menjamin bypass RLS secara penuh.
    """
    if 'supabase_admin' not in g:
        url = current_app.config['SUPABASE_URL']
        key = current_app.config.get('SUPABASE_SERVICE_ROLE_KEY') or current_app.config['SUPABASE_KEY']
        if not url or not key:
            raise ValueError("Kredensial Supabase tidak ditemukan di konfigurasi Flask!")
        g.supabase_admin = create_client(url, key)
    return g.supabase_admin
