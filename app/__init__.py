from flask import Flask, jsonify
from celery import Celery, Task
from app.config import Config

def celery_init_app(app: Flask) -> Celery:
    class FlaskTask(Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object(app.config["CELERY"])
    celery_app.set_default()
    app.extensions["celery"] = celery_app
    return celery_app

from flask_cors import CORS

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Mengaktifkan CORS secara penuh untuk seluruh origin, methods, dan headers (Vercel & Localhost)
    CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})
    
    config_class.init_app(app)
    celery_init_app(app)

    # Menambahkan error handler dasar
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource tidak ditemukan"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Terjadi kesalahan internal server"}), 500

    # Root & Health-Check Endpoint
    @app.route('/', methods=['GET'])
    def index():
        db_status = "Disconnected"
        try:
            from app.db import get_supabase_client
            supabase = get_supabase_client()
            res = supabase.table('users').select('id').limit(1).execute()
            db_status = "Connected"
        except Exception as e:
            db_status = f"Error: {str(e)}"

        return jsonify({
            "status": "online",
            "message": "Selamat datang di API Plagiarisme Platform",
            "supabase_status": db_status,
            "supabase_url": app.config.get("SUPABASE_URL"),
            "endpoints": {
                "health": "/health",
                "auth": "/api/auth",
                "classes": "/api/classes",
                "submissions": "/api/submissions"
            }
        }), 200

    @app.route('/health', methods=['GET'])
    def health_check():
        db_status = "Disconnected"
        try:
            from app.db import get_supabase_client
            supabase = get_supabase_client()
            res = supabase.table('users').select('id').limit(1).execute()
            db_status = "Connected"
        except Exception as e:
            db_status = f"Error: {str(e)}"

        return jsonify({
            "status": "healthy",
            "database": db_status,
            "message": "Plagiarism Detection API is running"
        }), 200

    # Register Blueprints
    from app.routes.submissions import submissions_bp
    from app.routes.auth import auth_bp
    from app.routes.classes import classes_bp
    
    app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(classes_bp, url_prefix='/api/classes')

    return app
