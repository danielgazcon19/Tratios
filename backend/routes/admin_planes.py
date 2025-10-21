"""
Rutas administrativas para gestión de planes
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.usuario import Usuario
from models.plan import Plan
from database.db import db
from functools import wraps

admin_planes_bp = Blueprint('admin_planes', __name__)

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


@admin_planes_bp.route('/planes', methods=['GET'])
@admin_required
def listar_planes():
    """
    GET /admin/planes
    Lista todos los planes
    """
    try:
        planes = Plan.query.order_by(Plan.precio_mensual.asc()).all()
        return jsonify([plan.to_dict() for plan in planes]), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al listar planes: {str(e)}'}), 500


@admin_planes_bp.route('/planes', methods=['POST'])
@admin_required
def crear_plan():
    """
    POST /admin/planes
    Crea un nuevo plan
    
    Body: {
        nombre: string,
        precio_mensual: float,
        precio_anual: float,
        descripcion?: string
    }
    """
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('nombre'):
            return jsonify({'message': 'El nombre es obligatorio'}), 400
        
        if not data.get('precio_mensual') or not data.get('precio_anual'):
            return jsonify({'message': 'Los precios mensual y anual son obligatorios'}), 400
        
        # Verificar que no exista un plan con el mismo nombre
        plan_existente = Plan.query.filter_by(nombre=data['nombre']).first()
        if plan_existente:
            return jsonify({'message': 'Ya existe un plan con ese nombre'}), 409
        
        # Crear nuevo plan
        nuevo_plan = Plan(
            nombre=data['nombre'],
            precio_mensual=float(data['precio_mensual']),
            precio_anual=float(data['precio_anual']),
            descripcion=data.get('descripcion', ''),
            seleccionado=data.get('seleccionado', False)
        )
        
        db.session.add(nuevo_plan)
        db.session.commit()
        
        return jsonify({
            'message': 'Plan creado exitosamente',
            'plan': nuevo_plan.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al crear plan: {str(e)}'}), 500


@admin_planes_bp.route('/planes/<int:plan_id>', methods=['PUT'])
@admin_required
def actualizar_plan(plan_id):
    """
    PUT /admin/planes/:id
    Actualiza un plan existente
    
    Body: {
        nombre?: string,
        precio_mensual?: float,
        precio_anual?: float,
        descripcion?: string
    }
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        data = request.get_json()
        
        # Verificar si se intenta cambiar el nombre a uno existente
        if data.get('nombre') and data['nombre'] != plan.nombre:
            plan_existente = Plan.query.filter_by(nombre=data['nombre']).first()
            if plan_existente:
                return jsonify({'message': 'Ya existe un plan con ese nombre'}), 409
        
        # Actualizar campos
        if data.get('nombre'):
            plan.nombre = data['nombre']
        if data.get('precio_mensual'):
            plan.precio_mensual = float(data['precio_mensual'])
        if data.get('precio_anual'):
            plan.precio_anual = float(data['precio_anual'])
        if 'descripcion' in data:
            plan.descripcion = data['descripcion']
        if 'seleccionado' in data:
            plan.seleccionado = data['seleccionado']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Plan actualizado exitosamente',
            'plan': plan.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar plan: {str(e)}'}), 500


@admin_planes_bp.route('/planes/<int:plan_id>', methods=['DELETE'])
@admin_required
def eliminar_plan(plan_id):
    """
    DELETE /admin/planes/:id
    Elimina un plan de la base de datos
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        # Verificar si el plan tiene suscripciones activas
        if plan.suscripciones:
            suscripciones_activas = [s for s in plan.suscripciones if s.estado == 'activa']
            if suscripciones_activas:
                return jsonify({
                    'message': f'No se puede eliminar el plan porque tiene {len(suscripciones_activas)} suscripción(es) activa(s)'
                }), 409
        
        nombre_plan = plan.nombre
        db.session.delete(plan)
        db.session.commit()
        
        return jsonify({
            'message': f'Plan "{nombre_plan}" eliminado exitosamente'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar plan: {str(e)}'}), 500
