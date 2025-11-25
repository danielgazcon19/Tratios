from flask import Flask, request, send_from_directory
from database.db import db
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta
import os
from dotenv import load_dotenv
from utils.logger import Logger
from utils.location_service import init_location_service

# Cargar variables de entorno
load_dotenv()

migrate = Migrate()
jwt = JWTManager()

# Helper: crear la base de datos si no existe (MySQL)
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

def ensure_database_exists(db_uri: str):
    try:
        url = make_url(db_uri)
        backend = url.get_backend_name()
        if not url.database:
            return
        # Solo aplicar a MySQL
        if backend not in ("mysql", "mysql+pymysql", "mysql+mysqldb"):
            return
        db_name = url.database
        # Conexión al servidor sin especificar base de datos
        server_url = url.set(database=None)
        engine = create_engine(server_url)
        with engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
    except Exception as e:
        # No interrumpir la aplicación si falla; se puede revisar el log
        print(f"[WARN] No se pudo verificar/crear la base de datos: {e}")


def create_app():
    Logger.add_to_log("info", "Iniciando la aplicación")
    app = Flask(__name__)
    
    # Configuración
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Construir URL de DB: priorizar DATABASE_URL; si no existe, usar DB_* del .env
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        db_host = os.environ.get('DB_HOST')
        db_port = os.environ.get('DB_PORT', '3306')
        db_name = os.environ.get('DB_NAME')
        db_user = os.environ.get('DB_USER')
        db_password = os.environ.get('DB_PASSWORD', '')
        if db_host and db_name and db_user:
            db_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

    app.config['SQLALCHEMY_DATABASE_URI'] = db_url or 'mysql+pymysql://root:password@localhost/compraventa_saas'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=int(os.environ.get('JWT_ACCESS_MINUTES', 30)))
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=int(os.environ.get('JWT_REFRESH_DAYS', 7)))
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_TYPE'] = os.environ.get('JWT_HEADER_TYPE', 'Bearer')
    app.config['GEO_DB_API_KEY'] = os.environ.get('GEO_DB_API_KEY')
    app.config['GEO_DB_API_HOST'] = os.environ.get('GEO_DB_API_HOST', 'wft-geo-db.p.rapidapi.com')
    app.config['GEO_DB_COUNTRY_LIMIT'] = int(os.environ.get('GEO_DB_COUNTRY_LIMIT', 200))
    app.config['GEO_DB_CITY_LIMIT'] = int(os.environ.get('GEO_DB_CITY_LIMIT', 100))
    app.config['GEO_DB_MIN_COUNTRY_LIMIT'] = int(os.environ.get('GEO_DB_MIN_COUNTRY_LIMIT', 10))
    app.config['GEO_DB_MIN_CITY_LIMIT'] = int(os.environ.get('GEO_DB_MIN_CITY_LIMIT', 10))
    app.config['LOCATION_CACHE_TTL_COUNTRIES'] = int(os.environ.get('LOCATION_CACHE_TTL_COUNTRIES', 60 * 60 * 12))
    app.config['LOCATION_CACHE_TTL_CITIES'] = int(os.environ.get('LOCATION_CACHE_TTL_CITIES', 60 * 60 * 4))
    app.config['LOCATION_RATE_LIMIT_REQUESTS'] = int(os.environ.get('LOCATION_RATE_LIMIT_REQUESTS', 45))
    app.config['LOCATION_RATE_LIMIT_WINDOW'] = int(os.environ.get('LOCATION_RATE_LIMIT_WINDOW', 60))
    app.config['LOCATION_DB_PATH'] = os.environ.get('LOCATION_DB_PATH', os.path.join(os.path.dirname(__file__), 'data', 'countries.db'))
    app.config['LOCATION_CITIES_ARCHIVE_PATH'] = os.environ.get('LOCATION_CITIES_ARCHIVE_PATH', os.path.join(os.path.dirname(__file__), 'data', 'cities.sqlite3.gz'))
    
    # Configuración de seguridad para API SaaS
    app.config['SAAS_API_KEY'] = os.environ.get('SAAS_API_KEY')
    
    # Asegurar que la base de datos exista antes de inicializar ORM
    ensure_database_exists(app.config['SQLALCHEMY_DATABASE_URI'])
    
    # Inicializar extensiones con la app
    db.init_app(app)
    migrate.init_app(app, db, compare_type=True, compare_server_default=True)
    jwt.init_app(app)
    # Configurar CORS por entorno
    cors_origins_env = os.environ.get('FRONTEND_ORIGINS')
    if cors_origins_env:
        origins = [o.strip() for o in cors_origins_env.split(',') if o.strip()]
    else:
        origins = [
            'http://localhost:4200',
            'http://127.0.0.1:4200',
            'http://localhost:4201',
            'http://127.0.0.1:4201'
        ]
    CORS(app, origins=origins)  # Permitir Angular frontend
    
    # Registrar blueprints
    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.public import public_bp
    from routes.api import api_bp
    from routes.account import account_bp
    from routes.admin_empresas import admin_empresas_bp
    from routes.admin_suscripciones import admin_suscripciones_bp
    from routes.admin_planes import admin_planes_bp
    from routes.admin_servicios import admin_servicios_bp
    from routes.admin_plan_servicios import admin_plan_servicios_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(public_bp, url_prefix='/public')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(account_bp, url_prefix='/account')
    app.register_blueprint(admin_empresas_bp, url_prefix='/admin')
    app.register_blueprint(admin_suscripciones_bp, url_prefix='/admin')
    app.register_blueprint(admin_planes_bp, url_prefix='/admin')
    app.register_blueprint(admin_servicios_bp, url_prefix='/admin')
    app.register_blueprint(admin_plan_servicios_bp, url_prefix='/admin')

    init_location_service(app)
    
    # Importar modelos para que SQLAlchemy los reconozca
    from models import usuario, empresa, servicio, suscripcion, log_acceso

    # Servir Angular SPA (solo en producción o si existe el build)
    angular_dist_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist', 'frontend', 'browser')
    
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_angular(path):
        # Solo para rutas que no son de API
        if path.startswith('api/') or path.startswith('auth/') or \
           path.startswith('admin/') or path.startswith('account/') or \
           path.startswith('public/'):
            # Dejar que Flask maneje las rutas de API (devuelve 404 si no existe)
            return {"message": "Recurso no encontrado"}, 404
        
        # Verificar si existe el build de Angular
        if os.path.exists(angular_dist_path):
            # Si es un archivo estático (con extensión), servirlo
            if path and '.' in path.split('/')[-1]:
                file_path = os.path.join(angular_dist_path, path)
                if os.path.exists(file_path):
                    return send_from_directory(angular_dist_path, path)
            
            # Para rutas sin extensión (rutas de Angular), servir index.html
            return send_from_directory(angular_dist_path, 'index.html')
        else:
            # En desarrollo, indicar que se debe usar el servidor de Angular
            return {
                "message": "Aplicación en modo desarrollo",
                "info": "Accede a través del servidor de Angular en http://localhost:4200",
                "nota": "Las rutas de Angular deben accederse desde localhost:4200, no desde localhost:5222"
            }, 200

    # Manejadores de error globales
    @app.errorhandler(404)
    def handle_404(e):
        # Si la ruta es una API, devolver JSON
        if request.path.startswith('/api') or \
           request.path.startswith('/auth') or \
           request.path.startswith('/admin') or \
           request.path.startswith('/account') or \
           request.path.startswith('/public'):
            return {"message": "Recurso no encontrado"}, 404
        
        # Para otras rutas, verificar si existe el build de Angular
        if os.path.exists(angular_dist_path):
            return send_from_directory(angular_dist_path, 'index.html')
        
        # En desarrollo sin build
        return {
            "message": "Aplicación en modo desarrollo",
            "info": "Accede a través del servidor de Angular en http://localhost:4200"
        }, 404

    @app.errorhandler(400)
    def handle_400(e):
        return {"message": "Solicitud inválida"}, 400

    @app.errorhandler(500)
    def handle_500(e):
        Logger.add_to_log("error", f"Error interno del servidor: {e}")
        return {"message": "Error interno del servidor"}, 500

    # Comando CLI para cargar datos semilla
    @app.cli.command("seed")
    def seed_data():
        """Cargar datos iniciales de forma idempotente."""
        from models.servicio import Servicio
        from models.usuario import Usuario
        from models.empresa import Empresa
        from models.suscripcion import Suscripcion
        from datetime import date

        created = {"servicios": 0, "usuarios": 0, "empresas": 0, "suscripciones": 0}

        # Semilla de servicios principales
        servicios_seed = [
            {
                "nombre": "OroSoft Compraventa",
                "descripcion": "Plataforma SaaS para gestión de compraventa con facturación y reportes",
                "activo": True,
                "url_api": "https://api.orosoft.local/compraventa"
            },
            {
                "nombre": "Integración de Pagos",
                "descripcion": "Conectores para pasarelas de pago (mock)",
                "activo": True,
                "url_api": "https://api.orosoft.local/pagos"
            },
        ]
        for s in servicios_seed:
            if not Servicio.query.filter_by(nombre=s["nombre"]).first():
                db.session.add(Servicio(**s))
                created["servicios"] += 1

        # Admin opcional vía variables de entorno
        admin_email = os.environ.get("ADMIN_EMAIL")
        admin_password = os.environ.get("ADMIN_PASSWORD")
        if admin_email and admin_password:
            if not Usuario.query.filter_by(email=admin_email).first():
                admin = Usuario(nombre="Administrador", email=admin_email, rol="admin")
                admin.set_password(admin_password)
                db.session.add(admin)
                created["usuarios"] += 1

        # Empresa demo opcional
        demo_empresa_nombre = os.environ.get("DEMO_EMPRESA_NOMBRE", "Empresa Demo")
        demo_empresa_nit = os.environ.get("DEMO_EMPRESA_NIT", "900000001")
        empresa_demo = Empresa.query.filter_by(nit=demo_empresa_nit).first()
        if not empresa_demo:
            empresa_demo = Empresa(
                nombre=demo_empresa_nombre,
                contacto=os.environ.get("DEMO_EMPRESA_CONTACTO", "demo@empresa.com"),
                nit=demo_empresa_nit,
                plan="basico",
                estado=True
            )
            db.session.add(empresa_demo)
            created["empresas"] += 1

        # Suscripción demo a OroSoft Compraventa
        servicio_core = Servicio.query.filter_by(nombre="OroSoft Compraventa").first()
        if servicio_core and empresa_demo:
            existe_sub = Suscripcion.query.filter_by(empresa_id=empresa_demo.id, servicio_id=servicio_core.id).first()
            if not existe_sub:
                db.session.add(Suscripcion(
                    empresa_id=empresa_demo.id,
                    servicio_id=servicio_core.id,
                    fecha_inicio=date.today(),
                    estado="activa",
                    forma_pago="manual"
                ))
                created["suscripciones"] += 1

        db.session.commit()
        print(f"Seed completo -> Servicios: {created['servicios']}, Empresas: {created['empresas']}, Usuarios: {created['usuarios']}, Suscripciones: {created['suscripciones']}")
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5222)