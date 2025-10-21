"""
Script temporal para verificar el estado de la tabla suscripciones
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database.db import db

app = create_app()

with app.app_context():
    # Ver estructura de la tabla
    result = db.session.execute(db.text("SHOW COLUMNS FROM suscripciones"))
    columns = [row[0] for row in result]
    
    print("=== Columnas actuales en suscripciones ===")
    for col in columns:
        print(f"  - {col}")
    
    # Verificar si plan_id existe
    if 'plan_id' in columns:
        print("\n⚠️  WARNING: plan_id ya existe!")
        print("    La migración se ejecutó parcialmente.")
        print("    Opciones:")
        print("    1. Eliminar plan_id manualmente y volver a ejecutar")
        print("    2. Marcar la migración como aplicada con: flask db stamp e8f4a2c1d9b3")
    
    # Verificar si servicio_id existe
    if 'servicio_id' in columns:
        print("\n✅ servicio_id todavía existe (bien)")
    else:
        print("\n⚠️  servicio_id ya fue eliminado")
    
    # Ver constraints
    print("\n=== Constraints e Índices ===")
    result = db.session.execute(db.text("SHOW INDEX FROM suscripciones"))
    for row in result:
        print(f"  - {row[2]} (column: {row[4]})")
