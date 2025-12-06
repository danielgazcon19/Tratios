"""
Rutas de administración para tipos de soporte (CRUD)
"""
from flask import Blueprint, request, jsonify
from database.db import db
from models.soporte_tipo import SoporteTipo
from utils.security import admin_required

admin_soporte_tipos_bp = Blueprint('admin_soporte_tipos', __name__, url_prefix='/admin/soporte-tipos')


@admin_soporte_tipos_bp.route('', methods=['GET'])
@admin_required
def listar_tipos_soporte():
    """
    GET /admin/soporte-tipos
    Lista todos los tipos de soporte con filtros opcionales
    Query params: activo (bool), modalidad (string)
    """
    try:
        query = SoporteTipo.query
        
        # Filtrar por estado activo
        activo = request.args.get('activo')
        if activo is not None:
            query = query.filter(SoporteTipo.activo == (activo.lower() == 'true'))
        
        # Filtrar por modalidad
        modalidad = request.args.get('modalidad')
        if modalidad:
            query = query.filter(SoporteTipo.modalidad == modalidad)
        
        tipos = query.order_by(SoporteTipo.nombre).all()
        
        return jsonify({
            'tipos': [t.to_dict() for t in tipos],
            'total': len(tipos)
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al listar tipos de soporte: {str(e)}'}), 500


@admin_soporte_tipos_bp.route('/<int:tipo_id>', methods=['GET'])
@admin_required
def obtener_tipo_soporte(tipo_id):
    """
    GET /admin/soporte-tipos/:id
    Obtiene un tipo de soporte por ID
    """
    try:
        tipo = SoporteTipo.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de soporte no encontrado'}), 404
        
        return jsonify(tipo.to_dict()), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener tipo de soporte: {str(e)}'}), 500


@admin_soporte_tipos_bp.route('', methods=['POST'])
@admin_required
def crear_tipo_soporte():
    """
    POST /admin/soporte-tipos
    Crea un nuevo tipo de soporte
    Body: { nombre, descripcion?, modalidad, precio, max_tickets?, max_horas?, activo? }
    """
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('nombre'):
            return jsonify({'message': 'El nombre es obligatorio'}), 400
        if not data.get('modalidad'):
            return jsonify({'message': 'La modalidad es obligatoria'}), 400
        if data['modalidad'] not in ['mensual', 'anual', 'por_tickets', 'por_horas']:
            return jsonify({'message': 'Modalidad inválida'}), 400
        
        # Validar campos según modalidad
        if data['modalidad'] == 'por_tickets' and not data.get('max_tickets'):
            return jsonify({'message': 'max_tickets es obligatorio para modalidad por_tickets'}), 400
        if data['modalidad'] == 'por_horas' and not data.get('max_horas'):
            return jsonify({'message': 'max_horas es obligatorio para modalidad por_horas'}), 400
        
        nuevo_tipo = SoporteTipo(
            nombre=data['nombre'],
            descripcion=data.get('descripcion'),
            modalidad=data['modalidad'],
            precio=data.get('precio', 0),
            max_tickets=data.get('max_tickets'),
            max_horas=data.get('max_horas'),
            activo=data.get('activo', True)
        )
        
        db.session.add(nuevo_tipo)
        db.session.commit()
        
        return jsonify({
            'message': 'Tipo de soporte creado exitosamente',
            'tipo': nuevo_tipo.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al crear tipo de soporte: {str(e)}'}), 500


@admin_soporte_tipos_bp.route('/<int:tipo_id>', methods=['PUT'])
@admin_required
def actualizar_tipo_soporte(tipo_id):
    """
    PUT /admin/soporte-tipos/:id
    Actualiza un tipo de soporte existente
    """
    try:
        tipo = SoporteTipo.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de soporte no encontrado'}), 404
        
        data = request.get_json()
        
        if 'nombre' in data:
            tipo.nombre = data['nombre']
        if 'descripcion' in data:
            tipo.descripcion = data['descripcion']
        if 'modalidad' in data:
            if data['modalidad'] not in ['mensual', 'anual', 'por_tickets', 'por_horas']:
                return jsonify({'message': 'Modalidad inválida'}), 400
            tipo.modalidad = data['modalidad']
        if 'precio' in data:
            tipo.precio = data['precio']
        if 'max_tickets' in data:
            tipo.max_tickets = data['max_tickets']
        if 'max_horas' in data:
            tipo.max_horas = data['max_horas']
        if 'activo' in data:
            tipo.activo = data['activo']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tipo de soporte actualizado exitosamente',
            'tipo': tipo.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar tipo de soporte: {str(e)}'}), 500


@admin_soporte_tipos_bp.route('/<int:tipo_id>', methods=['DELETE'])
@admin_required
def eliminar_tipo_soporte(tipo_id):
    """
    DELETE /admin/soporte-tipos/:id
    Desactiva un tipo de soporte (soft delete)
    """
    try:
        tipo = SoporteTipo.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de soporte no encontrado'}), 404
        
        # Verificar si tiene suscripciones activas
        suscripciones_activas = tipo.suscripciones_soporte.filter_by(estado='activo').count()
        if suscripciones_activas > 0:
            return jsonify({
                'message': f'No se puede eliminar. Hay {suscripciones_activas} suscripción(es) activa(s) con este tipo de soporte'
            }), 400
        
        tipo.activo = False
        db.session.commit()
        
        return jsonify({'message': 'Tipo de soporte desactivado exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar tipo de soporte: {str(e)}'}), 500


@admin_soporte_tipos_bp.route('/<int:tipo_id>/activar', methods=['POST'])
@admin_required
def activar_tipo_soporte(tipo_id):
    """
    POST /admin/soporte-tipos/:id/activar
    Reactiva un tipo de soporte desactivado
    """
    try:
        tipo = SoporteTipo.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de soporte no encontrado'}), 404
        
        tipo.activo = True
        db.session.commit()
        
        return jsonify({
            'message': 'Tipo de soporte activado exitosamente',
            'tipo': tipo.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al activar tipo de soporte: {str(e)}'}), 500
