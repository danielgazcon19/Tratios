from database.db import db
from flask import Flask
from sqlalchemy import text
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://root:password@localhost/compraventa_saas')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE planes ADD COLUMN descripcion TEXT'))
            conn.commit()
        print("✅ Campo 'descripcion' agregado exitosamente a la tabla 'planes'")
    except Exception as e:
        if 'Duplicate column' in str(e) or '1060' in str(e):
            print("⚠️  El campo 'descripcion' ya existe en la tabla 'planes'")
        else:
            print(f"❌ Error: {e}")
