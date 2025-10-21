from flask import Blueprint, request, jsonify
from models.suscripcion import Suscripcion
from models.servicio import Servicio
from models.plan import Plan
from flask_jwt_extended import jwt_required, get_jwt
from utils.logger import Logger
import traceback

api_bp = Blueprint('api', __name__)

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