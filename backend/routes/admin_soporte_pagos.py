"""
Rutas de administración para pagos de soporte
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from database.db import db
from models.soporte_pago import SoportePago
from models.soporte_suscripcion import SoporteSuscripcion
from utils.security import admin_required

admin_soporte_pagos_bp = Blueprint('admin_soporte_pagos', __name__, url_prefix='/admin/soporte-pagos')


@admin_soporte_pagos_bp.route('', methods=['GET'])
@admin_required
def listar_pagos_soporte():
    """
    GET /admin/soporte-pagos
    Lista todos los pagos de soporte con filtros
    Query params: soporte_suscripcion_id, estado, desde, hasta
    """
    try:
        query = SoportePago.query
        
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
        
        pagos = query.order_by(SoportePago.fecha_pago.desc()).all()
        
        return jsonify({
            'pagos': [p.to_dict(include_relations=True) for p in pagos],
            'total': len(pagos),
            'monto_total': float(sum(p.monto for p in pagos if p.estado == 'exitoso'))
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
        current_user_id = get_jwt_identity()
        
        # Validaciones
        if not data.get('soporte_suscripcion_id'):
            return jsonify({'message': 'soporte_suscripcion_id es obligatorio'}), 400
        if not data.get('fecha_pago'):
            return jsonify({'message': 'fecha_pago es obligatoria'}), 400
        if not data.get('monto'):
            return jsonify({'message': 'monto es obligatorio'}), 400
        
        # Verificar que existe la suscripción de soporte
        soporte_suscripcion = SoporteSuscripcion.query.get(data['soporte_suscripcion_id'])
        if not soporte_suscripcion:
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        estado = data.get('estado', 'exitoso')
        if estado not in ['exitoso', 'fallido', 'pendiente']:
            return jsonify({'message': 'Estado inválido'}), 400
        
        nuevo_pago = SoportePago(
            soporte_suscripcion_id=data['soporte_suscripcion_id'],
            fecha_pago=datetime.fromisoformat(data['fecha_pago']),
            monto=data['monto'],
            metodo_pago=data.get('metodo_pago'),
            referencia_pago=data.get('referencia_pago'),
            estado=estado,
            detalle=data.get('detalle'),
            registrado_por=current_user_id
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
