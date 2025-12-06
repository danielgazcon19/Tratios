"""
Modelo SoporteTipo - Catálogo de tipos de soporte
"""
from datetime import datetime
from database.db import db


class SoporteTipo(db.Model):
    __tablename__ = 'soporte_tipo'
    """
    Tabla: soporte_tipo
    -------------------
    Descripción:
        Define los tipos de soporte disponibles dentro del sistema, permitiendo
        clasificar los planes y modalidades de acompañamiento que un cliente puede adquirir.
    Ejemplos de tipos:
        - "Básico"
        - "Premium"
        - "24/7"
        - "Soporte por evento"
        - "Asesoría técnica"
    Campos:
        id_soporte_tipo (PK, BIGINT, autoincremental)
            Identificador único del tipo de soporte.
        nombre (VARCHAR)
            Nombre comercial del tipo de soporte.
        descripcion (TEXT)
            Explicación completa del alcance del tipo de soporte.
        precio_mensual (DECIMAL)
            Valor mensual del soporte, si aplica.
        precio_evento (DECIMAL)
            Valor por evento o atención individual, si aplica.
        activo (BOOLEAN)
            Indica si el tipo de soporte está disponible para la venta.
    Consideraciones:
        - Esta tabla NO depende de la suscripción.
        - Actúa como catálogo maestro de tipos de soporte.
    """
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    modalidad = db.Column(db.Enum('mensual', 'anual', 'por_tickets', 'por_horas', name='modalidad_soporte'), nullable=False)
    precio = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    max_tickets = db.Column(db.Integer, nullable=True)  # Solo aplica para modalidad 'por_tickets'
    max_horas = db.Column(db.Integer, nullable=True)  # Solo aplica para modalidad 'por_horas'
    activo = db.Column(db.Boolean, default=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    suscripciones_soporte = db.relationship('SoporteSuscripcion', back_populates='tipo_soporte', lazy='dynamic')

    __table_args__ = (
        db.Index('idx_soporte_tipo_activo', 'activo'),
        db.Index('idx_soporte_tipo_modalidad', 'modalidad'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'modalidad': self.modalidad,
            'precio': float(self.precio) if self.precio else 0.00,
            'max_tickets': self.max_tickets,
            'max_horas': self.max_horas,
            'activo': self.activo,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None
        }

    def __repr__(self):
        return f'<SoporteTipo {self.id}: {self.nombre} ({self.modalidad})>'
