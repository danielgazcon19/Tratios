from datetime import datetime
from database.db import db

class Empresa(db.Model):
    __tablename__ = 'empresas'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    contacto = db.Column(db.String(120), nullable=False)
    nit = db.Column(db.String(50), unique=True, nullable=False)
    plan = db.Column(db.String(50), nullable=False, index=True)  # basico, pro, empresarial
    estado = db.Column(db.Boolean, default=True, nullable=False, index=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    usuarios = db.relationship('Usuario', backref='empresa', lazy=True)
    suscripciones = db.relationship('Suscripcion', backref='empresa', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'contacto': self.contacto,
            'nit': self.nit,
            'plan': self.plan,
            'estado': bool(self.estado),
            'creado_en': self.creado_en.isoformat() if self.creado_en else None
        }