"""
Modelo SoportePago - Registra pagos asociados al soporte
"""
from datetime import datetime, timezone, timedelta
from database.db import db

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def get_colombia_now():
    """Obtiene la fecha/hora actual en zona horaria de Colombia (UTC-5)"""
    return datetime.now(COLOMBIA_TZ)


class SoportePago(db.Model):
    __tablename__ = 'soporte_pagos'
    """
    Tabla: soporte_pagos
    --------------------
    Descripción:
        Registra los pagos realizados por soporte técnico, ya sea por
        mensualidad, anualidad o por evento individual.
    Uso:
        - Control contable y conciliación.
        - Determinar si una suscripción de soporte tiene pagos pendientes.
        - Registrar pagos automáticos realizados desde la web.
    Campos:
        id_soporte_pago (PK, BIGINT)
            Identificador único del pago.
        id_soporte_suscripcion (FK → soporte_suscripcion.id_soporte_suscripcion)
            Suscripción del soporte que se está pagando.
        monto (DECIMAL)
            Valor pagado.
        fecha_pago (DATETIME)
            Fecha en la que se registró el pago.
        metodo_pago (VARCHAR)
            Método utilizado:
                - wompi
                - pse
                - tarjeta
                - transferencia
                - efectivo (solo si aplica)
        referencia_pago (VARCHAR)
            ID o código de confirmación del proveedor de pagos.
        estado_pago (ENUM)
            Estado del pago:
                - exitoso
                - fallido
                - pendiente
                - reembolsado
    Consideraciones:
        - Esta tabla se alimenta desde el sistema de facturación o desde la API del SaaS.
    """

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    soporte_suscripcion_id = db.Column(db.Integer, db.ForeignKey('soporte_suscripcion.id', ondelete='CASCADE'), nullable=False)
    fecha_pago = db.Column(db.DateTime, nullable=False)
    monto = db.Column(db.Numeric(15, 2), nullable=False)
    metodo_pago = db.Column(db.String(100), nullable=True)
    referencia_pago = db.Column(db.String(255), nullable=True)
    estado = db.Column(
        db.Enum('exitoso', 'fallido', 'pendiente', name='estado_pago_soporte'),
        default='exitoso'
    )
    detalle = db.Column(db.JSON, nullable=True)  # Información adicional del pago
    registrado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    fecha_creacion = db.Column(db.DateTime, default=get_colombia_now)

    # Relaciones
    soporte_suscripcion = db.relationship('SoporteSuscripcion', back_populates='pagos')
    registrador = db.relationship('Usuario', foreign_keys=[registrado_por], backref='pagos_soporte_registrados')

    __table_args__ = (
        db.Index('idx_soporte_pagos_suscripcion', 'soporte_suscripcion_id'),
        db.Index('idx_soporte_pagos_estado', 'estado'),
        db.Index('idx_soporte_pagos_fecha', 'fecha_pago'),
    )

    def to_dict(self, include_relations=False):
        data = {
            'id': self.id,
            'soporte_suscripcion_id': self.soporte_suscripcion_id,
            'fecha_pago': self.fecha_pago.isoformat() if self.fecha_pago else None,
            'monto': float(self.monto) if self.monto else 0.00,
            'metodo_pago': self.metodo_pago,
            'referencia_pago': self.referencia_pago,
            'estado': self.estado,
            'detalle': self.detalle,
            'registrado_por': self.registrado_por,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None
        }
        
        if include_relations and self.soporte_suscripcion:
            data['soporte_suscripcion'] = {
                'id': self.soporte_suscripcion.id,
                'empresa_id': self.soporte_suscripcion.empresa_id,
                'empresa': self.soporte_suscripcion.empresa.nombre if self.soporte_suscripcion.empresa else None
            }
        
        return data

    def __repr__(self):
        return f'<SoportePago {self.id}: ${self.monto} - {self.estado}>'
