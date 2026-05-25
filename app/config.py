import os
from dotenv import load_dotenv

load_dotenv(override=True)
print("DEBUG CONFIG: Loaded SUPABASE_KEY prefix ->", os.getenv("SUPABASE_KEY")[:25] if os.getenv("SUPABASE_KEY") else "None")

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "True") == "True"
    
    # Konfigurasi Celery & Redis
    CELERY = dict(
        broker_url=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
        result_backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
        task_ignore_result=False,
    )

    @staticmethod
    def init_app(app):
        # Memastikan variabel lingkungan krusial terdefinisi
        if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
            app.logger.warning("Peringatan: SUPABASE_URL atau SUPABASE_KEY belum terkonfigurasi di file .env!")
