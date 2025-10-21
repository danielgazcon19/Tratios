"""
Rutas administrativas para gestión de la relación Planes-Servicios
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.usuario import Usuario
from models.plan import Plan
from models.servicio import Servicio
from database.db import db
from functools import wraps

admin_plan_servicios_bp = Blueprint('admin_plan_servicios', __name__)

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


@admin_plan_servicios_bp.route('/planes/<int:plan_id>/servicios', methods=['GET'])
@admin_required
def obtener_servicios_plan(plan_id):
    """
    GET /admin/planes/:id/servicios
    Obtiene todos los servicios asociados a un plan
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        return jsonify({
            'plan': plan.to_dict(),
            'servicios': [servicio.to_dict() for servicio in plan.servicios]
        }), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al obtener servicios del plan: {str(e)}'}), 500


@admin_plan_servicios_bp.route('/planes/<int:plan_id>/servicios', methods=['POST'])
@admin_required
def asociar_servicios_plan(plan_id):
    """
    POST /admin/planes/:id/servicios
    Asocia múltiples servicios a un plan (reemplaza los existentes)
    
    Body: {
        servicio_ids: [1, 2, 3, ...]
    }
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        data = request.get_json()
        servicio_ids = data.get('servicio_ids', [])
        
        # Validar que todos los servicios existan
        servicios = []
        for servicio_id in servicio_ids:
            servicio = Servicio.query.get(servicio_id)
            if not servicio:
                return jsonify({'message': f'Servicio con ID {servicio_id} no encontrado'}), 404
            servicios.append(servicio)
        
        # Reemplazar los servicios del plan
        plan.servicios = servicios
        db.session.commit()
        
        return jsonify({
            'message': f'Se asociaron {len(servicios)} servicio(s) al plan "{plan.nombre}"',
            'plan': plan.to_dict(),
            'servicios': [s.to_dict() for s in plan.servicios]
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al asociar servicios: {str(e)}'}), 500


@admin_plan_servicios_bp.route('/planes/<int:plan_id>/servicios/<int:servicio_id>', methods=['POST'])
@admin_required
def agregar_servicio_plan(plan_id, servicio_id):
    """
    POST /admin/planes/:plan_id/servicios/:servicio_id
    Agrega un servicio específico a un plan (sin eliminar los existentes)
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        # Verificar si ya está asociado
        if servicio in plan.servicios:
            return jsonify({'message': 'El servicio ya está asociado a este plan'}), 409
        
        # Agregar el servicio
        plan.servicios.append(servicio)
        db.session.commit()
        
        return jsonify({
            'message': f'Servicio "{servicio.nombre}" agregado al plan "{plan.nombre}"',
            'plan': plan.to_dict(),
            'servicios': [s.to_dict() for s in plan.servicios]
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al agregar servicio: {str(e)}'}), 500


@admin_plan_servicios_bp.route('/planes/<int:plan_id>/servicios/<int:servicio_id>', methods=['DELETE'])
@admin_required
def eliminar_servicio_plan(plan_id, servicio_id):
    """
    DELETE /admin/planes/:plan_id/servicios/:servicio_id
    Elimina un servicio específico de un plan
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        # Verificar si está asociado
        if servicio not in plan.servicios:
            return jsonify({'message': 'El servicio no está asociado a este plan'}), 404
        
        # Eliminar el servicio
        plan.servicios.remove(servicio)
        db.session.commit()
        
        return jsonify({
            'message': f'Servicio "{servicio.nombre}" eliminado del plan "{plan.nombre}"',
            'plan': plan.to_dict(),
            'servicios': [s.to_dict() for s in plan.servicios]
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar servicio: {str(e)}'}), 500


@admin_plan_servicios_bp.route('/planes-servicios/resumen', methods=['GET'])
@admin_required
def resumen_planes_servicios():
    """
    GET /admin/planes-servicios/resumen
    Obtiene un resumen de todos los planes con sus servicios asociados
    """
    try:
        planes = Plan.query.all()
        
        resultado = []
        for plan in planes:
            plan_dict = plan.to_dict()
            plan_dict['servicios'] = [s.to_dict() for s in plan.servicios]
            plan_dict['total_servicios'] = len(plan.servicios)
            resultado.append(plan_dict)
        
        return jsonify(resultado), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al obtener resumen: {str(e)}'}), 500
