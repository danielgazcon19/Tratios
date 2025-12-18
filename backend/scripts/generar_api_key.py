"""
Script para generar API Keys para empresas desde la línea de comandos

Uso:
    python scripts/generar_api_key.py <empresa_id> <nombre> [dias_expiracion]

Ejemplos:
    python scripts/generar_api_key.py 1 "Producción Principal"
    python scripts/generar_api_key.py 2 "Desarrollo" 365
"""
import sys
import os

# Añadir directorio padre al path para importar módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from database.db import db
from models.api_key import ApiKey
from models.empresa import Empresa
from utils.api_key_crypto import generar_api_key_con_hash
from datetime import datetime, timedelta


def main():
    if len(sys.argv) < 3:
        print("Uso: python scripts/generar_api_key.py <empresa_id> <nombre> [dias_expiracion]")
        print("\nEjemplos:")
        print('  python scripts/generar_api_key.py 1 "Producción Principal"')
        print('  python scripts/generar_api_key.py 2 "Desarrollo" 365')
        sys.exit(1)
    
    empresa_id = int(sys.argv[1])
    nombre = sys.argv[2]
    dias_expiracion = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    app = create_app()
    
    with app.app_context():
        # Validar que la empresa existe
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            print(f"❌ Error: Empresa con ID {empresa_id} no encontrada")
            sys.exit(1)
        
        print(f"\n🏢 Generando API Key para: {empresa.nombre} (NIT: {empresa.nit})")
        print(f"📝 Nombre: {nombre}")
        
        # Generar API key
        api_key_plana, api_key_hash = generar_api_key_con_hash()
        
        # Calcular expiración
        fecha_expiracion = None
        if dias_expiracion and dias_expiracion > 0:
            fecha_expiracion = datetime.utcnow() + timedelta(days=dias_expiracion)
            print(f"⏰ Expira: {fecha_expiracion.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        else:
            print("⏰ Sin expiración")
        
        # Crear registro
        nueva_api_key = ApiKey(
            empresa_id=empresa_id,
            api_key_hash=api_key_hash,
            nombre=nombre,
            activo=True,
            fecha_expiracion=fecha_expiracion
        )
        
        db.session.add(nueva_api_key)
        db.session.commit()
        
        print("\n" + "="*80)
        print("✅ API KEY GENERADA EXITOSAMENTE")
        print("="*80)
        print(f"\n🔑 API Key (guárdela en un lugar seguro):")
        print(f"\n    {api_key_plana}")
        print(f"\n📋 ID en base de datos: {nueva_api_key.id}")
        print(f"🏢 Empresa ID: {empresa_id}")
        print(f"🏢 Empresa: {empresa.nombre}")
        print(f"📅 Creada: {nueva_api_key.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        
        if fecha_expiracion:
            print(f"⏰ Expira: {fecha_expiracion.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        
        print("\n" + "="*80)
        print("⚠️  IMPORTANTE:")
        print("   - Esta clave NO se podrá recuperar después.")
        print("   - Guárdela en un gestor de secretos (AWS Secrets, Azure Key Vault, .env, etc.)")
        print("   - Use los headers X-API-Key y X-Empresa-Id en las llamadas a la API")
        print("="*80 + "\n")
        
        # Mostrar ejemplo de uso
        print("📡 Ejemplo de uso con curl:")
        print(f'''
curl -X GET "http://localhost:5222/api/suscripcion-activa/{empresa.nit}" \\
  -H "X-API-Key: {api_key_plana}" \\
  -H "X-Empresa-Id: {empresa_id}"
''')
        
        print("\n" + "="*80 + "\n")


if __name__ == '__main__':
    main()
