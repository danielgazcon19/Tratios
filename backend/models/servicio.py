from datetime import datetime
from database.db import db

planes_servicios = db.Table('planes_servicios',
    db.Column('plan_id', db.Integer, db.ForeignKey('planes.id'), primary_key=True),
    db.Column('servicio_id', db.Integer, db.ForeignKey('servicios.id'), primary_key=True)
)

class Servicio(db.Model):
    __tablename__ = 'servicios'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False, index=True)
    descripcion = db.Column(db.Text, nullable=True)
    activo = db.Column(db.Boolean, default=True, index=True)
    url_api = db.Column(db.String(255), nullable=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relaciones
    # NOTA: La relación con suscripciones fue eliminada - ahora las suscripciones se vinculan directamente a planes
    planes = db.relationship('Plan', secondary=planes_servicios, lazy='subquery',
        backref=db.backref('servicios', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'activo': self.activo,
            'url_api': self.url_api,
            'creado_en': self.creado_en.isoformat()
        }