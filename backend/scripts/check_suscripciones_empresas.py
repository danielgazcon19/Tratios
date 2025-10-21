"""
Script para verificar la integridad de las relaciones entre suscripciones y empresas
"""
import sys
import os

# Añadir el directorio padre al path para poder importar los módulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.suscripcion import Suscripcion
from models.empresa import Empresa
from models.plan import Plan

def check_suscripciones():
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("VERIFICACIÓN DE SUSCRIPCIONES Y EMPRESAS")
        print("=" * 60)
        
        suscripciones = Suscripcion.query.all()
        
        print(f"\n📊 Total de suscripciones: {len(suscripciones)}\n")
        
        for suscripcion in suscripciones:
            print(f"\n--- Suscripción ID: {suscripcion.id} ---")
            print(f"  Empresa ID: {suscripcion.empresa_id}")
            print(f"  Plan ID: {suscripcion.plan_id}")
            print(f"  Estado: {suscripcion.estado}")
            print(f"  Forma Pago: {suscripcion.forma_pago}")
            print(f"  Creado Por: {suscripcion.creado_por}")
            
            # Verificar si existe la empresa
            empresa = Empresa.query.get(suscripcion.empresa_id)
            if empresa:
                print(f"  ✅ Empresa encontrada: {empresa.nombre} (NIT: {empresa.nit})")
            else:
                print(f"  ❌ ERROR: Empresa ID {suscripcion.empresa_id} NO EXISTE en la BD")
            
            # Verificar relación backref
            if suscripcion.empresa:
                print(f"  ✅ Backref 'empresa' funciona: {suscripcion.empresa.nombre}")
            else:
                print(f"  ❌ ERROR: Backref 'empresa' es None")
            
            # Verificar plan
            if suscripcion.plan:
                print(f"  ✅ Plan: {suscripcion.plan.nombre}")
            else:
                print(f"  ❌ ERROR: Plan es None")
        
        print("\n" + "=" * 60)
        print("RESUMEN DE EMPRESAS")
        print("=" * 60)
        
        empresas = Empresa.query.all()
        print(f"\n📊 Total de empresas: {len(empresas)}\n")
        
        for empresa in empresas:
            print(f"\nEmpresa ID {empresa.id}: {empresa.nombre}")
            print(f"  NIT: {empresa.nit}")
            print(f"  Estado: {'Activa' if empresa.estado else 'Inactiva'}")
            print(f"  Suscripciones: {len(empresa.suscripciones)}")
            for sus in empresa.suscripciones:
                print(f"    - Suscripción ID {sus.id} ({sus.estado})")

if __name__ == '__main__':
    check_suscripciones()
