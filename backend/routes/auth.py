from datetime import timedelta
import re

from flask import Blueprint, request, jsonify, current_app
import pyotp
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    decode_token,
    get_jwt
)

from app import db
from models.usuario import Usuario
from models.empresa import Empresa
from utils.password_validator import validate_password_strength
from utils.log import AppLogger, LogCategory

auth_bp = Blueprint('auth', __name__)


def _build_token_response(user: Usuario, fresh: bool = True):
    claims = {
        'rol': user.rol,
        'usuario_id': user.id,
        'empresa_id': user.empresa_id,
        'otp_enabled': bool(user.otp_enabled)
    }
    access_expires = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(minutes=60))
    access_token = create_access_token(identity=user.email, additional_claims=claims, fresh=fresh)
    refresh_token = create_refresh_token(identity=user.email, additional_claims=claims)
    expires_in = int(access_expires.total_seconds()) if isinstance(access_expires, timedelta) else access_expires
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'Bearer',
        'expires_in': expires_in,
        'usuario': user.to_dict()
    }

@auth_bp.post('/registro')
def registro():
    data = request.get_json() or {}
    nombre = (data.get('nombre') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    otp_method = (data.get('otp_method') or 'totp').lower()
    rol = data.get('rol', 'cliente')
    empresa_identificador = (data.get('empresa_id') or '').strip()

    if not all([nombre, email, password]):
        return jsonify({'message': 'Faltan datos obligatorios'}), 400

    if '@' not in email:
        return jsonify({'message': 'Email inválido'}), 400

    # Validar fortaleza de contraseña
    password_validation = validate_password_strength(password)
    if not password_validation['valid']:
        return jsonify({
            'message': 'Contraseña no cumple los requisitos de seguridad',
            'errors': password_validation['errors']
        }), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({'message': 'El email ya está registrado'}), 400

    if otp_method not in ('totp', 'none'):
        return jsonify({'message': 'Método de autenticación no soportado'}), 400

    if not empresa_identificador:
        return jsonify({'message': 'Debe especificar la empresa asignada a su plan.'}), 400

    if len(empresa_identificador) > 50:
        return jsonify({'message': 'El identificador de empresa no puede superar 50 caracteres.'}), 400

    if not re.fullmatch(r'[A-Za-z0-9._-]+', empresa_identificador):
        return jsonify({'message': 'El identificador de empresa solo puede incluir letras, números, guiones, puntos y guiones bajos.'}), 400

    empresa = Empresa.query.filter_by(nit=empresa_identificador).first()
    if not empresa:
        return jsonify({'message': 'Empresa no encontrada. Por favor contacte a soporte.'}), 404
    if empresa.estado is not None and not empresa.estado:
        return jsonify({'message': 'La empresa asociada no está activa. Contacte a soporte.'}), 400

    existing_empresa_user = Usuario.query.filter_by(empresa_id=empresa.id).first()
    if existing_empresa_user:
        return jsonify({'message': 'Ya existe un usuario asociado a esta empresa. Comunícate con soporte para gestionar el acceso.'}), 409

    user = Usuario(
        nombre=nombre,
        email=email,
        rol=rol,
        empresa_id=empresa.id,
        is_active=(otp_method != 'totp')
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    otp_payload = None
    if otp_method == 'totp':
        secret = user.ensure_otp_secret(regenerate=True)
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name='Tratios Compraventa')
        backup_codes = user.generate_backup_codes()
        user.otp_enabled = False
        user.is_active = False
        activation_claims = {
            'usuario_id': user.id,
            'stage': 'otp_registration'
        }
        activation_token = create_access_token(
            identity=user.email,
            additional_claims=activation_claims,
            expires_delta=timedelta(minutes=10),
            fresh=False
        )
        otp_payload = {
            'method': 'totp',
            'secret': secret,
            'provisioning_uri': provisioning_uri,
            'backup_codes': backup_codes,
            'activation_token': activation_token
        }

    db.session.commit()

    response = {
        'message': 'Registro exitoso',
        'usuario': user.to_dict(),
        'empresa': empresa.to_dict()
    }

    if otp_payload:
        response['otp_setup'] = otp_payload

    return jsonify(response), 201


@auth_bp.post('/registro/confirmar-otp')
def confirmar_registro_otp():
    data = request.get_json() or {}
    activation_token = data.get('activation_token')
    otp_code = data.get('otp_code')

    if not activation_token or not otp_code:
        return jsonify({'message': 'Token de activación y código OTP son obligatorios'}), 400

    try:
        decoded = decode_token(activation_token)
    except Exception:
        return jsonify({'message': 'Token de activación inválido o expirado'}), 401

    stage = decoded.get('stage') or decoded.get('claims', {}).get('stage')
    if stage != 'otp_registration':
        return jsonify({'message': 'Token de activación inválido'}), 400

    identity = decoded.get('sub') or decoded.get('identity')
    if not identity:
        return jsonify({'message': 'Identidad no encontrada en el token'}), 400

    user = Usuario.query.filter_by(email=identity).first()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if user.is_active:
        return jsonify({'message': 'La cuenta ya está activada.'}), 400

    user.ensure_otp_secret()
    if not user.verify_otp(str(otp_code)):
        db.session.rollback()
        return jsonify({'message': 'Código OTP inválido'}), 401

    user.otp_enabled = True
    user.is_active = True
    db.session.commit()

    return jsonify({'message': 'Autenticación en dos pasos configurada. Ya puedes iniciar sesión.'}), 200

@auth_bp.post('/login')
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    otp_code = data.get('otp_code')
    backup_code = data.get('backup_code')

    if not email or not password:
        return jsonify({'message': 'Email y contraseña son obligatorios'}), 400

    user = Usuario.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        AppLogger.warning(LogCategory.AUTH, "Intento de login fallido - credenciales inválidas", email=email)
        return jsonify({'message': 'Credenciales inválidas'}), 401

    if not user.is_active:
        AppLogger.warning(LogCategory.AUTH, "Intento de login con cuenta inactiva", user_id=user.id, email=email)
        return jsonify({'message': 'Tu cuenta está pendiente de activación. Completa la configuración de autenticación en dos pasos.'}), 403

    if user.otp_enabled:
        if otp_code:
            if not user.verify_otp(str(otp_code)):
                db.session.rollback()
                AppLogger.warning(LogCategory.AUTH, "Código OTP inválido en login", user_id=user.id, email=email)
                return jsonify({'message': 'Código OTP inválido'}), 401
        elif backup_code:
            if not user.consume_backup_code(str(backup_code)):
                db.session.rollback()
                AppLogger.warning(LogCategory.AUTH, "Código de respaldo inválido en login", user_id=user.id, email=email)
                return jsonify({'message': 'Código de respaldo inválido'}), 401
        else:
            challenge_claims = {
                'usuario_id': user.id,
                'stage': 'otp'
            }
            challenge_token = create_access_token(
                identity=user.email,
                additional_claims=challenge_claims,
                expires_delta=timedelta(minutes=5),
                fresh=False
            )
            AppLogger.info(LogCategory.AUTH, "Reto OTP generado para login", user_id=user.id, email=email)
            return jsonify({
                'requires_otp': True,
                'challenge_token': challenge_token,
                'otp_methods': ['totp', 'backup_code']
            }), 202

    AppLogger.info(LogCategory.AUTH, "Login exitoso", user_id=user.id, email=email, rol=user.rol)
    token_payload = _build_token_response(user, fresh=True)
    db.session.commit()
    return jsonify(token_payload), 200


@auth_bp.post('/login/otp')
def login_otp():
    data = request.get_json() or {}
    challenge_token = data.get('challenge_token')
    otp_code = data.get('otp_code')
    backup_code = data.get('backup_code')

    if not challenge_token:
        return jsonify({'message': 'Token de reto requerido'}), 400

    try:
        decoded = decode_token(challenge_token)
    except Exception:
        return jsonify({'message': 'Token de reto inválido o expirado'}), 401

    stage = decoded.get('stage') or decoded.get('claims', {}).get('stage')
    if stage != 'otp':
        return jsonify({'message': 'Token de reto inválido'}), 400

    identity = decoded.get('sub') or decoded.get('identity')
    if not identity:
        return jsonify({'message': 'Identidad no encontrada en el token'}), 400

    user = Usuario.query.filter_by(email=identity).first()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    verified = False
    if otp_code:
        verified = user.verify_otp(str(otp_code))
    elif backup_code:
        verified = user.consume_backup_code(str(backup_code))

    if not verified:
        db.session.rollback()
        AppLogger.warning(LogCategory.AUTH, "Verificación OTP fallida en segundo paso", user_id=user.id, email=identity)
        return jsonify({'message': 'Código de verificación inválido'}), 401

    AppLogger.info(LogCategory.AUTH, "Login OTP exitoso", user_id=user.id, email=identity, rol=user.rol)
    token_payload = _build_token_response(user, fresh=True)
    db.session.commit()
    return jsonify(token_payload), 200


@auth_bp.post('/refresh')
@jwt_required(refresh=True)
def refresh_token():
    identity = get_jwt_identity()
    claims = get_jwt() or {}
    user = Usuario.query.filter_by(email=identity).first()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    token_payload = _build_token_response(user, fresh=False)
    return jsonify(token_payload), 200


@auth_bp.post('/otp/setup')
@jwt_required()
def otp_setup():
    regenerate = bool((request.get_json() or {}).get('regenerate'))
    identity = get_jwt_identity()
    user = Usuario.query.filter_by(email=identity).first()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if user.otp_enabled and not regenerate:
        return jsonify({'message': 'Ya tienes OTP habilitado'}), 400

    secret = user.ensure_otp_secret(regenerate=regenerate)
    db.session.commit()

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name='Tratios Compraventa')

    return jsonify({
        'secret': secret,
        'provisioning_uri': provisioning_uri
    }), 200


@auth_bp.post('/otp/activate')
@jwt_required()
def otp_activate():
    """
    Activa 2FA verificando el código del authenticator.
    Siempre genera un nuevo secret para asegurar que el usuario tiene el código correcto.
    """
    data = request.get_json() or {}
    otp_code = data.get('otp_code')
    identity = get_jwt_identity()
    user = Usuario.query.filter_by(email=identity).first()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if not otp_code:
        return jsonify({'message': 'Código OTP requerido. Escanea el QR de /otp/setup y proporciona el código de 6 dígitos.'}), 400

    # Regenerar secret si ya tenía 2FA activo (reactivación)
    if user.otp_enabled:
        user.ensure_otp_secret(regenerate=True)
        db.session.flush()
    else:
        # Para primera activación, debe haber llamado /otp/setup antes
        if not user.otp_secret:
            return jsonify({'message': 'Primero debes obtener tu código QR desde /otp/setup'}), 400
    
    # Verificar código del authenticator
    if not user.verify_otp(str(otp_code)):
        db.session.rollback()
        return jsonify({'message': 'Código OTP inválido. Verifica que tu aplicación authenticator esté sincronizada.'}), 401

    user.otp_enabled = True
    backup_codes = user.generate_backup_codes()
    db.session.commit()

    return jsonify({
        'message': 'Autenticación de dos pasos activada exitosamente',
        'backup_codes': backup_codes,
        'note': 'Guarda estos códigos de respaldo en un lugar seguro. Los necesitarás si pierdes acceso a tu authenticator.'
    }), 200


@auth_bp.post('/otp/disable')
@jwt_required()
def otp_disable():
    """
    Desactiva 2FA requiriendo la contraseña del usuario.
    
    Esto permite que el usuario pueda desactivar 2FA incluso si pierde su celular
    o no tiene acceso a los códigos de respaldo.
    """
    data = request.get_json() or {}
    password = data.get('password')
    identity = get_jwt_identity()
    user = Usuario.query.filter_by(email=identity).first()
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if not user.otp_enabled:
        return jsonify({'message': 'La autenticación de dos pasos no está activada'}), 400

    # Verificar contraseña del usuario
    if not password:
        return jsonify({'message': 'Debes proporcionar tu contraseña para desactivar 2FA'}), 400
    
    if not user.check_password(password):
        return jsonify({'message': 'Contraseña incorrecta'}), 401

    user.disable_otp()
    db.session.commit()

    return jsonify({'message': 'Autenticación de dos pasos desactivada correctamente'}), 200