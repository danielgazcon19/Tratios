"""
Rutas administrativas para gestión de servicios
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.usuario import Usuario
from models.servicio import Servicio
from database.db import db
from functools import wraps

admin_servicios_bp = Blueprint('admin_servicios', __name__)

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


@admin_servicios_bp.route('/servicios', methods=['GET'])
@admin_required
def listar_servicios():
    """
    GET /admin/servicios
    Lista todos los servicios
    Query params: ?activo=true/false
    """
    try:
        query = Servicio.query
        
        # Filtro opcional por estado
        activo = request.args.get('activo')
        if activo is not None:
            activo_bool = activo.lower() == 'true'
            query = query.filter_by(activo=activo_bool)
        
        servicios = query.order_by(Servicio.nombre.asc()).all()
        return jsonify([servicio.to_dict() for servicio in servicios]), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al listar servicios: {str(e)}'}), 500


@admin_servicios_bp.route('/servicios', methods=['POST'])
@admin_required
def crear_servicio():
    """
    POST /admin/servicios
    Crea un nuevo servicio
    
    Body: {
        nombre: string,
        descripcion?: string,
        activo?: boolean (default: true),
        url_api?: string
    }
    """
    try:
        data = request.get_json()
        
        # Validación
        if not data.get('nombre'):
            return jsonify({'message': 'El nombre es obligatorio'}), 400
        
        # Verificar que no exista un servicio con el mismo nombre
        servicio_existente = Servicio.query.filter_by(nombre=data['nombre']).first()
        if servicio_existente:
            return jsonify({'message': 'Ya existe un servicio con ese nombre'}), 409
        
        # Crear nuevo servicio
        nuevo_servicio = Servicio(
            nombre=data['nombre'],
            descripcion=data.get('descripcion', ''),
            activo=data.get('activo', True),
            url_api=data.get('url_api')
        )
        
        db.session.add(nuevo_servicio)
        db.session.commit()
        
        return jsonify({
            'message': 'Servicio creado exitosamente',
            'servicio': nuevo_servicio.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al crear servicio: {str(e)}'}), 500


@admin_servicios_bp.route('/servicios/<int:servicio_id>', methods=['PUT'])
@admin_required
def actualizar_servicio(servicio_id):
    """
    PUT /admin/servicios/:id
    Actualiza un servicio existente
    
    Body: {
        nombre?: string,
        descripcion?: string,
        activo?: boolean,
        url_api?: string
    }
    """
    try:
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        data = request.get_json()
        
        # Verificar si se intenta cambiar el nombre a uno existente
        if data.get('nombre') and data['nombre'] != servicio.nombre:
            servicio_existente = Servicio.query.filter_by(nombre=data['nombre']).first()
            if servicio_existente:
                return jsonify({'message': 'Ya existe un servicio con ese nombre'}), 409
        
        # Actualizar campos
        if data.get('nombre'):
            servicio.nombre = data['nombre']
        if 'descripcion' in data:
            servicio.descripcion = data['descripcion']
        if 'activo' in data:
            servicio.activo = bool(data['activo'])
        if 'url_api' in data:
            servicio.url_api = data['url_api']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Servicio actualizado exitosamente',
            'servicio': servicio.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar servicio: {str(e)}'}), 500


@admin_servicios_bp.route('/servicios/<int:servicio_id>/toggle', methods=['POST'])
@admin_required
def toggle_servicio(servicio_id):
    """
    POST /admin/servicios/:id/toggle
    Activa o desactiva un servicio
    """
    try:
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        # Cambiar estado
        servicio.activo = not servicio.activo
        db.session.commit()
        
        estado = 'activado' if servicio.activo else 'desactivado'
        
        return jsonify({
            'message': f'Servicio "{servicio.nombre}" {estado} exitosamente',
            'servicio': servicio.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al cambiar estado del servicio: {str(e)}'}), 500


@admin_servicios_bp.route('/servicios/<int:servicio_id>', methods=['DELETE'])
@admin_required
def eliminar_servicio(servicio_id):
    """
    DELETE /admin/servicios/:id
    Elimina un servicio de la base de datos
    """
    try:
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        nombre_servicio = servicio.nombre
        db.session.delete(servicio)
        db.session.commit()
        
        return jsonify({
            'message': f'Servicio "{nombre_servicio}" eliminado exitosamente'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar servicio: {str(e)}'}), 500
