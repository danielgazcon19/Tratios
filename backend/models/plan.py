from database.db import db

class Plan(db.Model):
    __tablename__ = 'planes'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    precio_mensual = db.Column(db.Float, nullable=False)
    precio_anual = db.Column(db.Float, nullable=False)
    seleccionado = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'precio_mensual': self.precio_mensual,
            'precio_anual': self.precio_anual,
            'seleccionado': self.seleccionado
        }