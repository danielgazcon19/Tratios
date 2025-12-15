"""
Modelo SoporteSuscripcion - Vincula soporte a una suscripción/empresa
"""
from datetime import datetime, timezone, timedelta
from database.db import db

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def get_colombia_now():
    """Obtiene la fecha/hora actual en zona horaria de Colombia (UTC-5)"""
    return datetime.now(COLOMBIA_TZ)


class SoporteSuscripcion(db.Model):
    __tablename__ = 'soporte_suscripcion'
    """
    Tabla: soporte_suscripcion
    --------------------------
    Descripción:
        Representa la relación entre una suscripción activa del SaaS y un tipo de soporte.
        Permite determinar qué cliente tiene soporte contratado y durante qué periodo.
    Uso:
        - Controlar si un cliente tiene derecho a crear tickets.
        - Administrar periodos pagados.
        - Validar si el soporte se encuentra vencido o suspendido.
    Campos:
        id_soporte_suscripcion (PK, BIGINT)
            Identificador único de la relación suscripción ↔ soporte.
        id_suscripcion (FK → suscripciones.id_suscripcion)
            Suscripción principal del SaaS.
        id_soporte_tipo (FK → soporte_tipo.id_soporte_tipo)
            Tipo de soporte que se contrató.
        fecha_inicio (DATETIME)
            Fecha en que inicia el periodo de soporte.
        fecha_fin (DATETIME)
            Fecha en que finaliza el periodo contratado.
        estado (ENUM)
            Estado actual del soporte:
                - activo
                - vencido
                - suspendido
                - pendiente_pago
        renovacion_automatica (BOOLEAN)
            Indica si el soporte se renueva automáticamente al finalizar.
    Consideraciones:
        - Validar que solo existan periodos superpuestos si la lógica lo permite.
        - Se debe consultar esta tabla antes de permitir crear un ticket.
    """

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    suscripcion_id = db.Column(db.Integer, db.ForeignKey('suscripciones.id'), nullable=False)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    soporte_tipo_id = db.Column(db.Integer, db.ForeignKey('soporte_tipo.id'), nullable=False)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=True)
    estado = db.Column(
        db.Enum('activo', 'vencido', 'cancelado', 'pendiente_pago', name='estado_soporte_suscripcion'),
        default='activo'
    )
    precio_actual = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)  # Precio capturado al momento de contratar
    tickets_consumidos = db.Column(db.Integer, default=0)
    horas_consumidas = db.Column(db.Numeric(10, 2), default=0.00)
    renovacion_automatica = db.Column(db.Boolean, default=False, nullable=False)  # Si se renueva automáticamente
    notas = db.Column(db.Text, nullable=True)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    fecha_creacion = db.Column(db.DateTime, default=get_colombia_now)
    fecha_actualizacion = db.Column(db.DateTime, default=get_colombia_now, onupdate=get_colombia_now)

    # Relaciones
    tipo_soporte = db.relationship('SoporteTipo', back_populates='suscripciones_soporte')
    suscripcion = db.relationship('Suscripcion', backref=db.backref('soportes', lazy='dynamic'))
    empresa = db.relationship('Empresa', backref=db.backref('soportes_contratados', lazy='dynamic'))
    creador = db.relationship('Usuario', foreign_keys=[creado_por], backref='soportes_creados')
    pagos = db.relationship('SoportePago', back_populates='soporte_suscripcion', lazy='dynamic', cascade='all, delete-orphan')
    tickets = db.relationship('SoporteTicket', back_populates='soporte_suscripcion', lazy='dynamic', cascade='all, delete-orphan')

    __table_args__ = (
        db.Index('idx_soporte_suscripcion_empresa', 'empresa_id'),
        db.Index('idx_soporte_suscripcion_estado', 'estado'),
        db.Index('idx_soporte_suscripcion_fechas', 'fecha_inicio', 'fecha_fin'),
    )

    def esta_vigente(self):
        """Verifica si la suscripción de soporte está activa y vigente"""
        if self.estado != 'activo':
            return False
        hoy = get_colombia_now().date()
        if self.fecha_inicio > hoy:
            return False
        if self.fecha_fin and self.fecha_fin < hoy:
            return False
        return True

    def puede_crear_ticket(self):
        """Verifica si puede crear un nuevo ticket según la modalidad"""
        if not self.esta_vigente():
            return False, "La suscripción de soporte no está activa"
        
        if self.tipo_soporte.modalidad == 'por_tickets':
            max_tickets = self.tipo_soporte.max_tickets or 0
            if self.tickets_consumidos >= max_tickets:
                return False, f"Se ha alcanzado el límite de tickets ({max_tickets})"
        
        return True, "OK"

    def to_dict(self, include_relations=True):
        data = {
            'id': self.id,
            'suscripcion_id': self.suscripcion_id,
            'empresa_id': self.empresa_id,
            'soporte_tipo_id': self.soporte_tipo_id,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'estado': self.estado,
            'precio_actual': float(self.precio_actual) if self.precio_actual else 0.00,
            'tickets_consumidos': self.tickets_consumidos,
            'horas_consumidas': float(self.horas_consumidas) if self.horas_consumidas else 0.00,
            'renovacion_automatica': self.renovacion_automatica,
            'notas': self.notas,
            'creado_por': self.creado_por,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            'esta_vigente': self.esta_vigente()
        }
        
        if include_relations:
            data['tipo_soporte'] = self.tipo_soporte.to_dict() if self.tipo_soporte else None
            data['empresa'] = self.empresa.to_dict() if self.empresa else None
            data['suscripcion'] = {
                'id': self.suscripcion.id,
                'plan': self.suscripcion.plan.nombre if self.suscripcion and self.suscripcion.plan else None,
                'estado': self.suscripcion.estado if self.suscripcion else None
            } if self.suscripcion else None
        
        return data

    def __repr__(self):
        return f'<SoporteSuscripcion {self.id}: Empresa {self.empresa_id} - {self.estado}>'
