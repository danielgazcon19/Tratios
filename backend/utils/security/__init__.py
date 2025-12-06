"""
Utilidades de seguridad - Decoradores y funciones de autenticación/autorización
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models.usuario import Usuario


def admin_required(fn):
    """
    Decorador para verificar que el usuario autenticado tiene rol de administrador.
    Debe usarse en rutas que requieren permisos de admin.
    
    Uso:
        @app.route('/admin/recurso')
        @admin_required
        def mi_ruta_admin():
            ...
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        # Primero intentar obtener el rol desde los claims del JWT (más eficiente)
        claims = get_jwt()
        rol = claims.get('rol')
        
        if rol == 'admin':
            return fn(*args, **kwargs)
        
        # Si no está en claims, buscar en la base de datos por email
        current_user_email = get_jwt_identity()
        user = Usuario.query.filter_by(email=current_user_email).first()
        
        if not user or user.rol != 'admin':
            return jsonify({'message': 'Acceso denegado. Se requiere rol de administrador'}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """
    Obtiene el usuario actual basándose en el JWT token.
    Debe usarse dentro de una ruta protegida con @jwt_required().
    
    Returns:
        Usuario: El objeto usuario actual o None si no existe
    """
    current_user_email = get_jwt_identity()
    return Usuario.query.filter_by(email=current_user_email).first()


def get_current_admin():
    """
    Obtiene el usuario admin actual. Retorna None si el usuario no es admin.
    Debe usarse dentro de una ruta protegida con @jwt_required().
    
    Returns:
        Usuario: El objeto usuario admin o None si no existe o no es admin
    """
    user = get_current_user()
    if user and user.rol == 'admin':
        return user
    return None
