from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime
#Models
from models.suscripcion import Suscripcion
from models.servicio import Servicio
from models.plan import Plan
from models.empresa import Empresa
from models.servicio import PlanServicio
from models.api_key import ApiKey, get_colombia_now
#Utils
from utils.logger import Logger
from utils.log import AppLogger, LogCategory
from utils.api_key_crypto import verificar_api_key
from database.db import db
from functools import wraps
import traceback
import os

api_bp = Blueprint('api', __name__)

# Decorador para validar API Key desde base de datos
def require_api_key():
    """
    Decorador para validar API Key.
    Recibe el codigo (scope) desde el header X-Code-API enviado por el cliente.
    
    Requiere headers:
    - X-API-Key: API key en texto plano
    - X-Empresa-Id: ID de la empresa
    - X-Code-API: Código del scope ('licencias', 'soporte', 'facturacion', 'general')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            api_key = request.headers.get('X-API-Key')
            empresa_id_header = request.headers.get('X-Empresa-Id')
            codigo_requerido = request.headers.get('X-Code-API')
            
            if not api_key:
                AppLogger.warning(
                    LogCategory.API,
                    'Intento de acceso sin X-API-Key',
                    ip=request.remote_addr,
                    endpoint=request.endpoint
                )
                return jsonify({'message': 'X-API-Key header requerido', 'error': 'missing_api_key'}), 401
            
            if not empresa_id_header:
                AppLogger.warning(
                    LogCategory.API,
                    'Intento de acceso sin X-Empresa-Id',
                    ip=request.remote_addr,
                    endpoint=request.endpoint
                )
                return jsonify({'message': 'X-Empresa-Id header requerido', 'error': 'missing_empresa_id'}), 401
            
            if not codigo_requerido:
                AppLogger.warning(
                    LogCategory.API,
                    'Intento de acceso sin X-Code-API',
                    ip=request.remote_addr,
                    endpoint=request.endpoint
                )
                return jsonify({'message': 'X-Code-API header requerido', 'error': 'missing_codigo_key'}), 401
            
            # Validar formato de empresa_id
            try:
                empresa_id = int(empresa_id_header)
            except ValueError:
                AppLogger.warning(
                    LogCategory.API,
                    'X-Empresa-Id inválido (no numérico)',
                    empresa_id_header=empresa_id_header,
                    ip=request.remote_addr
                )
                return jsonify({'message': 'X-Empresa-Id debe ser numérico', 'error': 'invalid_empresa_id'}), 400
            
            # Buscar API keys activas de la empresa con el código específico
            api_keys = ApiKey.query.filter_by(
                empresa_id=empresa_id,
                codigo=codigo_requerido,
                activo=True
            ).all()
            
            if not api_keys:
                AppLogger.warning(
                    LogCategory.API,
                    f'Empresa sin API keys activas para código {codigo_requerido}',
                    empresa_id=empresa_id,
                    codigo_requerido=codigo_requerido,
                    ip=request.remote_addr
                )
                return jsonify({'message': f'No hay API keys activas para el scope "{codigo_requerido}"', 'error': 'no_active_keys'}), 403
            
            # Verificar si alguna API key coincide
            api_key_valida = None
            for key_record in api_keys:
                # Verificar expiración
                if key_record.esta_expirada():
                    continue
                
                # Verificar hash
                if verificar_api_key(api_key, key_record.api_key_hash):
                    api_key_valida = key_record
                    break
            
            if not api_key_valida:
                AppLogger.warning(
                    LogCategory.API,
                    'API Key inválida o expirada',
                    empresa_id=empresa_id,
                    codigo_requerido=codigo_requerido,
                    ip=request.remote_addr,
                    endpoint=request.endpoint,
                    api_key_prefix=api_key[:8] if len(api_key) >= 8 else 'corta'
                )
                return jsonify({'message': 'API Key inválida o expirada', 'error': 'invalid_api_key'}), 403
            
            # Actualizar último uso con hora de Colombia
            try:
                api_key_valida.ultimo_uso = get_colombia_now()
                db.session.commit()
            except Exception as e:
                AppLogger.error(
                    LogCategory.API,
                    'Error al actualizar ultimo_uso de API key',
                    api_key_id=api_key_valida.id,
                    exc=e
                )
                # No bloqueamos el request por esto
            
            # Guardar contexto para uso posterior
            request.api_key_id = api_key_valida.id
            request.empresa_id = empresa_id
            request.api_key_codigo = api_key_valida.codigo
            
            AppLogger.info(
                LogCategory.API,
                'Acceso autorizado con API Key',
                empresa_id=empresa_id,
                api_key_id=api_key_valida.id,
                api_key_nombre=api_key_valida.nombre,
                api_key_codigo=api_key_valida.codigo,
                endpoint=request.endpoint,
                ip=request.remote_addr
            )
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@api_bp.get('/planes')
def obtener_planes():
    try:
        AppLogger.info(
            LogCategory.API,
            'Consulta de planes disponibles',
            ip=request.remote_addr
        )
        planes = Plan.query.all()
        AppLogger.info(
            LogCategory.API,
            'Planes obtenidos exitosamente',
            total_planes=len(planes)
        )
        return jsonify([{
            **plan.to_dict(),
            'servicios': [s.to_dict() for s in plan.servicios]
        } for plan in planes])
    except Exception as ex:
        AppLogger.error(
            LogCategory.API,
            'Error al obtener planes',
            exc=ex
        )
        return jsonify({'message': 'Error al obtener planes'}), 500

@api_bp.post('/verificar-licencia')
@jwt_required()
def verificar_licencia():
    claims = get_jwt()
    empresa_id = claims.get('empresa_id')
    if not empresa_id:
        return jsonify({'message': 'No asociado a una empresa'}), 400
    # Para demo, retornamos ok
    return jsonify({'empresa_id': empresa_id, 'licencia_valida': True})

@api_bp.post('/verificar-servicios-activos')
def verificar_servicios_activos():
    data = request.get_json() or {}
    empresa_id = data.get('empresa_id')
    
    if not empresa_id:
        AppLogger.warning(
            LogCategory.API,
            'Intento de verificar servicios sin empresa_id',
            ip=request.remote_addr
        )
        return jsonify({'message': 'empresa_id es requerido'}), 400

    AppLogger.info(
        LogCategory.API,
        'Verificando servicios activos',
        empresa_id=empresa_id
    )
    
    suscripciones = Suscripcion.query.filter_by(empresa_id=empresa_id, estado='activa').all()
    servicios_ids = [s.servicio_id for s in suscripciones]
    servicios = Servicio.query.filter(Servicio.id.in_(servicios_ids)).all() if servicios_ids else []

    AppLogger.info(
        LogCategory.API,
        'Servicios activos verificados',
        empresa_id=empresa_id,
        total_servicios=len(servicios)
    )
    
    return jsonify({'empresa_id': empresa_id, 'servicios_habilitados': [s.to_dict() for s in servicios]})


@api_bp.get('/suscripcion-activa/<string:nit>')
@require_api_key()
def obtener_suscripcion_activa(nit):
    """
    Endpoint seguro para consultar la suscripción activa de una empresa por su NIT.
    Requiere autenticación mediante X-API-Key en el header.
    
    Retorna:
    - Información de la empresa
    - Suscripción activa (si existe)
    - Plan asociado con sus detalles
    - Servicios incluidos en el plan
    
    Uso:
    GET /api/suscripcion-activa/{nit}
    Headers:
        X-API-Key: tu-api-key-secreta
    
    Ejemplo:
    GET /api/suscripcion-activa/80030148752-vxT21.Ad
    """
    try:
        AppLogger.info(
            LogCategory.API,
            'Consulta de suscripción activa por NIT',
            nit=nit,
            ip=request.remote_addr
        )
        
        # Validar que la empresa exista por NIT
        empresa = Empresa.query.filter_by(nit=nit).first()
        if not empresa:
            AppLogger.warning(
                LogCategory.API,
                'Consulta de suscripción para empresa con NIT inexistente',
                nit=nit,
                ip=request.remote_addr
            )
            return jsonify({
                'message': 'Empresa no encontrada con el NIT proporcionado',
                'error': 'empresa_not_found',
                'nit': nit
            }), 404
        
        # Buscar suscripción activa
        suscripcion = Suscripcion.query.filter_by(
            empresa_id=empresa.id,
            estado='activa'
        ).first()
        
        if not suscripcion:
            AppLogger.info(
                LogCategory.API,
                'Empresa sin suscripción activa',
                empresa_id=empresa.id,
                empresa_nombre=empresa.nombre,
                nit=nit
            )
            return jsonify({
                'empresa': empresa.to_dict(),
                'suscripcion': None,
                'plan': None,
                'servicios': [],
                'tiene_suscripcion_activa': False,
                'message': 'La empresa no tiene una suscripción activa'
            }), 200
        
        # Obtener el plan asociado
        plan = suscripcion.plan
        if not plan:
            AppLogger.error(
                LogCategory.API,
                'Suscripción sin plan asociado',
                suscripcion_id=suscripcion.id,
                empresa_id=empresa.id
            )
            return jsonify({
                'message': 'Error en la configuración de la suscripción',
                'error': 'plan_not_found'
            }), 500
        

        plan_servicios = PlanServicio.query.filter_by(plan_id=plan.id).all()
        servicios = []
        for ps in plan_servicios:
            if ps.servicio.activo:  # Solo servicios activos
                servicio_dict = ps.servicio.to_dict()
                servicio_dict['cantidad'] = ps.cantidad
                servicios.append(servicio_dict)
        
        # Construir respuesta completa
        response_data = {
            'empresa': empresa.to_dict(),
            'suscripcion': {
                'id': suscripcion.id,
                'fecha_inicio': suscripcion.fecha_inicio.isoformat() if suscripcion.fecha_inicio else None,
                'fecha_fin': suscripcion.fecha_fin.isoformat() if suscripcion.fecha_fin else None,
                'estado': suscripcion.estado,
                'forma_pago': suscripcion.forma_pago,
                'periodo': suscripcion.periodo,
                'precio_pagado': suscripcion.precio_pagado,
                'creado_en': suscripcion.creado_en.isoformat() if suscripcion.creado_en else None
            },
            'plan': plan.to_dict(),
            'servicios': servicios,
            'tiene_suscripcion_activa': True,
            'total_servicios': len(servicios)
        }
        
        AppLogger.info(
            LogCategory.API,
            'Consulta de suscripción exitosa',
            empresa_id=empresa.id,
            empresa_nombre=empresa.nombre,
            nit=nit,
            plan_id=plan.id,
            plan_nombre=plan.nombre,
            total_servicios=len(servicios)
        )
        return jsonify(response_data), 200
        
    except Exception as ex:
        AppLogger.error(
            LogCategory.API,
            'Error al obtener suscripción activa',
            nit=nit,
            exc=ex
        )
        return jsonify({
            'message': 'Error al procesar la solicitud',
            'error': 'internal_server_error'
        }), 500