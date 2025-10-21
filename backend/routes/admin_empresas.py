"""
Rutas administrativas para gestión de empresas
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.usuario import Usuario
from models.empresa import Empresa
from models.plan import Plan
from models.suscripcion import Suscripcion
from database.db import db
from functools import wraps

admin_empresas_bp = Blueprint('admin_empresas', __name__)

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


@admin_empresas_bp.route('/empresas', methods=['GET'])
@admin_required
def listar_empresas():
    """
    GET /admin/empresas
    Lista todas las empresas con sus datos básicos y suscripción actual
    """
    try:
        empresas = Empresa.query.all()
        
        resultado = []
        for empresa in empresas:
            # Buscar suscripción activa
            suscripcion_activa = Suscripcion.query.filter_by(
                empresa_id=empresa.id,
                estado='activa'
            ).first()
            
            empresa_dict = empresa.to_dict()
            empresa_dict['suscripcion_activa'] = suscripcion_activa.to_dict() if suscripcion_activa else None
            resultado.append(empresa_dict)
        
        return jsonify(resultado), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al listar empresas: {str(e)}'}), 500


@admin_empresas_bp.route('/empresas/<int:empresa_id>', methods=['GET'])
@admin_required
def obtener_empresa(empresa_id):
    """
    GET /admin/empresas/:id
    Obtiene una empresa específica con todo su historial de suscripciones
    """
    try:
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Obtener todas las suscripciones de la empresa
        suscripciones = Suscripcion.query.filter_by(empresa_id=empresa.id).order_by(Suscripcion.creado_en.desc()).all()
        
        resultado = empresa.to_dict()
        resultado['suscripciones'] = [s.to_dict() for s in suscripciones]
        
        return jsonify(resultado), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al obtener empresa: {str(e)}'}), 500


@admin_empresas_bp.route('/empresas', methods=['POST'])
@admin_required
def crear_empresa():
    """
    POST /admin/empresas
    Crea una nueva empresa
    Body: { nombre, nit, contacto, plan_id? (opcional para crear con suscripción) }
    """
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('nombre') or not data.get('nit'):
            return jsonify({'message': 'Nombre y NIT son obligatorios'}), 400
        
        # Verificar que no exista empresa con mismo NIT
        empresa_existente = Empresa.query.filter_by(nit=data['nit']).first()
        if empresa_existente:
            return jsonify({'message': 'Ya existe una empresa con ese NIT'}), 409
        
        # Crear empresa
        nueva_empresa = Empresa(
            nombre=data['nombre'],
            nit=data['nit'],
            contacto=data.get('contacto', ''),
            plan=data.get('plan', 'basico'),  # Plan por defecto 'basico' si no se especifica
            estado=True  # Activa por defecto
        )
        
        db.session.add(nueva_empresa)
        db.session.commit()
        
        # Si se especificó un plan, crear suscripción
        if data.get('plan_id'):
            plan = Plan.query.get(data['plan_id'])
            if not plan:
                return jsonify({'message': 'Plan no encontrado'}), 404
            
            current_user_id = get_jwt_identity()
            
            from datetime import datetime, timedelta
            nueva_suscripcion = Suscripcion(
                empresa_id=nueva_empresa.id,
                plan_id=plan.id,
                fecha_inicio=datetime.utcnow(),
                fecha_fin=datetime.utcnow() + timedelta(days=30),  # 1 mes por defecto
                estado='activa',
                periodo=data.get('periodo', 'mensual'),
                precio_pagado=plan.precio_mensual if data.get('periodo') == 'mensual' else plan.precio_anual,
                creado_por=current_user_id,
                notas=data.get('notas')
            )
            
            db.session.add(nueva_suscripcion)
            db.session.commit()
        
        return jsonify({
            'message': 'Empresa creada exitosamente',
            'empresa': nueva_empresa.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al crear empresa: {str(e)}'}), 500


@admin_empresas_bp.route('/empresas/<int:empresa_id>', methods=['PUT'])
@admin_required
def actualizar_empresa(empresa_id):
    """
    PUT /admin/empresas/:id
    Actualiza los datos de una empresa
    Body: { nombre?, nit?, contacto?, estado? }
    """
    try:
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        data = request.get_json()
        
        # Actualizar campos permitidos
        if 'nombre' in data:
            empresa.nombre = data['nombre']
        if 'nit' in data:
            # Verificar que no exista otra empresa con ese NIT
            empresa_existente = Empresa.query.filter_by(nit=data['nit']).filter(Empresa.id != empresa_id).first()
            if empresa_existente:
                return jsonify({'message': 'Ya existe una empresa con ese NIT'}), 409
            empresa.nit = data['nit']
        if 'contacto' in data:
            empresa.contacto = data['contacto']
        if 'estado' in data:
            empresa.estado = bool(data['estado'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Empresa actualizada exitosamente',
            'empresa': empresa.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar empresa: {str(e)}'}), 500


@admin_empresas_bp.route('/empresas/<int:empresa_id>', methods=['DELETE'])
@admin_required
def eliminar_empresa(empresa_id):
    """
    DELETE /admin/empresas/:id
    Elimina una empresa (soft delete - solo desactiva)
    """
    try:
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Verificar si tiene usuarios asociados
        if empresa.usuarios and len(empresa.usuarios) > 0:
            return jsonify({
                'message': 'No se puede eliminar una empresa con usuarios asociados. Primero elimine o reasigne los usuarios.'
            }), 409
        
        # Soft delete: solo cambiar estado a False
        empresa.estado = False
        
        # Cancelar todas las suscripciones activas
        suscripciones_activas = Suscripcion.query.filter_by(empresa_id=empresa.id, estado='activa').all()
        for suscripcion in suscripciones_activas:
            suscripcion.estado = 'cancelada'
            suscripcion.motivo_cancelacion = 'Empresa desactivada por administrador'
        
        db.session.commit()
        
        return jsonify({'message': 'Empresa desactivada exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al eliminar empresa: {str(e)}'}), 500


@admin_empresas_bp.route('/empresas/<int:empresa_id>/activar', methods=['POST'])
@admin_required
def activar_empresa(empresa_id):
    """
    POST /admin/empresas/:id/activar
    Activa una empresa previamente desactivada
    """
    try:
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        if empresa.estado:
            return jsonify({'message': 'La empresa ya está activa'}), 400
        
        # Activar empresa
        empresa.estado = True
        db.session.commit()
        
        return jsonify({'message': 'Empresa activada exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al activar empresa: {str(e)}'}), 500
