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
    
    # Mengaktifkan CORS untuk seluruh endpoint aplikasi agar bisa di-hit dari port 5173
    CORS(app)
    
    config_class.init_app(app)

    # Menambahkan error handler dasar
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource tidak ditemukan"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Terjadi kesalahan internal server"}), 500

    # Endpoint Health-Check
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "message": "Plagiarism Detection API is running"}), 200

    # Register Blueprints
    from app.routes.submissions import submissions_bp
    from app.routes.auth import auth_bp
    from app.routes.classes import classes_bp
    
    app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(classes_bp, url_prefix='/api/classes')

    return app
