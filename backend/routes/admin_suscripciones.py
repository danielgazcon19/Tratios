"""
Rutas administrativas para gestión de suscripciones
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from models.usuario import Usuario
from models.empresa import Empresa
from models.plan import Plan
from models.suscripcion import Suscripcion
from database.db import db
from datetime import datetime, timedelta
from functools import wraps

admin_suscripciones_bp = Blueprint('admin_suscripciones', __name__)

def admin_required(fn):
    """Decorador para verificar que el usuario sea admin"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_email = get_jwt_identity()
        usuario = Usuario.query.filter_by(email=current_user_email).first()
        
        if not usuario or usuario.rol != 'admin':
            return jsonify({'message': 'Acceso denegado. Se requieren permisos de administrador.'}), 403
        
        return fn(*args, **kwargs)
    return wrapper


@admin_suscripciones_bp.route('/suscripciones', methods=['GET'])
@admin_required
def listar_suscripciones():
    """
    GET /admin/suscripciones
    Lista todas las suscripciones con filtros opcionales
    Query params: ?estado=activa&empresa_id=1
    """
    try:
        # Usar joinedload para cargar las relaciones
        query = Suscripcion.query.options(
            joinedload(Suscripcion.empresa),
            joinedload(Suscripcion.plan)
        )
        
        # Filtros opcionales
        estado = request.args.get('estado')
        empresa_id = request.args.get('empresa_id')
        
        if estado:
            query = query.filter_by(estado=estado)
        if empresa_id:
            query = query.filter_by(empresa_id=empresa_id)
        
        suscripciones = query.order_by(Suscripcion.creado_en.desc()).all()
        
        resultado = []
        for suscripcion in suscripciones:
            resultado.append(suscripcion.to_dict())
        
        return jsonify(resultado), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al listar suscripciones: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones', methods=['POST'])
@admin_required
def crear_suscripcion():
    """
    POST /admin/suscripciones
    Asigna un plan a una empresa (crea una nueva suscripción)
    
    Body: {
        empresa_id: int,
        plan_id: int,
        periodo: 'mensual' | 'anual',
        fecha_inicio?: date (opcional, default: hoy),
        forma_pago?: string,
        notas?: string
    }
    """
    try:
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Obtener el usuario actual para conseguir su ID
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        # Validaciones
        if not data.get('empresa_id') or not data.get('plan_id'):
            return jsonify({'message': 'empresa_id y plan_id son obligatorios'}), 400
        
        if data.get('periodo') not in ['mensual', 'anual']:
            return jsonify({'message': 'periodo debe ser "mensual" o "anual"'}), 400
        
        # Verificar que exista la empresa
        empresa = Empresa.query.get(data['empresa_id'])
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Verificar que exista el plan
        plan = Plan.query.get(data['plan_id'])
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        # Verificar si ya tiene una suscripción activa con el mismo plan
        suscripcion_existente = Suscripcion.query.filter_by(
            empresa_id=data['empresa_id'],
            plan_id=data['plan_id'],
            estado='activa'
        ).first()
        
        if suscripcion_existente:
            return jsonify({
                'message': 'La empresa ya tiene una suscripción activa con este plan'
            }), 409
        
        # Calcular fechas
        fecha_inicio = data.get('fecha_inicio')
        if fecha_inicio:
            fecha_inicio = datetime.fromisoformat(fecha_inicio)
        else:
            fecha_inicio = datetime.utcnow()
        
        # Calcular fecha fin según periodo
        if data['periodo'] == 'mensual':
            fecha_fin = fecha_inicio + timedelta(days=30)
            precio_pagado = plan.precio_mensual
        else:  # anual
            fecha_fin = fecha_inicio + timedelta(days=365)
            precio_pagado = plan.precio_anual
        
        # Crear nueva suscripción
        nueva_suscripcion = Suscripcion(
            empresa_id=data['empresa_id'],
            plan_id=data['plan_id'],
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado='activa',
            periodo=data['periodo'],
            precio_pagado=precio_pagado,
            forma_pago=data.get('forma_pago'),
            creado_por=current_user.id,
            notas=data.get('notas')
        )
        
        db.session.add(nueva_suscripcion)
        db.session.commit()
        
        # El to_dict() ahora incluye empresa y plan automáticamente
        return jsonify({
            'message': 'Suscripción creada exitosamente',
            'suscripcion': nueva_suscripcion.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al crear suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/renovar', methods=['POST'])
@admin_required
def renovar_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/renovar
    Renueva una suscripción (crea un nuevo registro con mismos datos)
    
    Body: {
        periodo?: 'mensual' | 'anual' (opcional, usa el periodo anterior),
        fecha_inicio?: date (opcional, default: fecha_fin anterior o hoy),
        notas?: string
    }
    """
    try:
        suscripcion_anterior = Suscripcion.query.get(suscripcion_id)
        if not suscripcion_anterior:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        
        # Usar periodo de la suscripción anterior si no se especifica
        periodo = data.get('periodo', suscripcion_anterior.periodo)
        if periodo not in ['mensual', 'anual']:
            return jsonify({'message': 'periodo debe ser "mensual" o "anual"'}), 400
        
        # Calcular fechas
        fecha_inicio = data.get('fecha_inicio')
        if fecha_inicio:
            fecha_inicio = datetime.fromisoformat(fecha_inicio)
        elif suscripcion_anterior.fecha_fin:
            # Empezar desde donde terminó la anterior
            fecha_inicio = suscripcion_anterior.fecha_fin
        else:
            fecha_inicio = datetime.utcnow()
        
        # Calcular fecha fin según periodo
        plan = suscripcion_anterior.plan
        if periodo == 'mensual':
            fecha_fin = fecha_inicio + timedelta(days=30)
            precio_pagado = plan.precio_mensual
        else:  # anual
            fecha_fin = fecha_inicio + timedelta(days=365)
            precio_pagado = plan.precio_anual
        
        # Marcar la anterior como inactiva si estaba activa
        if suscripcion_anterior.estado == 'activa':
            suscripcion_anterior.estado = 'inactiva'
        
        # Crear nueva suscripción (renovación)
        nueva_suscripcion = Suscripcion(
            empresa_id=suscripcion_anterior.empresa_id,
            plan_id=suscripcion_anterior.plan_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado='activa',
            periodo=periodo,
            precio_pagado=precio_pagado,
            forma_pago=suscripcion_anterior.forma_pago,
            creado_por=current_user_id,
            notas=data.get('notas', f'Renovación de suscripción #{suscripcion_id}')
        )
        
        db.session.add(nueva_suscripcion)
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción renovada exitosamente',
            'suscripcion': nueva_suscripcion.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al renovar suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/cancelar', methods=['POST'])
@admin_required
def cancelar_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/cancelar
    Cancela una suscripción activa
    
    Body: {
        motivo: string (obligatorio),
        notas?: string
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado == 'cancelada':
            return jsonify({'message': 'La suscripción ya está cancelada'}), 400
        
        data = request.get_json()
        if not data.get('motivo'):
            return jsonify({'message': 'El motivo de cancelación es obligatorio'}), 400
        
        # Cancelar suscripción
        suscripcion.estado = 'cancelada'
        suscripcion.motivo_cancelacion = data['motivo']
        
        if data.get('notas'):
            # Agregar notas a las existentes
            if suscripcion.notas:
                suscripcion.notas += f"\n\n[Cancelación] {data['notas']}"
            else:
                suscripcion.notas = f"[Cancelación] {data['notas']}"
        
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción cancelada exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al cancelar suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/suspender', methods=['POST'])
@admin_required
def suspender_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/suspender
    Suspende temporalmente una suscripción
    
    Body: {
        motivo: string (obligatorio),
        notas?: string
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado != 'activa':
            return jsonify({'message': 'Solo se pueden suspender suscripciones activas'}), 400
        
        data = request.get_json()
        if not data.get('motivo'):
            return jsonify({'message': 'El motivo de suspensión es obligatorio'}), 400
        
        # Suspender suscripción
        suscripcion.estado = 'suspendida'
        
        if data.get('notas'):
            # Agregar notas a las existentes
            if suscripcion.notas:
                suscripcion.notas += f"\n\n[Suspensión] {data['motivo']}: {data['notas']}"
            else:
                suscripcion.notas = f"[Suspensión] {data['motivo']}: {data['notas']}"
        
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción suspendida exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al suspender suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/reactivar', methods=['POST'])
@admin_required
def reactivar_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/reactivar
    Reactiva una suscripción suspendida
    
    Body: {
        notas?: string
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado != 'suspendida':
            return jsonify({'message': 'Solo se pueden reactivar suscripciones suspendidas'}), 400
        
        data = request.get_json() or {}
        
        # Reactivar suscripción
        suscripcion.estado = 'activa'
        
        if data.get('notas'):
            # Agregar notas a las existentes
            if suscripcion.notas:
                suscripcion.notas += f"\n\n[Reactivación] {data['notas']}"
            else:
                suscripcion.notas = f"[Reactivación] {data['notas']}"
        
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción reactivada exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al reactivar suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/estadisticas', methods=['GET'])
@admin_required
def estadisticas_suscripciones():
    """
    GET /admin/suscripciones/estadisticas
    Devuelve estadísticas de suscripciones
    """
    try:
        total = Suscripcion.query.count()
        activas = Suscripcion.query.filter_by(estado='activa').count()
        suspendidas = Suscripcion.query.filter_by(estado='suspendida').count()
        canceladas = Suscripcion.query.filter_by(estado='cancelada').count()
        inactivas = Suscripcion.query.filter_by(estado='inactiva').count()
        
        # Suscripciones por plan
        from sqlalchemy import func
        por_plan = db.session.query(
            Plan.nombre,
            func.count(Suscripcion.id).label('cantidad')
        ).join(Suscripcion).group_by(Plan.nombre).all()
        
        return jsonify({
            'total': total,
            'activas': activas,
            'suspendidas': suspendidas,
            'canceladas': canceladas,
            'inactivas': inactivas,
            'por_plan': [{'plan': nombre, 'cantidad': cantidad} for nombre, cantidad in por_plan]
        }), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al obtener estadísticas: {str(e)}'}), 500
