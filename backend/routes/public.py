from flask import Blueprint, request, jsonify
from database.db import db
from models.empresa import Empresa
from models.servicio import Servicio
from models.plan import Plan
from models.suscripcion import Suscripcion
from utils.logger import Logger
from utils.location_service import get_location_service
import traceback

public_bp = Blueprint('public', __name__)

@public_bp.get('/planes')
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
        Logger.add_to_log('error', f'Error al obtener planes: {str(ex)}\n{traceback.format_exc()}')
        return jsonify({'message': 'Error al obtener planes'}), 500

# Nuevo: listar servicios públicos (por defecto solo activos)
@public_bp.get('/servicios')
def listar_servicios_public():
    activos_only = request.args.get('activos', '1')
    query = Servicio.query
    if activos_only in ('1', 'true', 'True'):  # por defecto filtra activos
        query = query.filter_by(activo=True)
    servicios = query.order_by(Servicio.nombre.asc()).all()
    return jsonify([s.to_dict() for s in servicios])

# Nuevo: obtener información de empresa por id (pública, devuelve to_dict)
@public_bp.get('/empresas/<int:id>')
def obtener_empresa_public(id):
    empresa = Empresa.query.get_or_404(id)
    return jsonify(empresa.to_dict())

@public_bp.post('/suscripcion')
def crear_suscripcion():
    data = request.get_json()
    empresa_id = data.get('empresa_id')
    servicio_ids = data.get('servicio_ids', [])

    if not empresa_id or not servicio_ids:
        return jsonify({'message': 'empresa_id y servicio_ids son requeridos'}), 400

    empresa = Empresa.query.get(empresa_id)
    if not empresa:
        return jsonify({'message': 'Empresa no encontrada'}), 404

    creadas = []
    for sid in servicio_ids:
        if not Servicio.query.get(sid):
            continue
        existente = Suscripcion.query.filter_by(empresa_id=empresa_id, servicio_id=sid).first()
        if existente:
            creadas.append(existente)
            continue
        sus = Suscripcion(empresa_id=empresa_id, servicio_id=sid)
        db.session.add(sus)
        creadas.append(sus)
    db.session.commit()

    return jsonify({'message': 'Suscripción creada', 'suscripciones': [s.to_dict() for s in creadas]}), 201


@public_bp.get('/location/countries')
def obtener_paises():
    service = get_location_service()
    query = request.args.get('q', type=str)
    requested_limit = request.args.get('limit', type=int)
    safe_limit = max(1, min(requested_limit or 20, 50))

    try:
        if query:
            countries = service.search_countries(query, limit=safe_limit)
        else:
            countries = service.get_countries()
        return jsonify({'countries': countries})
    except Exception as ex:  # noqa: BLE001
        Logger.add_to_log('error', f'Error al procesar países: {str(ex)}\n{traceback.format_exc()}')
        return jsonify({'message': 'No pudimos obtener el catálogo de países en este momento.'}), 500


@public_bp.get('/location/countries/<string:country_code>/cities')
def obtener_ciudades(country_code: str):
    service = get_location_service()
    try:
        cities = service.get_cities(country_code)
        return jsonify({'cities': cities, 'country_code': country_code.upper()})
    except Exception as ex:  # noqa: BLE001
        Logger.add_to_log('error', f'Error al obtener ciudades de {country_code}: {str(ex)}\n{traceback.format_exc()}')
        return jsonify({'message': f'No pudimos obtener ciudades para {country_code}.'}), 500