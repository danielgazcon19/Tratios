from datetime import datetime
from database.db import db

class Suscripcion(db.Model):
    __tablename__ = 'suscripciones'

    id = db.Column(db.Integer, primary_key=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('planes.id'), nullable=False, index=True)
    fecha_inicio = db.Column(db.Date, default=datetime.utcnow)
    fecha_fin = db.Column(db.Date, nullable=True, index=True)
    estado = db.Column(db.String(20), default='activa', index=True)  # activa, inactiva, suspendida, cancelada
    forma_pago = db.Column(db.String(50), nullable=True)
    
    # Campos adicionales para gestión
    periodo = db.Column(db.String(20), nullable=True)  # mensual, anual
    precio_pagado = db.Column(db.Float, nullable=True)  # Precio al momento de la suscripción
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    actualizado_en = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)  # Admin que creó la suscripción
    motivo_cancelacion = db.Column(db.Text, nullable=True)
    notas = db.Column(db.Text, nullable=True)

    # Relaciones (los backref se definen en los modelos relacionados)
    # empresa - definido en Empresa.suscripciones con backref='empresa'
    plan = db.relationship('Plan', backref=db.backref('suscripciones', lazy=True))
    creador = db.relationship('Usuario', foreign_keys=[creado_por], backref='suscripciones_creadas')

    # Índice único compuesto para prevenir suscripciones duplicadas activas
    __table_args__ = (
        db.UniqueConstraint('empresa_id', 'plan_id', 'estado', name='uk_empresa_plan_activo'),
        db.Index('idx_suscripcion_empresa_estado', 'empresa_id', 'estado'),
        db.Index('idx_suscripcion_fecha_fin', 'fecha_fin'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'empresa_id': self.empresa_id,
            'empresa': self.empresa.to_dict() if self.empresa else None,
            'plan_id': self.plan_id,
            'plan': self.plan.to_dict() if self.plan else None,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'estado': self.estado,
            'forma_pago': self.forma_pago,
            'periodo': self.periodo,
            'precio_pagado': self.precio_pagado,
            'creado_en': self.creado_en.isoformat() if self.creado_en else None,
            'actualizado_en': self.actualizado_en.isoformat() if self.actualizado_en else None,
            'creado_por': self.creado_por,
            'motivo_cancelacion': self.motivo_cancelacion,
            'notas': self.notas
        }