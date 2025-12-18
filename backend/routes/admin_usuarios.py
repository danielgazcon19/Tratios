"""
Rutas administrativas para gestión de usuarios
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from models.usuario import Usuario
from models.empresa import Empresa
from database.db import db
from datetime import datetime
from functools import wraps
from utils.log import AppLogger, LogCategory

admin_usuarios_bp = Blueprint('admin_usuarios', __name__)

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


@admin_usuarios_bp.route('/usuarios', methods=['GET'])
@admin_required
def listar_usuarios():
    """
    GET /admin/usuarios
    Lista todos los usuarios con paginación y filtros opcionales
    Query params: 
      - page: número de página (default: 1)
      - per_page: elementos por página (default: 10)
      - search: búsqueda por nombre o email
      - rol: filtrar por rol (admin/cliente)
      - estado: filtrar por estado activo/inactivo
    """
    try:
        # Parámetros de paginación
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Filtros opcionales
        search = request.args.get('search', '').strip()
        rol = request.args.get('rol', '').strip()
        estado = request.args.get('estado', '').strip()
        empresa_id = request.args.get('empresa_id', type=int)
        
        # Log de solicitud
        AppLogger.info(
            LogCategory.USUARIOS, 
            "Listar usuarios",
            page=page,
            per_page=per_page,
            search=search,
            rol=rol,
            estado=estado,
            empresa_id=empresa_id
        )
        
        # Construir query base
        query = Usuario.query
        
        # Aplicar filtro de búsqueda
        if search:
            query = query.filter(
                or_(
                    Usuario.nombre.ilike(f'%{search}%'),
                    Usuario.email.ilike(f'%{search}%')
                )
            )
        
        # Aplicar filtro de rol
        if rol:
            query = query.filter(Usuario.rol == rol)
        
        # Aplicar filtro de estado
        if estado:
            is_active = estado.lower() == 'activo'
            query = query.filter(Usuario.is_active == is_active)
        
        # Aplicar filtro de empresa
        if empresa_id:
            query = query.filter(Usuario.empresa_id == empresa_id)
        
        # Ordenar por fecha de creación descendente
        query = query.order_by(Usuario.creado_en.desc())
        
        # Paginar resultados
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        AppLogger.info(
            LogCategory.USUARIOS, 
            "Consulta finalizada",
            total_resultados=pagination.total,
            pagina=page,
            total_paginas=pagination.pages
        )
        
        # Serializar usuarios con información de empresa si la tienen
        usuarios_data = []
        for usuario in pagination.items:
            usuario_dict = usuario.to_dict()
            
            # Agregar información de empresa si tiene
            if usuario.empresa_id:
                empresa = Empresa.query.get(usuario.empresa_id)
                if empresa:
                    usuario_dict['empresa'] = {
                        'id': empresa.id,
                        'nombre': empresa.nombre,
                        'nit': empresa.nit
                    }
            
            usuarios_data.append(usuario_dict)
        
        return jsonify({
            'usuarios': usuarios_data,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        }), 200
    
    except Exception as e:
        AppLogger.error(LogCategory.USUARIOS, f"Error al listar usuarios", exc=e)
        return jsonify({'message': f'Error al listar usuarios: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios/<int:usuario_id>', methods=['GET'])
@admin_required
def obtener_usuario(usuario_id):
    """
    GET /admin/usuarios/:id
    Obtiene los detalles de un usuario específico
    """
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        usuario_dict = usuario.to_dict()
        
        # Agregar información de empresa si tiene
        if usuario.empresa_id:
            empresa = Empresa.query.get(usuario.empresa_id)
            if empresa:
                usuario_dict['empresa'] = {
                    'id': empresa.id,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit
                }
        
        return jsonify(usuario_dict), 200
    
    except Exception as e:
        AppLogger.error(LogCategory.USUARIOS, f"Error al obtener usuario", exc=e, usuario_id=usuario_id)
        return jsonify({'message': f'Error al obtener usuario: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios', methods=['POST'])
@admin_required
def crear_usuario():
    """
    POST /admin/usuarios
    Crea un nuevo usuario
    
    Body: {
        nombre: string (requerido),
        email: string (requerido),
        password: string (requerido),
        rol: 'admin' | 'cliente' (requerido),
        empresa_id?: int (opcional),
        telefono?: string,
        direccion?: string,
        ciudad?: string,
        pais?: string
    }
    """
    try:
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Validaciones
        if not data.get('nombre') or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Nombre, email y contraseña son obligatorios'}), 400
        
        if not data.get('rol') or data['rol'] not in ['admin', 'cliente']:
            return jsonify({'message': 'Rol debe ser "admin" o "cliente"'}), 400
        
        # Verificar que el email no esté en uso
        usuario_existente = Usuario.query.filter_by(email=data['email']).first()
        if usuario_existente:
            return jsonify({'message': 'El email ya está en uso'}), 409
        
        # Verificar que la empresa existe si se proporciona
        if data.get('empresa_id'):
            empresa = Empresa.query.get(data['empresa_id'])
            if not empresa:
                return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Crear nuevo usuario
        nuevo_usuario = Usuario(
            nombre=data['nombre'],
            email=data['email'],
            rol=data['rol'],
            empresa_id=data.get('empresa_id'),
            telefono=data.get('telefono'),
            direccion=data.get('direccion'),
            ciudad=data.get('ciudad'),
            pais=data.get('pais'),
            is_active=True
        )
        
        # Establecer contraseña
        nuevo_usuario.set_password(data['password'])
        
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        AppLogger.info(
            LogCategory.USUARIOS, 
            "Usuario creado",
            usuario_id=nuevo_usuario.id,
            email=nuevo_usuario.email,
            rol=nuevo_usuario.rol,
            creado_por=current_user_email
        )
        
        return jsonify({
            'message': 'Usuario creado exitosamente',
            'usuario': nuevo_usuario.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.USUARIOS, "Error al crear usuario", exc=e)
        return jsonify({'message': f'Error al crear usuario: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios/<int:usuario_id>', methods=['PUT'])
@admin_required
def actualizar_usuario(usuario_id):
    """
    PUT /admin/usuarios/:id
    Actualiza los datos de un usuario
    
    Body: {
        nombre?: string,
        email?: string,
        rol?: 'admin' | 'cliente',
        empresa_id?: int,
        telefono?: string,
        direccion?: string,
        ciudad?: string,
        pais?: string
    }
    """
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Actualizar nombre si se proporciona
        if 'nombre' in data and data['nombre']:
            usuario.nombre = data['nombre']
        
        # Actualizar email si se proporciona y no está en uso
        if 'email' in data and data['email']:
            if data['email'] != usuario.email:
                email_existente = Usuario.query.filter_by(email=data['email']).first()
                if email_existente:
                    return jsonify({'message': 'El email ya está en uso'}), 409
                usuario.email = data['email']
        
        # Actualizar rol si se proporciona
        if 'rol' in data:
            if data['rol'] not in ['admin', 'cliente']:
                return jsonify({'message': 'Rol debe ser "admin" o "cliente"'}), 400
            usuario.rol = data['rol']
        
        # Actualizar empresa si se proporciona
        if 'empresa_id' in data:
            if data['empresa_id']:
                empresa = Empresa.query.get(data['empresa_id'])
                if not empresa:
                    return jsonify({'message': 'Empresa no encontrada'}), 404
            usuario.empresa_id = data['empresa_id']
        
        # Actualizar campos opcionales
        if 'telefono' in data:
            usuario.telefono = data['telefono']
        if 'direccion' in data:
            usuario.direccion = data['direccion']
        if 'ciudad' in data:
            usuario.ciudad = data['ciudad']
        if 'pais' in data:
            usuario.pais = data['pais']
        
        db.session.commit()
        
        AppLogger.info(
            LogCategory.USUARIOS, 
            "Usuario actualizado",
            usuario_id=usuario_id,
            actualizado_por=current_user_email
        )
        
        return jsonify({
            'message': 'Usuario actualizado exitosamente',
            'usuario': usuario.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.USUARIOS, "Error al actualizar usuario", exc=e, usuario_id=usuario_id)
        return jsonify({'message': f'Error al actualizar usuario: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios/<int:usuario_id>/cambiar-password', methods=['POST'])
@admin_required
def cambiar_password(usuario_id):
    """
    POST /admin/usuarios/:id/cambiar-password
    Cambia la contraseña de un usuario
    
    Body: {
        nueva_password: string (requerido)
    }
    """
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        data = request.get_json()
        if not data.get('nueva_password'):
            return jsonify({'message': 'La nueva contraseña es obligatoria'}), 400
        
        # Cambiar contraseña
        usuario.set_password(data['nueva_password'])
        db.session.commit()
        
        current_user_email = get_jwt_identity()
        AppLogger.info(
            LogCategory.USUARIOS, 
            "Contraseña cambiada",
            usuario_id=usuario_id,
            cambiado_por=current_user_email
        )
        
        return jsonify({'message': 'Contraseña actualizada exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.USUARIOS, "Error al cambiar contraseña", exc=e, usuario_id=usuario_id)
        return jsonify({'message': f'Error al cambiar contraseña: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios/<int:usuario_id>/toggle-estado', methods=['POST'])
@admin_required
def toggle_estado_usuario(usuario_id):
    """
    POST /admin/usuarios/:id/toggle-estado
    Activa o inactiva un usuario
    """
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        # Obtener usuario actual
        current_user_email = get_jwt_identity()
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        
        # No permitir que un admin se inactiven a sí mismo
        if current_user and current_user.id == usuario_id:
            return jsonify({'message': 'No puedes desactivar tu propia cuenta'}), 400
        
        # Cambiar estado
        usuario.is_active = not usuario.is_active
        db.session.commit()
        
        estado_texto = 'activado' if usuario.is_active else 'inactivado'
        
        AppLogger.info(
            LogCategory.USUARIOS, 
            f"Usuario {estado_texto}",
            usuario_id=usuario_id,
            estado=usuario.is_active,
            cambiado_por=current_user_email
        )
        
        return jsonify({
            'message': f'Usuario {estado_texto} exitosamente',
            'usuario': usuario.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.USUARIOS, "Error al cambiar estado de usuario", exc=e, usuario_id=usuario_id)
        return jsonify({'message': f'Error al cambiar estado: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios/<int:usuario_id>', methods=['DELETE'])
@admin_required
def eliminar_usuario(usuario_id):
    """
    DELETE /admin/usuarios/:id
    Elimina un usuario (eliminación física de la base de datos)
    """
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        # Obtener usuario actual
        current_user_email = get_jwt_identity()
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        
        # No permitir que un admin se elimine a sí mismo
        if current_user and current_user.id == usuario_id:
            return jsonify({'message': 'No puedes eliminar tu propia cuenta'}), 400
        
        # Guardar info para el log antes de eliminar
        usuario_email = usuario.email
        usuario_nombre = usuario.nombre
        
        db.session.delete(usuario)
        db.session.commit()
        
        AppLogger.info(
            LogCategory.USUARIOS, 
            "Usuario eliminado",
            usuario_id=usuario_id,
            email=usuario_email,
            nombre=usuario_nombre,
            eliminado_por=current_user_email
        )
        
        return jsonify({'message': 'Usuario eliminado exitosamente'}), 200
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.USUARIOS, "Error al eliminar usuario", exc=e, usuario_id=usuario_id)
        return jsonify({'message': f'Error al eliminar usuario: {str(e)}'}), 500


@admin_usuarios_bp.route('/usuarios/estadisticas', methods=['GET'])
@admin_required
def estadisticas_usuarios():
    """
    GET /admin/usuarios/estadisticas
    Devuelve estadísticas de usuarios
    """
    try:
        total = Usuario.query.count()
        activos = Usuario.query.filter_by(is_active=True).count()
        inactivos = Usuario.query.filter_by(is_active=False).count()
        admins = Usuario.query.filter_by(rol='admin').count()
        clientes = Usuario.query.filter_by(rol='cliente').count()
        
        # Usuarios con 2FA habilitado
        con_2fa = Usuario.query.filter_by(otp_enabled=True).count()
        
        return jsonify({
            'total': total,
            'activos': activos,
            'inactivos': inactivos,
            'admins': admins,
            'clientes': clientes,
            'con_2fa': con_2fa
        }), 200
    
    except Exception as e:
        AppLogger.error(LogCategory.USUARIOS, "Error al obtener estadísticas", exc=e)
        return jsonify({'message': f'Error al obtener estadísticas: {str(e)}'}), 500
