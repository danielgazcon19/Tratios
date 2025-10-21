from datetime import datetime
from app import db

class LogAcceso(db.Model):
    __tablename__ = 'logs_acceso'

    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    tipo_evento = db.Column(db.String(100), nullable=False)
    ip = db.Column(db.String(50), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'fecha': self.fecha.isoformat(),
            'empresa_id': self.empresa_id,
            'tipo_evento': self.tipo_evento,
            'ip': self.ip
        }