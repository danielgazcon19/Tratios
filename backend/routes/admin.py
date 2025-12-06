from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
import secrets
import string
from app import db
from models.empresa import Empresa
from models.servicio import Servicio
from models.suscripcion import Suscripcion
from models.usuario import Usuario

admin_bp = Blueprint('admin', __name__)


def require_roles(*roles):
    def wrapper(fn):
        def decorated(*args, **kwargs):
            claims = get_jwt()
            if claims.get('rol') not in roles:
                return jsonify({'message': 'No autorizado'}), 403
            return fn(*args, **kwargs)
        decorated.__name__ = fn.__name__
        return decorated
    return wrapper

@admin_bp.get('/empresa/<int:id>')
@jwt_required()
def obtener_empresa(id):
    empresa = Empresa.query.get_or_404(id)
    return jsonify(empresa.to_dict())

@admin_bp.get('/servicios')
@jwt_required()
def listar_servicios():
    servicios = Servicio.query.all()
    return jsonify([s.to_dict() for s in servicios])

# ⚠️ RUTA MOVIDA A admin_suscripciones.py - No eliminar este comentario
# Esta ruta fue reemplazada por el módulo admin_suscripciones.py que tiene
# funcionalidad completa con filtros, paginación y operaciones CRUD
# @admin_bp.get('/suscripciones')
# @jwt_required()
# def listar_suscripciones():
#     suscripciones = Suscripcion.query.all()
#     return jsonify([s.to_dict() for s in suscripciones])

@admin_bp.put('/suscripcion/<int:id>')
@jwt_required()
@require_roles('admin')
def actualizar_suscripcion(id):
    sus = Suscripcion.query.get_or_404(id)
    data = request.get_json()
    sus.estado = data.get('estado', sus.estado)
    db.session.commit()
    return jsonify({'message': 'Actualizada', 'suscripcion': sus.to_dict()})


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"  # ensure complexity
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@admin_bp.post('/empresa/transfer')
@jwt_required()
@require_roles('admin')
def transferir_empresa():
    data = request.get_json() or {}
    empresa_codigo = (data.get('empresa_codigo') or '').strip()
    nuevo_email = (data.get('nuevo_email') or '').strip().lower()
    nuevo_nombre = (data.get('nuevo_nombre') or '').strip()
    nuevo_password = data.get('nuevo_password')
    desactivar_anterior = bool(data.get('desactivar_anterior', False))

    if not empresa_codigo:
        return jsonify({'message': 'Debes indicar el identificador (NIT) de la empresa.'}), 400
    if not nuevo_email:
        return jsonify({'message': 'Debes indicar el correo electrónico del nuevo titular.'}), 400
    if '@' not in nuevo_email:
        return jsonify({'message': 'El correo electrónico indicado no es válido.'}), 400

    empresa = Empresa.query.filter_by(nit=empresa_codigo).first()
    if not empresa:
        return jsonify({'message': 'No se encontró la empresa indicada.'}), 404

    propietario_actual = Usuario.query.filter_by(empresa_id=empresa.id).first()

    nuevo_usuario = Usuario.query.filter_by(email=nuevo_email).first()

    temp_password = None
    if nuevo_usuario:
        if nuevo_usuario.empresa_id and nuevo_usuario.empresa_id != empresa.id:
            return jsonify({'message': 'El usuario indicado ya está asociado a otra empresa.'}), 409
    else:
        if not nuevo_password:
            temp_password = _generate_temp_password()
            nuevo_password = temp_password
        if not nuevo_nombre:
            nuevo_nombre = nuevo_email.split('@')[0]

        nuevo_usuario = Usuario(
            nombre=nuevo_nombre,
            email=nuevo_email,
            rol='cliente',
            empresa_id=None,
            is_active=True
        )
        nuevo_usuario.set_password(nuevo_password)
        db.session.add(nuevo_usuario)
        db.session.flush()

    if nuevo_usuario.id == getattr(propietario_actual, 'id', None):
        return jsonify({'message': 'El usuario indicado ya es el titular de la empresa.'}), 200

    if propietario_actual:
        propietario_actual.empresa_id = None
        if desactivar_anterior:
            propietario_actual.is_active = False
            propietario_actual.disable_otp()

    nuevo_usuario.empresa_id = empresa.id
    nuevo_usuario.is_active = True

    db.session.commit()

    respuesta = {
        'message': 'Transferencia realizada correctamente',
        'empresa': empresa.to_dict(),
        'nuevo_usuario': nuevo_usuario.to_dict()
    }

    if propietario_actual:
        respuesta['anterior_usuario'] = propietario_actual.to_dict()

    if temp_password:
        respuesta['temp_password'] = temp_password

    return jsonify(respuesta), 200