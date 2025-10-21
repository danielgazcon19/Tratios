import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db
from models.usuario import Usuario

app = create_app()

with app.app_context():
    admin = Usuario.query.filter_by(email='admin@tratios.com').first()
    
    if admin:
        print(f"✅ Admin encontrado")
        print(f"  Email: {admin.email}")
        print(f"  Rol: {admin.rol}")
        print(f"  Activo: {admin.activo}")
        print(f"  ID: {admin.id}")
    else:
        print("❌ Usuario admin NO existe")
        print("Ejecuta: python scripts/create_admin.py")
