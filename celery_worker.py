from dotenv import load_dotenv
# Memuat file .env pertama kali sebelum mengimpor modul aplikasi
load_dotenv(override=True)

from app import create_app, celery_init_app

# Membuat instansi Flask app
app = create_app()
# Menginisialisasi Celery dengan mengaitkan konfigurasi aplikasi Flask
celery_app = celery_init_app(app)
