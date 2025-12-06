"""
Script de Renovación Automática
================================
Este script debe ejecutarse diariamente mediante crontab (Linux) o Task Scheduler (Windows).

Funciones:
1. Revisa todas las suscripciones de plan que:
   - Tienen renovacion_automatica = True
   - Han llegado a su fecha_fin o están por vencer
   
2. Revisa todas las suscripciones de soporte que:
   - Tienen renovacion_automatica = True  
   - Han llegado a su fecha_fin o están por vencer

3. Para cada suscripción elegible:
   - Si tiene renovacion_automatica=True: Crea una nueva suscripción activa
   - Si renovacion_automatica=False: Marca como inactiva

Uso:
    python renovacion_automatica.py [--dry-run] [--dias-anticipacion N]
    
Opciones:
    --dry-run               Simula la ejecución sin hacer cambios
    --dias-anticipacion N   Renovar N días antes del vencimiento (default: 0)

Crontab (ejecutar todos los días a las 2 AM):
    0 2 * * * cd /ruta/backend && /ruta/env_web/bin/python scripts/renovacion_automatica.py

Task Scheduler Windows (ejecutar todos los días a las 2 AM):
    Acción: python.exe
    Argumentos: D:\Software\Pagina\backend\scripts\renovacion_automatica.py
    Directorio: D:\Software\Pagina\backend
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal
import argparse

# Agregar el directorio backend al path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database.db import db
from models import Suscripcion, SoporteSuscripcion, Plan, SoporteTipo
from utils.log import AppLogger, LogCategory

# Inicializar Flask app para acceso a DB
from flask import Flask
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'mysql+pymysql://root@localhost/web_compraventa')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


def renovar_suscripcion_plan(suscripcion: Suscripcion, dry_run: bool = False) -> dict:
    """
    Renueva automáticamente una suscripción de plan.
    
    Args:
        suscripcion: Suscripción a renovar
        dry_run: Si es True, solo simula sin hacer cambios
        
    Returns:
        dict con resultado de la operación
    """
    resultado = {
        'tipo': 'plan',
        'suscripcion_id': suscripcion.id,
        'empresa_id': suscripcion.empresa_id,
        'empresa_nombre': suscripcion.empresa.nombre_comercial if suscripcion.empresa else 'N/A',
        'plan_nombre': suscripcion.plan.nombre if suscripcion.plan else 'N/A',
        'accion': None,
        'nueva_suscripcion_id': None,
        'error': None
    }
    
    try:
        # Calcular fechas para la renovación
        fecha_inicio = suscripcion.fecha_fin or datetime.utcnow().date()
        
        if suscripcion.periodo == 'mensual':
            fecha_fin = fecha_inicio + timedelta(days=30)
            precio_pagado = suscripcion.plan.precio_mensual
        else:  # anual
            fecha_fin = fecha_inicio + timedelta(days=365)
            precio_pagado = suscripcion.plan.precio_anual
        
        if not dry_run:
            # Marcar la anterior como inactiva
            suscripcion.estado = 'inactiva'
            suscripcion.notas = (suscripcion.notas or '') + f'\n[Renovada automáticamente el {datetime.utcnow().date()}]'
            
            # Crear nueva suscripción
            nueva_suscripcion = Suscripcion(
                empresa_id=suscripcion.empresa_id,
                plan_id=suscripcion.plan_id,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                estado='activa',
                periodo=suscripcion.periodo,
                precio_pagado=precio_pagado,
                porcentaje_descuento=suscripcion.porcentaje_descuento,
                renovacion_automatica=True,  # Mantener la renovación automática
                forma_pago=suscripcion.forma_pago,
                creado_por=suscripcion.creado_por,
                notas=f'Renovación automática de suscripción #{suscripcion.id}'
            )
            
            db.session.add(nueva_suscripcion)
            db.session.commit()
            
            resultado['accion'] = 'renovada'
            resultado['nueva_suscripcion_id'] = nueva_suscripcion.id
            
            AppLogger.info(
                LogCategory.SUSCRIPCIONES,
                "Suscripción renovada automáticamente",
                suscripcion_anterior_id=suscripcion.id,
                nueva_suscripcion_id=nueva_suscripcion.id,
                empresa_id=suscripcion.empresa_id,
                plan_id=suscripcion.plan_id,
                periodo=suscripcion.periodo
            )
        else:
            resultado['accion'] = 'renovar (simulado)'
        
        return resultado
        
    except Exception as e:
        db.session.rollback()
        resultado['error'] = str(e)
        AppLogger.error(
            LogCategory.SUSCRIPCIONES,
            "Error en renovación automática de suscripción",
            exc=e,
            suscripcion_id=suscripcion.id
        )
        return resultado


def inactivar_suscripcion_plan(suscripcion: Suscripcion, dry_run: bool = False) -> dict:
    """
    Inactiva una suscripción que venció sin renovación automática.
    """
    resultado = {
        'tipo': 'plan',
        'suscripcion_id': suscripcion.id,
        'empresa_id': suscripcion.empresa_id,
        'empresa_nombre': suscripcion.empresa.nombre_comercial if suscripcion.empresa else 'N/A',
        'plan_nombre': suscripcion.plan.nombre if suscripcion.plan else 'N/A',
        'accion': None,
        'error': None
    }
    
    try:
        if not dry_run:
            suscripcion.estado = 'inactiva'
            suscripcion.notas = (suscripcion.notas or '') + f'\n[Inactivada automáticamente el {datetime.utcnow().date()} por vencimiento]'
            db.session.commit()
            
            AppLogger.info(
                LogCategory.SUSCRIPCIONES,
                "Suscripción inactivada por vencimiento",
                suscripcion_id=suscripcion.id,
                empresa_id=suscripcion.empresa_id
            )
        
        resultado['accion'] = 'inactivada' if not dry_run else 'inactivar (simulado)'
        return resultado
        
    except Exception as e:
        db.session.rollback()
        resultado['error'] = str(e)
        AppLogger.error(
            LogCategory.SUSCRIPCIONES,
            "Error al inactivar suscripción",
            exc=e,
            suscripcion_id=suscripcion.id
        )
        return resultado


def renovar_soporte_suscripcion(soporte: SoporteSuscripcion, dry_run: bool = False) -> dict:
    """
    Renueva automáticamente una suscripción de soporte.
    """
    resultado = {
        'tipo': 'soporte',
        'soporte_id': soporte.id,
        'empresa_id': soporte.empresa_id,
        'empresa_nombre': soporte.empresa.nombre_comercial if soporte.empresa else 'N/A',
        'tipo_soporte': soporte.tipo_soporte.nombre if soporte.tipo_soporte else 'N/A',
        'accion': None,
        'nuevo_soporte_id': None,
        'error': None
    }
    
    try:
        # Calcular nueva fecha_fin (mismo periodo que la anterior)
        if soporte.fecha_fin and soporte.fecha_inicio:
            duracion_dias = (soporte.fecha_fin - soporte.fecha_inicio).days
            fecha_inicio = soporte.fecha_fin
            fecha_fin = fecha_inicio + timedelta(days=duracion_dias)
        else:
            fecha_inicio = datetime.utcnow().date()
            fecha_fin = fecha_inicio + timedelta(days=365)  # Default: 1 año
        
        if not dry_run:
            # Marcar el anterior como vencido
            soporte.estado = 'vencido'
            soporte.notas = (soporte.notas or '') + f'\n[Renovado automáticamente el {datetime.utcnow().date()}]'
            
            # Crear nueva suscripción de soporte
            nuevo_soporte = SoporteSuscripcion(
                suscripcion_id=soporte.suscripcion_id,
                empresa_id=soporte.empresa_id,
                soporte_tipo_id=soporte.soporte_tipo_id,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                estado='activo',
                precio_actual=soporte.tipo_soporte.precio,
                renovacion_automatica=True,  # Mantener la renovación automática
                tickets_consumidos=0,  # Resetear contador
                horas_consumidas=Decimal('0.00'),
                notas=f'Renovación automática de soporte #{soporte.id}',
                creado_por=soporte.creado_por
            )
            
            db.session.add(nuevo_soporte)
            db.session.commit()
            
            resultado['accion'] = 'renovada'
            resultado['nuevo_soporte_id'] = nuevo_soporte.id
            
            AppLogger.info(
                LogCategory.SOPORTE,
                "Soporte renovado automáticamente",
                soporte_anterior_id=soporte.id,
                nuevo_soporte_id=nuevo_soporte.id,
                empresa_id=soporte.empresa_id,
                tipo_soporte_id=soporte.soporte_tipo_id
            )
        else:
            resultado['accion'] = 'renovar (simulado)'
        
        return resultado
        
    except Exception as e:
        db.session.rollback()
        resultado['error'] = str(e)
        AppLogger.error(
            LogCategory.SOPORTE,
            "Error en renovación automática de soporte",
            exc=e,
            soporte_id=soporte.id
        )
        return resultado


def inactivar_soporte_suscripcion(soporte: SoporteSuscripcion, dry_run: bool = False) -> dict:
    """
    Marca como vencida una suscripción de soporte sin renovación automática.
    """
    resultado = {
        'tipo': 'soporte',
        'soporte_id': soporte.id,
        'empresa_id': soporte.empresa_id,
        'empresa_nombre': soporte.empresa.nombre_comercial if soporte.empresa else 'N/A',
        'tipo_soporte': soporte.tipo_soporte.nombre if soporte.tipo_soporte else 'N/A',
        'accion': None,
        'error': None
    }
    
    try:
        if not dry_run:
            soporte.estado = 'vencido'
            soporte.notas = (soporte.notas or '') + f'\n[Vencido automáticamente el {datetime.utcnow().date()}]'
            db.session.commit()
            
            AppLogger.info(
                LogCategory.SOPORTE,
                "Soporte marcado como vencido",
                soporte_id=soporte.id,
                empresa_id=soporte.empresa_id
            )
        
        resultado['accion'] = 'vencida' if not dry_run else 'vencer (simulado)'
        return resultado
        
    except Exception as e:
        db.session.rollback()
        resultado['error'] = str(e)
        AppLogger.error(
            LogCategory.SOPORTE,
            "Error al vencer soporte",
            exc=e,
            soporte_id=soporte.id
        )
        return resultado


def ejecutar_renovaciones(dry_run: bool = False, dias_anticipacion: int = 0):
    """
    Función principal que revisa y procesa todas las renovaciones.
    
    Args:
        dry_run: Si es True, solo simula sin hacer cambios
        dias_anticipacion: Días de anticipación para renovar antes del vencimiento
    """
    with app.app_context():
        fecha_limite = datetime.utcnow().date() + timedelta(days=dias_anticipacion)
        
        print(f"\n{'='*80}")
        print(f"RENOVACIÓN AUTOMÁTICA DE SUSCRIPCIONES")
        print(f"Fecha: {datetime.utcnow()}")
        print(f"Modo: {'SIMULACIÓN (DRY-RUN)' if dry_run else 'EJECUCIÓN REAL'}")
        print(f"Fecha límite: {fecha_limite} (anticipación: {dias_anticipacion} días)")
        print(f"{'='*80}\n")
        
        resultados = {
            'planes_renovadas': [],
            'planes_inactivadas': [],
            'soportes_renovados': [],
            'soportes_vencidos': [],
            'errores': []
        }
        
        # ==========================================
        # 1. PROCESAR SUSCRIPCIONES DE PLAN
        # ==========================================
        print("1. Procesando suscripciones de plan...")
        
        # Buscar suscripciones activas que vencen
        suscripciones_vencer = Suscripcion.query.filter(
            Suscripcion.estado == 'activa',
            Suscripcion.fecha_fin <= fecha_limite
        ).all()
        
        print(f"   Encontradas: {len(suscripciones_vencer)} suscripciones por vencer\n")
        
        for suscripcion in suscripciones_vencer:
            if suscripcion.renovacion_automatica:
                resultado = renovar_suscripcion_plan(suscripcion, dry_run)
                if resultado['error']:
                    resultados['errores'].append(resultado)
                else:
                    resultados['planes_renovadas'].append(resultado)
                    print(f"   ✓ Renovada: Empresa {resultado['empresa_nombre']} - Plan {resultado['plan_nombre']}")
            else:
                resultado = inactivar_suscripcion_plan(suscripcion, dry_run)
                if resultado['error']:
                    resultados['errores'].append(resultado)
                else:
                    resultados['planes_inactivadas'].append(resultado)
                    print(f"   ✗ Inactivada: Empresa {resultado['empresa_nombre']} - Plan {resultado['plan_nombre']}")
        
        # ==========================================
        # 2. PROCESAR SUSCRIPCIONES DE SOPORTE
        # ==========================================
        print(f"\n2. Procesando suscripciones de soporte...")
        
        # Buscar soportes activos que vencen
        soportes_vencer = SoporteSuscripcion.query.filter(
            SoporteSuscripcion.estado == 'activo',
            SoporteSuscripcion.fecha_fin <= fecha_limite
        ).all()
        
        print(f"   Encontradas: {len(soportes_vencer)} suscripciones de soporte por vencer\n")
        
        for soporte in soportes_vencer:
            if soporte.renovacion_automatica:
                resultado = renovar_soporte_suscripcion(soporte, dry_run)
                if resultado['error']:
                    resultados['errores'].append(resultado)
                else:
                    resultados['soportes_renovados'].append(resultado)
                    print(f"   ✓ Renovado: Empresa {resultado['empresa_nombre']} - {resultado['tipo_soporte']}")
            else:
                resultado = inactivar_soporte_suscripcion(soporte, dry_run)
                if resultado['error']:
                    resultados['errores'].append(resultado)
                else:
                    resultados['soportes_vencidos'].append(resultado)
                    print(f"   ✗ Vencido: Empresa {resultado['empresa_nombre']} - {resultado['tipo_soporte']}")
        
        # ==========================================
        # RESUMEN
        # ==========================================
        print(f"\n{'='*80}")
        print("RESUMEN DE EJECUCIÓN")
        print(f"{'='*80}")
        print(f"Planes renovadas:      {len(resultados['planes_renovadas'])}")
        print(f"Planes inactivadas:    {len(resultados['planes_inactivadas'])}")
        print(f"Soportes renovados:    {len(resultados['soportes_renovados'])}")
        print(f"Soportes vencidos:     {len(resultados['soportes_vencidos'])}")
        print(f"Errores:               {len(resultados['errores'])}")
        print(f"{'='*80}\n")
        
        if resultados['errores']:
            print("ERRORES:")
            for error in resultados['errores']:
                print(f"   - {error['tipo']} ID {error.get('suscripcion_id') or error.get('soporte_id')}: {error['error']}")
        
        # Log general
        AppLogger.info(
            LogCategory.SUSCRIPCIONES,
            "Proceso de renovación automática ejecutado",
            dry_run=dry_run,
            planes_renovadas=len(resultados['planes_renovadas']),
            planes_inactivadas=len(resultados['planes_inactivadas']),
            soportes_renovados=len(resultados['soportes_renovados']),
            soportes_vencidos=len(resultados['soportes_vencidos']),
            errores=len(resultados['errores'])
        )
        
        return resultados


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Renovación automática de suscripciones')
    parser.add_argument('--dry-run', action='store_true', help='Simular sin hacer cambios')
    parser.add_argument('--dias-anticipacion', type=int, default=0, 
                       help='Días de anticipación para renovar (default: 0)')
    
    args = parser.parse_args()
    
    try:
        ejecutar_renovaciones(dry_run=args.dry_run, dias_anticipacion=args.dias_anticipacion)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {str(e)}")
        AppLogger.error(LogCategory.SUSCRIPCIONES, "Error crítico en renovación automática", exc=e)
        sys.exit(1)
