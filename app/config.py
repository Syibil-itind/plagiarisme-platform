import os
from dotenv import load_dotenv

load_dotenv(override=True)
print("DEBUG CONFIG: Loaded SUPABASE_KEY prefix ->", os.getenv("SUPABASE_KEY")[:25] if os.getenv("SUPABASE_KEY") else "None")

class Config:
    SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip().strip('"').strip("'")
    SUPABASE_KEY = (os.getenv("SUPABASE_KEY") or "").strip().strip('"').strip("'")
    SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"').strip("'")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "True") == "True"
    
    # Konfigurasi Celery & Redis (Mendukung Local In-Memory & Upstash Cloud Redis)
    _broker_url = os.getenv("CELERY_BROKER_URL", "memory://")
    _result_backend = os.getenv("CELERY_RESULT_BACKEND", "cache+memory://")
    
    # Celery membutuhkan parameter ssl_cert_reqs untuk skema rediss:// (SSL Upstash)
    if _broker_url.startswith("rediss://") and "ssl_cert_reqs" not in _broker_url:
        _broker_url += ("&" if "?" in _broker_url else "?") + "ssl_cert_reqs=none"
    if _result_backend.startswith("rediss://") and "ssl_cert_reqs" not in _result_backend:
        _result_backend += ("&" if "?" in _result_backend else "?") + "ssl_cert_reqs=none"

    _always_eager_env = os.getenv("CELERY_ALWAYS_EAGER")
    if _always_eager_env is not None:
        _is_eager = _always_eager_env.lower() in ("true", "1", "t")
    else:
        # Eager (sinkron) jika tidak pakai cloud Redis, dan Asinkron jika terdeteksi Upstash / rediss://
        _is_eager = not (_broker_url.startswith("rediss://") or "upstash.io" in _broker_url)

    CELERY = dict(
        broker_url=_broker_url,
        result_backend=_result_backend,
        task_ignore_result=False,
        task_always_eager=_is_eager,
        broker_use_ssl={'ssl_cert_reqs': None} if _broker_url.startswith("rediss://") else None,
        redis_backend_use_ssl={'ssl_cert_reqs': None} if _result_backend.startswith("rediss://") else None,
    )

    @staticmethod
    def init_app(app):
        # Memastikan variabel lingkungan krusial terdefinisi
        if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
            app.logger.warning("Peringatan: SUPABASE_URL atau SUPABASE_KEY belum terkonfigurasi di file .env!")
