"""
Script para crear un usuario administrador
Ejecutar: python scripts/create_admin.py
"""
import sys
import os

# Agregar el directorio backend al path para poder importar los módulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.usuario import Usuario
from models.empresa import Empresa
from database.db import db
from app import create_app

def create_admin():
    """Crea un usuario administrador de prueba"""
    
    app = create_app()
    
    with app.app_context():
        # Verificar si ya existe un admin con este email
        email = 'admin@tratios.com'
        existing_admin = Usuario.query.filter_by(email=email).first()
        
        if existing_admin:
            print(f"❌ Ya existe un usuario con el email {email}")
            print(f"   ID: {existing_admin.id}")
            print(f"   Nombre: {existing_admin.nombre}")
            print(f"   Rol: {existing_admin.rol}")
            return
        
        # Crear empresa para el admin (opcional, puede ser None)
        empresa_admin = Empresa.query.filter_by(nombre='tratios Admin').first()
        if not empresa_admin:
            empresa_admin = Empresa(
                nombre='tratios Admin',
                nit='000000000-0',
                contacto='admin@tratios.com',
                plan='empresarial',  # Plan para la empresa admin
                estado=True
            )
            db.session.add(empresa_admin)
            db.session.commit()
            print(f"✅ Empresa admin creada: {empresa_admin.nombre}")
        
        # Crear usuario admin
        admin = Usuario(
            nombre='Administrador',
            email=email,
            rol='admin',
            empresa_id=empresa_admin.id if empresa_admin else None
        )
        
        # Establecer contraseña
        password = 'Admin123!'
        admin.set_password(password)
        
        db.session.add(admin)
        db.session.commit()
        
        print("\n" + "="*60)
        print("✅ USUARIO ADMINISTRADOR CREADO EXITOSAMENTE")
        print("="*60)
        print(f"📧 Email:    {admin.email}")
        print(f"🔑 Password: {password}")
        print(f"👤 Nombre:   {admin.nombre}")
        print(f"🎭 Rol:      {admin.rol}")
        print(f"🏢 Empresa:  {empresa_admin.nombre if empresa_admin else 'N/A'}")
        print("="*60)
        print("\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login")
        print()

if __name__ == '__main__':
    create_admin()
