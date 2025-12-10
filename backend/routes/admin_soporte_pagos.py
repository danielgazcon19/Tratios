"""
Rutas de administración para pagos de soporte
"""
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from database.db import db
#Services
from models.usuario import Usuario
#Models
from models.soporte_pago import SoportePago
from models.soporte_suscripcion import SoporteSuscripcion
#Utils
from utils.security import admin_required

admin_soporte_pagos_bp = Blueprint('admin_soporte_pagos', __name__, url_prefix='/admin/soporte-pagos')

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def get_local_now():
    """Obtiene la fecha/hora actual en zona horaria de Colombia"""
    return datetime.now(COLOMBIA_TZ)


@admin_soporte_pagos_bp.route('', methods=['GET'])
@admin_required
def listar_pagos_soporte():
    """
    GET /admin/soporte-pagos
    Lista todos los pagos de soporte con filtros y paginación
    Query params: 
        - soporte_suscripcion_id, estado, desde, hasta
        - empresa_id, metodo_pago, referencia
        - page (default: 1), per_page (default: 10)
    """
    try:
        query = SoportePago.query
        
        # Filtros existentes
        soporte_suscripcion_id = request.args.get('soporte_suscripcion_id', type=int)
        if soporte_suscripcion_id:
            query = query.filter(SoportePago.soporte_suscripcion_id == soporte_suscripcion_id)
        
        estado = request.args.get('estado')
        if estado:
            query = query.filter(SoportePago.estado == estado)
        
        desde = request.args.get('desde')
        if desde:
            query = query.filter(SoportePago.fecha_pago >= datetime.fromisoformat(desde))
        
        hasta = request.args.get('hasta')
        if hasta:
            query = query.filter(SoportePago.fecha_pago <= datetime.fromisoformat(hasta))
        
        # Nuevos filtros de búsqueda
        empresa_id = request.args.get('empresa_id', type=int)
        if empresa_id:
            query = query.join(SoporteSuscripcion).filter(SoporteSuscripcion.empresa_id == empresa_id)
        
        metodo_pago = request.args.get('metodo_pago')
        if metodo_pago:
            query = query.filter(SoportePago.metodo_pago.ilike(f'%{metodo_pago}%'))
        
        referencia = request.args.get('referencia')
        if referencia:
            query = query.filter(SoportePago.referencia_pago.ilike(f'%{referencia}%'))
        
        # Búsqueda general (busca en referencia, método de pago o detalle)
        busqueda = request.args.get('busqueda')
        if busqueda:
            query = query.filter(
                db.or_(
                    SoportePago.referencia_pago.ilike(f'%{busqueda}%'),
                    SoportePago.metodo_pago.ilike(f'%{busqueda}%'),
                    SoportePago.detalle.ilike(f'%{busqueda}%')
                )
            )
        
        # Paginación
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Limitar per_page a un máximo razonable
        per_page = min(per_page, 100)
        
        # Obtener total antes de paginar
        total = query.count()
        
        # Ordenar y paginar
        pagos = query.order_by(SoportePago.fecha_pago.desc()).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Calcular monto total (solo pagos exitosos)
        monto_total_query = SoportePago.query
        if soporte_suscripcion_id:
            monto_total_query = monto_total_query.filter(SoportePago.soporte_suscripcion_id == soporte_suscripcion_id)
        if estado:
            monto_total_query = monto_total_query.filter(SoportePago.estado == estado)
        else:
            monto_total_query = monto_total_query.filter(SoportePago.estado == 'exitoso')
        
        monto_total = float(sum(p.monto for p in monto_total_query.all()))
        
        return jsonify({
            'pagos': [p.to_dict(include_relations=True) for p in pagos.items],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': pagos.pages,
            'monto_total': monto_total
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al listar pagos de soporte: {str(e)}'}), 500


@admin_soporte_pagos_bp.route('/<int:pago_id>', methods=['GET'])
@admin_required
def obtener_pago_soporte(pago_id):
    """
    GET /admin/soporte-pagos/:id
    Obtiene un pago de soporte por ID
    """
    try:
        pago = SoportePago.query.get(pago_id)
        if not pago:
            return jsonify({'message': 'Pago no encontrado'}), 404
        
        return jsonify(pago.to_dict(include_relations=True)), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener pago: {str(e)}'}), 500


@admin_soporte_pagos_bp.route('', methods=['POST'])
@admin_required
def registrar_pago_soporte():
    """
    POST /admin/soporte-pagos
    Registra un nuevo pago de soporte
    Body: {
        soporte_suscripcion_id: int,
        fecha_pago: datetime,
        monto: decimal,
        metodo_pago?: string,
        referencia_pago?: string,
        estado?: string (exitoso|fallido|pendiente),
        detalle?: object
    }
    """
    try:
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Validaciones
        if not data.get('soporte_suscripcion_id'):
            return jsonify({'message': 'soporte_suscripcion_id es obligatorio'}), 400
        if not data.get('fecha_pago'):
            return jsonify({'message': 'fecha_pago es obligatoria'}), 400
        if not data.get('monto'):
            return jsonify({'message': 'monto es obligatorio'}), 400
        
        # Obtener el ID del usuario actual
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        # Verificar que existe la suscripción de soporte
        soporte_suscripcion = SoporteSuscripcion.query.get(data['soporte_suscripcion_id'])
        if not soporte_suscripcion:
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        estado = data.get('estado', 'exitoso')
        if estado not in ['exitoso', 'fallido', 'pendiente']:
            return jsonify({'message': 'Estado inválido'}), 400
        
        # Parsear fecha_pago y agregar hora actual de Colombia
        fecha_pago_str = data['fecha_pago']
        if 'T' in fecha_pago_str or ' ' in fecha_pago_str:
            # Ya tiene hora
            fecha_pago = datetime.fromisoformat(fecha_pago_str.replace('Z', '+00:00'))
        else:
            # Solo tiene fecha, usar hora actual de Colombia
            fecha_base = datetime.fromisoformat(fecha_pago_str)
            hora_actual = get_local_now()
            fecha_pago = datetime.combine(fecha_base.date(), hora_actual.time(), tzinfo=COLOMBIA_TZ)
        
        nuevo_pago = SoportePago(
            soporte_suscripcion_id=data['soporte_suscripcion_id'],
            fecha_pago=fecha_pago,
            monto=data['monto'],
            metodo_pago=data.get('metodo_pago'),
            referencia_pago=data.get('referencia_pago'),
            estado=estado,
            detalle=data.get('detalle'),
            registrado_por=current_user.id,
            fecha_creacion=get_local_now()
        )
        
        db.session.add(nuevo_pago)
        
        # Si el pago es exitoso y la suscripción estaba pendiente de pago, activarla
        if estado == 'exitoso' and soporte_suscripcion.estado == 'pendiente_pago':
            soporte_suscripcion.estado = 'activo'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Pago registrado exitosamente',
            'pago': nuevo_pago.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al registrar pago: {str(e)}'}), 500


@admin_soporte_pagos_bp.route('/<int:pago_id>/confirmar', methods=['POST'])
@admin_required
def confirmar_pago_soporte(pago_id):
    """
    POST /admin/soporte-pagos/:id/confirmar
    Confirma un pago pendiente
    """
    try:
        pago = SoportePago.query.get(pago_id)
        if not pago:
            return jsonify({'message': 'Pago no encontrado'}), 404
        
        if pago.estado != 'pendiente':
            return jsonify({'message': 'Solo se pueden confirmar pagos pendientes'}), 400
        
        pago.estado = 'exitoso'
        
        # Activar suscripción si estaba pendiente de pago
        if pago.soporte_suscripcion.estado == 'pendiente_pago':
            pago.soporte_suscripcion.estado = 'activo'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Pago confirmado exitosamente',
            'pago': pago.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al confirmar pago: {str(e)}'}), 500


@admin_soporte_pagos_bp.route('/<int:pago_id>/revertir', methods=['POST'])
@admin_required
def revertir_pago_soporte(pago_id):
    """
    POST /admin/soporte-pagos/:id/revertir
    Revierte un pago exitoso a fallido
    Body: { motivo?: string }
    """
    try:
        pago = SoportePago.query.get(pago_id)
        if not pago:
            return jsonify({'message': 'Pago no encontrado'}), 404
        
        if pago.estado != 'exitoso':
            return jsonify({'message': 'Solo se pueden revertir pagos exitosos'}), 400
        
        data = request.get_json() or {}
        motivo = data.get('motivo', 'Revertido por administrador')
        
        pago.estado = 'fallido'
        pago.detalle = pago.detalle or {}
        pago.detalle['motivo_reversion'] = motivo
        pago.detalle['fecha_reversion'] = datetime.utcnow().isoformat()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Pago revertido exitosamente',
            'pago': pago.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al revertir pago: {str(e)}'}), 500
