"""
Script para eliminar la constraint única incorrecta en usuarios.empresa_id
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import db
from flask import Flask
import os

# Crear la aplicación Flask
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or \
    'mysql+pymysql://root:password@localhost/compraventa_saas'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    try:
        # Intentar eliminar la constraint
        db.session.execute(db.text('ALTER TABLE usuarios DROP INDEX uq_usuarios_empresa_id'))
        db.session.commit()
        print("✅ Constraint 'uq_usuarios_empresa_id' eliminada exitosamente")
    except Exception as e:
        if '1091' in str(e):  # Error code para "Can't DROP index; check that column/key exists"
            print("⚠️  La constraint ya no existe o fue eliminada anteriormente")
        else:
            print(f"❌ Error al eliminar constraint: {e}")
            db.session.rollback()
