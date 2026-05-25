from dotenv import load_dotenv
# Memuat file .env pertama kali sebelum mengimpor modul aplikasi
load_dotenv()

from app import create_app

app = create_app()

if __name__ == '__main__':
    # Berjalan di port 5000 secara default
    app.run(host='0.0.0.0', port=5000)
