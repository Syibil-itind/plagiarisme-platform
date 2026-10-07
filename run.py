import os
# Disable OpenMP multi-threading in Gunicorn fork worker mode to prevent C-level segfaults
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from dotenv import load_dotenv
# Memuat file .env pertama kali sebelum mengimpor modul aplikasi
load_dotenv()

from app import create_app

app = create_app()

if __name__ == '__main__':
    # Berjalan di port 5000 secara default
    app.run(host='0.0.0.0', port=5000)
