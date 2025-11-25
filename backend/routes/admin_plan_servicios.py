"""
Rutas administrativas para gestión de la relación Planes-Servicios
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.usuario import Usuario
from models.plan import Plan
from models.servicio import Servicio
from models.servicio import PlanServicio
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
    Obtiene todos los servicios asociados a un plan con sus cantidades
    """
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404

        # Obtener servicios con sus cantidades
        plan_servicios = PlanServicio.query.filter_by(plan_id=plan_id).all()
        servicios_con_cantidad = []
        
        for ps in plan_servicios:
            servicio_dict = ps.servicio.to_dict()
            servicio_dict['cantidad'] = ps.cantidad
            servicios_con_cantidad.append(servicio_dict)
        
        return jsonify({
            'plan': plan.to_dict(),
            'servicios': servicios_con_cantidad
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
        servicios: [
            { "servicio_id": 1, "cantidad": 5 },
            { "servicio_id": 2, "cantidad": 10 },
            { "servicio_id": 3 }  // sin cantidad
        ]
    }
    
    O formato legacy:
    Body: {
        servicio_ids: [1, 2, 3, ...]
    }
    """
    try:
        from models.servicio import PlanServicio
        
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        data = request.get_json()
        
        # Soportar ambos formatos: nuevo (con cantidad) y legacy
        servicios_data = data.get('servicios', [])
        servicio_ids_legacy = data.get('servicio_ids', [])
        
        # Convertir formato legacy al nuevo
        if servicio_ids_legacy and not servicios_data:
            servicios_data = [{'servicio_id': sid} for sid in servicio_ids_legacy]
        
        # Eliminar asociaciones existentes
        PlanServicio.query.filter_by(plan_id=plan_id).delete()
        
        # Crear nuevas asociaciones
        for servicio_info in servicios_data:
            servicio_id = servicio_info.get('servicio_id')
            cantidad = servicio_info.get('cantidad')
            
            # Validar que el servicio exista
            servicio = Servicio.query.get(servicio_id)
            if not servicio:
                db.session.rollback()
                return jsonify({'message': f'Servicio con ID {servicio_id} no encontrado'}), 404
            
            # Crear la asociación
            plan_servicio = PlanServicio(
                plan_id=plan_id,
                servicio_id=servicio_id,
                cantidad=cantidad
            )
            db.session.add(plan_servicio)
        
        db.session.commit()
        
        # Obtener servicios actualizados con cantidades
        plan_servicios = PlanServicio.query.filter_by(plan_id=plan_id).all()
        servicios_response = []
        for ps in plan_servicios:
            servicio_dict = ps.servicio.to_dict()
            servicio_dict['cantidad'] = ps.cantidad
            servicios_response.append(servicio_dict)
        
        return jsonify({
            'message': f'Se asociaron {len(servicios_response)} servicio(s) al plan "{plan.nombre}"',
            'plan': plan.to_dict(),
            'servicios': servicios_response
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
    
    Body (opcional): {
        cantidad: 10  // Cantidad límite para este servicio
    }
    """
    try:
        from models.servicio import PlanServicio
        
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        # Verificar si ya está asociado
        existe = PlanServicio.query.filter_by(plan_id=plan_id, servicio_id=servicio_id).first()
        if existe:
            return jsonify({'message': 'El servicio ya está asociado a este plan'}), 409
        
        # Obtener cantidad del body (opcional)
        data = request.get_json() or {}
        cantidad = data.get('cantidad')
        
        # Crear la asociación
        plan_servicio = PlanServicio(
            plan_id=plan_id,
            servicio_id=servicio_id,
            cantidad=cantidad
        )
        db.session.add(plan_servicio)
        db.session.commit()
        
        # Obtener servicios actualizados
        plan_servicios = PlanServicio.query.filter_by(plan_id=plan_id).all()
        servicios_response = []
        for ps in plan_servicios:
            servicio_dict = ps.servicio.to_dict()
            servicio_dict['cantidad'] = ps.cantidad
            servicios_response.append(servicio_dict)
        
        return jsonify({
            'message': f'Servicio "{servicio.nombre}" agregado al plan "{plan.nombre}"',
            'plan': plan.to_dict(),
            'servicios': servicios_response
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
        from models.servicio import PlanServicio
        
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        # Verificar si está asociado
        plan_servicio = PlanServicio.query.filter_by(plan_id=plan_id, servicio_id=servicio_id).first()
        if not plan_servicio:
            return jsonify({'message': 'El servicio no está asociado a este plan'}), 404
        
        # Eliminar la asociación
        db.session.delete(plan_servicio)
        db.session.commit()
        
        # Obtener servicios restantes
        plan_servicios = PlanServicio.query.filter_by(plan_id=plan_id).all()
        servicios_response = []
        for ps in plan_servicios:
            servicio_dict = ps.servicio.to_dict()
            servicio_dict['cantidad'] = ps.cantidad
            servicios_response.append(servicio_dict)
        
        return jsonify({
            'message': f'Servicio "{servicio.nombre}" eliminado del plan "{plan.nombre}"',
            'plan': plan.to_dict(),
            'servicios': servicios_response
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar servicio: {str(e)}'}), 500


@admin_plan_servicios_bp.route('/planes/<int:plan_id>/servicios/<int:servicio_id>', methods=['PUT'])
@admin_required
def actualizar_cantidad_servicio_plan(plan_id, servicio_id):
    """
    PUT /admin/planes/:plan_id/servicios/:servicio_id
    Actualiza la cantidad de un servicio específico en un plan
    
    Body: {
        cantidad: 15  // Nueva cantidad límite (null para ilimitado)
    }
    """
    try:
        from models.servicio import PlanServicio
        
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        servicio = Servicio.query.get(servicio_id)
        if not servicio:
            return jsonify({'message': 'Servicio no encontrado'}), 404
        
        # Buscar la asociación
        plan_servicio = PlanServicio.query.filter_by(plan_id=plan_id, servicio_id=servicio_id).first()
        if not plan_servicio:
            return jsonify({'message': 'El servicio no está asociado a este plan'}), 404
        
        # Actualizar cantidad
        data = request.get_json()
        if 'cantidad' not in data:
            return jsonify({'message': 'El campo "cantidad" es requerido'}), 400
        
        plan_servicio.cantidad = data.get('cantidad')
        db.session.commit()
        
        # Obtener servicio actualizado
        servicio_dict = servicio.to_dict()
        servicio_dict['cantidad'] = plan_servicio.cantidad
        
        return jsonify({
            'message': f'Cantidad actualizada para el servicio "{servicio.nombre}"',
            'plan': plan.to_dict(),
            'servicio': servicio_dict
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar cantidad: {str(e)}'}), 500


@admin_plan_servicios_bp.route('/planes-servicios/resumen', methods=['GET'])
@admin_required
def resumen_planes_servicios():
    """
    GET /admin/planes-servicios/resumen
    Obtiene un resumen de todos los planes con sus servicios asociados y cantidades
    """
    try:
        from models.servicio import PlanServicio
        
        planes = Plan.query.all()
        
        resultado = []
        for plan in planes:
            plan_dict = plan.to_dict()
            
            # Obtener servicios con cantidades
            plan_servicios = PlanServicio.query.filter_by(plan_id=plan.id).all()
            servicios_con_cantidad = []
            for ps in plan_servicios:
                servicio_dict = ps.servicio.to_dict()
                servicio_dict['cantidad'] = ps.cantidad
                servicios_con_cantidad.append(servicio_dict)
            
            plan_dict['servicios'] = servicios_con_cantidad
            plan_dict['total_servicios'] = len(servicios_con_cantidad)
            resultado.append(plan_dict)
        
        return jsonify(resultado), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al obtener resumen: {str(e)}'}), 500
