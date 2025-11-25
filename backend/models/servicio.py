from datetime import datetime
from database.db import db


class PlanServicio(db.Model):
    """
    Tabla de asociación entre Planes y Servicios con campos adicionales
    """
    __tablename__ = 'planes_servicios'
    
    plan_id = db.Column(db.Integer, db.ForeignKey('planes.id'), primary_key=True)
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicios.id'), primary_key=True)
    cantidad = db.Column(db.Integer, nullable=True)  # Cantidad límite del servicio (ej: 5 sedes, 10 usuarios)
    
    # Relaciones con los modelos
    plan = db.relationship('Plan', backref=db.backref('plan_servicios', cascade='all, delete-orphan'))
    servicio = db.relationship('Servicio', backref=db.backref('plan_servicios', cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'plan_id': self.plan_id,
            'servicio_id': self.servicio_id,
            'servicio': self.servicio.to_dict() if self.servicio else None,
            'cantidad': self.cantidad
        }


class Servicio(db.Model):
    __tablename__ = 'servicios'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False, index=True)
    descripcion = db.Column(db.Text, nullable=True)
    activo = db.Column(db.Boolean, default=True, index=True)
    url_api = db.Column(db.String(255), nullable=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relación muchos a muchos con planes a través de PlanServicio
    planes = db.relationship('Plan', secondary='planes_servicios', 
                            backref=db.backref('servicios', lazy='dynamic'),
                            viewonly=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'activo': self.activo,
            'url_api': self.url_api,
            'creado_en': self.creado_en.isoformat()
        }