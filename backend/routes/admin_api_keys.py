"""
Endpoints de administración para gestión de API Keys

Solo accesible por usuarios con rol 'admin'.
Permite crear, listar, activar/desactivar y eliminar API keys de empresas.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime, timedelta
from database.db import db
from models.api_key import ApiKey
from models.empresa import Empresa
from utils.api_key_crypto import generar_api_key_con_hash
from utils.log import AppLogger, LogCategory

admin_api_keys_bp = Blueprint('admin_api_keys', __name__, url_prefix='/admin/api-keys')


def require_admin(fn):
    """Decorador para validar que el usuario es admin"""
    from functools import wraps
    
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('rol') != 'admin':
            AppLogger.warning(
                LogCategory.AUTH,
                'Intento de acceso no autorizado a admin API keys',
                usuario_id=claims.get('usuario_id'),
                rol=claims.get('rol')
            )
            return jsonify({'message': 'Acceso denegado - Solo administradores'}), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_api_keys_bp.get('')
@require_admin
def listar_api_keys():
    """
    GET /admin/api-keys
    Lista todas las API keys con filtros opcionales y paginación
    
    Query params:
    - empresa_id: filtrar por empresa
    - activo: filtrar por estado (true/false)
    - search: buscar por nombre
    - page: número de página (default: 1)
    - per_page: items por página (default: 20, max: 100)
    """
    try:
        empresa_id = request.args.get('empresa_id', type=int)
        activo = request.args.get('activo')
        search = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Limitar per_page a un máximo razonable
        per_page = min(per_page, 100)
        
        query = ApiKey.query
        
        if empresa_id:
            query = query.filter_by(empresa_id=empresa_id)
        
        if activo is not None:
            activo_bool = activo.lower() in ('true', '1', 'yes')
            query = query.filter_by(activo=activo_bool)
        
        if search:
            query = query.filter(ApiKey.nombre.ilike(f'%{search}%'))
        
        # Obtener total antes de paginar
        total = query.count()
        
        # Aplicar paginación
        api_keys = query.order_by(ApiKey.fecha_creacion.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        AppLogger.info(
            LogCategory.API,
            'Listado de API keys',
            total=total,
            page=page,
            per_page=per_page,
            empresa_id=empresa_id
        )
        
        return jsonify({
            'api_keys': [key.to_dict() for key in api_keys.items],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': api_keys.pages
        }), 200
        
    except Exception as e:
        AppLogger.error(
            LogCategory.API,
            'Error al listar API keys',
            exc=e
        )
        return jsonify({'message': 'Error al listar API keys'}), 500


@admin_api_keys_bp.get('/<int:id>')
@require_admin
def obtener_api_key(id):
    """
    GET /admin/api-keys/{id}
    Obtiene detalles de una API key específica
    """
    try:
        api_key = ApiKey.query.get(id)
        if not api_key:
            return jsonify({'message': 'API Key no encontrada'}), 404
        
        return jsonify(api_key.to_dict()), 200
        
    except Exception as e:
        AppLogger.error(
            LogCategory.API,
            'Error al obtener API key',
            api_key_id=id,
            exc=e
        )
        return jsonify({'message': 'Error al obtener API key'}), 500


@admin_api_keys_bp.post('')
@require_admin
def crear_api_key():
    """
    POST /admin/api-keys
    Crea una nueva API key para una empresa
    
    Body:
    {
        "empresa_id": 1,
        "nombre": "Producción SaaS Principal",
        "codigo": "licencias",  // "licencias", "soporte", "facturacion", etc.
        "dias_expiracion": 365  // opcional, null = sin expiración
    }
    
    Response:
    {
        "message": "API Key creada exitosamente",
        "api_key": {
            "id": 1,
            "empresa_id": 1,
            "nombre": "...",
            "codigo": "licencias",
            ...
        },
        "api_key_plana": "a1b2c3d4e5f6..."  // IMPORTANTE: solo se muestra una vez
    }
    """
    try:
        data = request.get_json()
        
        empresa_id = data.get('empresa_id')
        nombre = data.get('nombre', '').strip()
        codigo = data.get('codigo', '').strip()
        dias_expiracion = data.get('dias_expiracion')
        
        # Validaciones
        if not empresa_id:
            return jsonify({'message': 'empresa_id es requerido'}), 400
        
        if not nombre:
            return jsonify({'message': 'nombre es requerido'}), 400
        
        if not codigo:
            return jsonify({'message': 'codigo es requerido. Opciones: licencias, soporte, facturacion'}), 400
        
        # Validar códigos permitidos
        codigos_validos = ['LICENCIA', 'SOPORTE', 'FACTURACION', 'GENERAL']
        if codigo not in codigos_validos:
            return jsonify({'message': f'codigo debe ser uno de: {", ".join(codigos_validos)}'}), 400
        
        # Validar que la empresa existe
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Generar API key y hash
        api_key_plana, api_key_hash = generar_api_key_con_hash()
        
        # Calcular fecha de expiración
        fecha_expiracion = None
        if dias_expiracion and dias_expiracion > 0:
            fecha_expiracion = datetime.utcnow() + timedelta(days=dias_expiracion)
        
        # Crear registro
        nueva_api_key = ApiKey(
            empresa_id=empresa_id,
            api_key_hash=api_key_hash,
            nombre=nombre,
            codigo=codigo,
            activo=True,
            fecha_expiracion=fecha_expiracion
        )
        
        db.session.add(nueva_api_key)
        db.session.commit()
        
        claims = get_jwt()
        AppLogger.info(
            LogCategory.API,
            'API Key creada',
            api_key_id=nueva_api_key.id,
            empresa_id=empresa_id,
            empresa_nombre=empresa.nombre,
            nombre=nombre,
            creado_por=claims.get('usuario_id'),
            dias_expiracion=dias_expiracion
        )
        
        return jsonify({
            'message': 'API Key creada exitosamente',
            'api_key': nueva_api_key.to_dict(),
            'api_key_plana': api_key_plana,
            'importante': 'Guarde esta API key en un lugar seguro. No se podrá recuperar.'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.API,
            'Error al crear API key',
            exc=e
        )
        return jsonify({'message': 'Error al crear API key'}), 500


@admin_api_keys_bp.put('/<int:id>')
@require_admin
def actualizar_api_key(id):
    """
    PUT /admin/api-keys/{id}
    Actualiza los datos de una API key (nombre, estado, fecha_expiracion)
    
    Body:
    {
        "nombre": "Nuevo nombre",
        "activo": true,
        "dias_expiracion": 180  // null para quitar expiración
    }
    """
    try:
        api_key = ApiKey.query.get(id)
        if not api_key:
            return jsonify({'message': 'API Key no encontrada'}), 404
        
        data = request.get_json()
        
        if 'nombre' in data:
            nombre = data['nombre'].strip()
            if not nombre:
                return jsonify({'message': 'nombre no puede estar vacío'}), 400
            api_key.nombre = nombre
        
        if 'activo' in data:
            api_key.activo = bool(data['activo'])
        
        if 'dias_expiracion' in data:
            dias = data['dias_expiracion']
            if dias is None:
                api_key.fecha_expiracion = None
            elif dias > 0:
                api_key.fecha_expiracion = datetime.utcnow() + timedelta(days=dias)
            else:
                return jsonify({'message': 'dias_expiracion debe ser mayor a 0 o null'}), 400
        
        db.session.commit()
        
        claims = get_jwt()
        AppLogger.info(
            LogCategory.API,
            'API Key actualizada',
            api_key_id=id,
            actualizado_por=claims.get('usuario_id'),
            cambios=data
        )
        
        return jsonify({
            'message': 'API Key actualizada exitosamente',
            'api_key': api_key.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.API,
            'Error al actualizar API key',
            api_key_id=id,
            exc=e
        )
        return jsonify({'message': 'Error al actualizar API key'}), 500


@admin_api_keys_bp.delete('/<int:id>')
@require_admin
def eliminar_api_key(id):
    """
    DELETE /admin/api-keys/{id}
    Elimina una API key (eliminación física)
    """
    try:
        api_key = ApiKey.query.get(id)
        if not api_key:
            return jsonify({'message': 'API Key no encontrada'}), 404
        
        empresa_id = api_key.empresa_id
        nombre = api_key.nombre
        
        db.session.delete(api_key)
        db.session.commit()
        
        claims = get_jwt()
        AppLogger.info(
            LogCategory.API,
            'API Key eliminada',
            api_key_id=id,
            empresa_id=empresa_id,
            nombre=nombre,
            eliminado_por=claims.get('usuario_id')
        )
        
        return jsonify({'message': 'API Key eliminada exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.API,
            'Error al eliminar API key',
            api_key_id=id,
            exc=e
        )
        return jsonify({'message': 'Error al eliminar API key'}), 500


@admin_api_keys_bp.post('/<int:id>/toggle')
@require_admin
def toggle_api_key(id):
    """
    POST /admin/api-keys/{id}/toggle
    Activa/desactiva una API key
    """
    try:
        api_key = ApiKey.query.get(id)
        if not api_key:
            return jsonify({'message': 'API Key no encontrada'}), 404
        
        api_key.activo = not api_key.activo
        db.session.commit()
        
        claims = get_jwt()
        AppLogger.info(
            LogCategory.API,
            f'API Key {"activada" if api_key.activo else "desactivada"}',
            api_key_id=id,
            activo=api_key.activo,
            modificado_por=claims.get('usuario_id')
        )
        
        return jsonify({
            'message': f'API Key {"activada" if api_key.activo else "desactivada"} exitosamente',
            'api_key': api_key.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.API,
            'Error al cambiar estado de API key',
            api_key_id=id,
            exc=e
        )
        return jsonify({'message': 'Error al cambiar estado de API key'}), 500


@admin_api_keys_bp.post('/<int:id>/renovar')
@require_admin
def renovar_api_key(id):
    """
    POST /admin/api-keys/{id}/renovar
    Genera una nueva API key (rota la clave existente)
    
    Body:
    {
        "dias_expiracion": 365  // opcional
    }
    
    Response:
    {
        "message": "API Key renovada exitosamente",
        "api_key": {...},
        "api_key_plana": "nueva_clave..."
    }
    """
    try:
        api_key = ApiKey.query.get(id)
        if not api_key:
            return jsonify({'message': 'API Key no encontrada'}), 404
        
        data = request.get_json() or {}
        
        # Generar nueva clave
        api_key_plana, api_key_hash = generar_api_key_con_hash()
        
        # Actualizar hash
        api_key.api_key_hash = api_key_hash
        
        # Actualizar expiración si se especifica
        dias_expiracion = data.get('dias_expiracion')
        if dias_expiracion is not None:
            if dias_expiracion > 0:
                api_key.fecha_expiracion = datetime.utcnow() + timedelta(days=dias_expiracion)
            else:
                api_key.fecha_expiracion = None
        
        db.session.commit()
        
        claims = get_jwt()
        AppLogger.info(
            LogCategory.API,
            'API Key renovada',
            api_key_id=id,
            renovado_por=claims.get('usuario_id'),
            dias_expiracion=dias_expiracion
        )
        
        return jsonify({
            'message': 'API Key renovada exitosamente',
            'api_key': api_key.to_dict(),
            'api_key_plana': api_key_plana,
            'importante': 'Guarde esta API key en un lugar seguro. La anterior quedó invalidada.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.API,
            'Error al renovar API key',
            api_key_id=id,
            exc=e
        )
        return jsonify({'message': 'Error al renovar API key'}), 500
