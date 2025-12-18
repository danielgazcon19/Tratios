"""
Modelo para gestionar API Keys de acceso a endpoints internos/SaaS

Las API Keys se almacenan hasheadas (bcrypt) para seguridad.
Cada key está asociada a una empresa y puede tener expiración.
"""
from datetime import datetime, timezone, timedelta
from database.db import db

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def get_colombia_now():
    """Obtiene la fecha/hora actual en zona horaria de Colombia"""
    return datetime.now(COLOMBIA_TZ)

class ApiKey(db.Model):
    """
    Modelo para gestionar API Keys de acceso a endpoints internos/SaaS

    Las API Keys se almacenan hasheadas (bcrypt) para seguridad.
    Cada key está asociada a una empresa y puede tener expiración.
    """
    __tablename__ = 'api_keys'

    id = db.Column(db.Integer, primary_key=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False, index=True)
    api_key_hash = db.Column(db.String(255), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(100), nullable=False)  # Descripción: "Producción SaaS", "Desarrollo", etc.
    codigo = db.Column(db.String(50), nullable=False, index=True)  # Scope: "licencias", "soporte", "facturacion", etc.
    activo = db.Column(db.Boolean, default=True, nullable=False, index=True)
    fecha_creacion = db.Column(db.DateTime, default=get_colombia_now, nullable=False)
    ultimo_uso = db.Column(db.DateTime, nullable=True)
    fecha_expiracion = db.Column(db.DateTime, nullable=True)
    
    # Relación con Empresa
    empresa = db.relationship('Empresa', backref=db.backref('api_keys', lazy='dynamic'))

    def to_dict(self, include_hash=False):
        """
        Serializa el modelo a dict.
        
        Args:
            include_hash: Si es True, incluye api_key_hash (solo para uso interno/admin).
                         Por defecto False para no exponer hashes.
        """
        data = {
            'id': self.id,
            'empresa_id': self.empresa_id,
            'empresa_nombre': self.empresa.nombre if self.empresa else None,
            'nombre': self.nombre,
            'codigo': self.codigo,
            'activo': bool(self.activo),
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'ultimo_uso': self.ultimo_uso.isoformat() if self.ultimo_uso else None,
            'fecha_expiracion': self.fecha_expiracion.isoformat() if self.fecha_expiracion else None,
        }
        
        if include_hash:
            data['api_key_hash'] = self.api_key_hash
        
        return data

    def esta_expirada(self):
        """Verifica si la API key ha expirado"""
        if not self.fecha_expiracion:
            return False
        return datetime.utcnow() > self.fecha_expiracion

    def es_valida(self):
        """Verifica si la API key está activa y no ha expirado"""
        return self.activo and not self.esta_expirada()

    def __repr__(self):
        return f'<ApiKey {self.id} - {self.nombre} (Empresa: {self.empresa_id})>'
