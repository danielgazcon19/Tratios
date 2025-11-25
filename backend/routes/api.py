from flask import Blueprint, request, jsonify, current_app
from models.suscripcion import Suscripcion
from models.servicio import Servicio
from models.plan import Plan
from models.empresa import Empresa
from models.servicio import PlanServicio
from flask_jwt_extended import jwt_required, get_jwt
from utils.logger import Logger
from functools import wraps
import traceback
import os

api_bp = Blueprint('api', __name__)

# Decorador para validar API Key
def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            Logger.add_to_log('warning', 'Intento de acceso sin API Key')
            return jsonify({'message': 'API Key requerida', 'error': 'missing_api_key'}), 401
        
        # Obtener la API Key configurada en el entorno
        valid_api_key = current_app.config.get('SAAS_API_KEY') or os.environ.get('SAAS_API_KEY')
        
        if not valid_api_key:
            Logger.add_to_log('error', 'API Key no configurada en el servidor')
            return jsonify({'message': 'Configuración de servidor incorrecta', 'error': 'server_config_error'}), 500
        
        if api_key != valid_api_key:
            Logger.add_to_log('warning', f'Intento de acceso con API Key inválida')
            return jsonify({'message': 'API Key inválida', 'error': 'invalid_api_key'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

@api_bp.get('/planes')
def obtener_planes():
    try:
        planes = Plan.query.all()
        return jsonify([{
            **plan.to_dict(),
            'servicios': [s.to_dict() for s in plan.servicios]
        } for plan in planes])
    except Exception as ex:
        print(traceback.format_exc())
        print(ex)
        Logger.add_to_log('error', f'Error al obtener planes: {ex}')
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
        return jsonify({'message': 'empresa_id es requerido'}), 400

    suscripciones = Suscripcion.query.filter_by(empresa_id=empresa_id, estado='activa').all()
    servicios_ids = [s.servicio_id for s in suscripciones]
    servicios = Servicio.query.filter(Servicio.id.in_(servicios_ids)).all() if servicios_ids else []

    return jsonify({'empresa_id': empresa_id, 'servicios_habilitados': [s.to_dict() for s in servicios]})


@api_bp.get('/suscripcion-activa/<string:nit>')
@require_api_key
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
        # Validar que la empresa exista por NIT
        empresa = Empresa.query.filter_by(nit=nit).first()
        if not empresa:
            Logger.add_to_log('warning', f'Consulta de suscripción para empresa con NIT inexistente: {nit}')
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
            Logger.add_to_log('info', f'Empresa {empresa.nombre} (NIT: {nit}) sin suscripción activa')
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
            Logger.add_to_log('error', f'Suscripción {suscripcion.id} sin plan asociado')
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
        
        Logger.add_to_log('info', f'Consulta exitosa de suscripción para empresa {empresa.nombre} (NIT: {nit})')
        return jsonify(response_data), 200
        
    except Exception as ex:
        error_trace = traceback.format_exc()
        print(error_trace)
        Logger.add_to_log('error', f'Error al obtener suscripción activa para empresa NIT {nit}: {ex}')
        return jsonify({
            'message': 'Error al procesar la solicitud',
            'error': 'internal_server_error'
        }), 500