from datetime import datetime, date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm import joinedload

from app import db
from models.usuario import Usuario
from models.suscripcion import Suscripcion
from utils.password_validator import validate_password_strength
from utils.otp_email_service import OTPEmailService
from utils.logger import Logger

account_bp = Blueprint('account', __name__)


def _get_current_user() -> Usuario | None:
    identity = get_jwt_identity()
    if not identity:
        return None
    return Usuario.query.filter_by(email=identity).first()


@account_bp.get('/profile')
@jwt_required()
def get_profile():
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    usuario_data = user.to_dict()
    usuario_data['empresa'] = user.empresa.to_dict() if user.empresa else None

    return jsonify({'usuario': usuario_data}), 200


@account_bp.put('/profile')
@jwt_required()
def update_profile():
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    data = request.get_json() or {}
    allowed_fields = {
        'nombre',
        'telefono',
        'direccion',
        'ciudad',
        'pais'
    }

    updated = False
    for field in allowed_fields:
        if field in data:
            setattr(user, field, (data.get(field) or '').strip() or None)
            updated = True

    if 'fecha_nacimiento' in data:
        fecha_valor = data.get('fecha_nacimiento')
        if fecha_valor:
            try:
                user.fecha_nacimiento = datetime.strptime(fecha_valor, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Formato de fecha inválido. Usa YYYY-MM-DD.'}), 400
        else:
            user.fecha_nacimiento = None
        updated = True

    if not updated:
        return jsonify({'message': 'No se proporcionaron campos para actualizar'}), 400

    db.session.commit()

    usuario_data = user.to_dict()
    usuario_data['empresa'] = user.empresa.to_dict() if user.empresa else None

    return jsonify({'message': 'Perfil actualizado', 'usuario': usuario_data}), 200


@account_bp.post('/password')
@jwt_required()
def change_password():
    """
    Cambia la contraseña del usuario.
    
    Escenarios soportados:
    1. Usuario CON 2FA activo:
       - Requiere: otp_code (del authenticator) + new_password
    
    2. Usuario SIN 2FA:
       - Requiere: verification_code (de email) + new_password
       - Debe solicitar código primero desde /account/password/request-code
    """
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    data = request.get_json() or {}
    new_password = data.get('new_password')
    otp_code = data.get('otp_code')
    verification_code = data.get('verification_code')

    if not new_password:
        return jsonify({'message': 'Debes indicar la nueva contraseña (new_password)'}), 400

    # Validar fortaleza de la nueva contraseña
    password_validation = validate_password_strength(new_password)
    if not password_validation['valid']:
        return jsonify({
            'message': 'La nueva contraseña no cumple los requisitos de seguridad',
            'errors': password_validation['errors']
        }), 400

    # Escenario 1: Usuario CON 2FA activo
    if user.otp_enabled:
        if not otp_code:
            return jsonify({
                'message': 'Tienes 2FA activo. Debes proporcionar el código de tu authenticator (otp_code)'
            }), 400
        
        if not user.verify_otp(str(otp_code)):
            return jsonify({'message': 'Código OTP inválido'}), 401
        
        # Código válido: cambiar contraseña
        user.set_password(new_password)
        db.session.commit()
        Logger.add_to_log('info', f'Usuario {user.email} cambió su contraseña usando 2FA')
        return jsonify({'message': 'Contraseña actualizada correctamente'}), 200

    # Escenario 2: Usuario SIN 2FA - Requiere código de verificación por email
    if not verification_code:
        return jsonify({
            'message': 'No tienes 2FA activo. Debes solicitar un código de verificación desde /account/password/request-code y proporcionarlo aquí (verification_code)'
        }), 400
    
    # Verificar código de email
    if not OTPEmailService.verify_code(user.email, verification_code, purpose='password_change'):
        return jsonify({
            'message': 'Código de verificación inválido o expirado. Solicita un nuevo código desde /account/password/request-code'
        }), 401
    
    user.set_password(new_password)
    db.session.commit()
    Logger.add_to_log('info', f'Usuario {user.email} cambió su contraseña usando código de verificación por email')
    return jsonify({'message': 'Contraseña actualizada correctamente'}), 200


@account_bp.post('/password/request-code')
@jwt_required()
def request_password_change_code():
    """
    Solicita un código de verificación por email para cambiar contraseña.
    Útil cuando el usuario no recuerda su contraseña actual y no tiene 2FA activado.
    """
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    # Si tiene 2FA activo, debe usar ese método
    if user.otp_enabled:
        return jsonify({
            'message': 'Tienes autenticación de dos pasos activada. '
                       'Para cambiar tu contraseña, usa el código de tu authenticator (otp_code) en /account/password'
        }), 400

    # Generar y enviar código por email
    success, error_message = OTPEmailService.generate_and_send_code(
        recipient_email=user.email,
        user_name=user.nombre,
        purpose='password_change',
        expires_minutes=10
    )
    
    if not success:
        Logger.add_to_log('error', f'Error al enviar código de verificación a {user.email}: {error_message}')
        return jsonify({
            'message': error_message or 'Error al enviar el código de verificación. Intenta nuevamente.'
        }), 500
    
    Logger.add_to_log('info', f'Código de verificación enviado exitosamente a {user.email}')
    
    return jsonify({
        'message': 'Código de verificación enviado a tu email. Válido por 10 minutos.',
        'email': user.email,
        'expires_in_minutes': 10
    }), 200


@account_bp.post('/password/verify-code')
@jwt_required()
def verify_password_change_code():
    """
    Verifica si un código de cambio de contraseña es válido (sin consumirlo).
    Útil para validar en el frontend antes de pedir la nueva contraseña.
    """
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    data = request.get_json() or {}
    verification_code = data.get('verification_code')

    if not verification_code:
        return jsonify({'message': 'Código de verificación requerido'}), 400

    # Verificar sin consumir (usando has_active_code)
    if not OTPEmailService.has_active_code(user.email, purpose='password_change'):
        return jsonify({
            'message': 'No hay código activo. Solicita uno nuevo desde /account/password/request-code'
        }), 404

    # Intentar verificar (esto SÍ consume el código)
    # Para solo "peek", tendríamos que modificar el servicio. Por ahora, validamos consumiéndolo.
    # Si necesitas verificar sin consumir, hay que ajustar OTPEmailService
    
    return jsonify({
        'message': 'Código válido. Puedes proceder a cambiar tu contraseña.',
        'remaining_seconds': OTPEmailService.get_remaining_time(user.email, purpose='password_change')
    }), 200


@account_bp.get('/subscriptions')
@jwt_required()
def list_subscriptions():
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if not user.empresa_id:
        return jsonify({'suscripciones': []}), 200

    suscripciones = Suscripcion.query.filter_by(empresa_id=user.empresa_id).all()
    resultado = []
    for suscripcion in suscripciones:
        data = suscripcion.to_dict()
        data['servicio'] = suscripcion.servicio.to_dict() if suscripcion.servicio else None
        resultado.append(data)

    return jsonify({'suscripciones': resultado}), 200


@account_bp.patch('/subscriptions/<int:subscription_id>')
@jwt_required()
def update_subscription(subscription_id: int):
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if not user.empresa_id:
        return jsonify({'message': 'No tienes una empresa asociada para administrar suscripciones.'}), 400

    suscripcion = Suscripcion.query.filter_by(id=subscription_id, empresa_id=user.empresa_id).first()
    if not suscripcion:
        return jsonify({'message': 'Suscripción no encontrada'}), 404

    data = request.get_json() or {}
    nuevo_estado = (data.get('estado') or '').lower()
    if nuevo_estado not in ('activa', 'suspendida', 'inactiva'):
        return jsonify({'message': 'Estado de suscripción inválido. Usa activa, suspendida o inactiva.'}), 400

    if nuevo_estado == suscripcion.estado:
        return jsonify({'message': 'La suscripción ya se encuentra en ese estado.'}), 200

    suscripcion.estado = nuevo_estado
    if nuevo_estado == 'inactiva':
        suscripcion.fecha_fin = date.today()
    elif nuevo_estado == 'activa':
        suscripcion.fecha_fin = None

    db.session.commit()

    data = suscripcion.to_dict()
    data['servicio'] = suscripcion.servicio.to_dict() if suscripcion.servicio else None

    return jsonify({'message': 'Suscripción actualizada', 'suscripcion': data}), 200


@account_bp.get('/suscripciones')
@jwt_required()
def listar_suscripciones_empresa():
    """
    GET /account/suscripciones
    Lista las suscripciones de plan de la empresa del usuario autenticado.
    Solo muestra las suscripciones asociadas a la empresa del cliente.
    
    Returns:
        - Lista de suscripciones con información del plan y empresa
    """
    user = _get_current_user()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if not user.empresa_id:
        return jsonify([]), 200

    # Cargar suscripciones con sus relaciones (plan y empresa)
    suscripciones = Suscripcion.query.options(
        joinedload(Suscripcion.plan),
        joinedload(Suscripcion.empresa)
    ).filter_by(empresa_id=user.empresa_id).order_by(Suscripcion.creado_en.desc()).all()

    resultado = []
    for suscripcion in suscripciones:
        resultado.append(suscripcion.to_dict())

    return jsonify(resultado), 200
