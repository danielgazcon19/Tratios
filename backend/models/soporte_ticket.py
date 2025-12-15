"""
Modelo SoporteTicket y SoporteTicketComentario - Gestión de tickets de soporte
"""
from datetime import datetime, timezone, timedelta
from database.db import db

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def get_colombia_now():
    """Obtiene la fecha/hora actual en zona horaria de Colombia (UTC-5)"""
    return datetime.now(COLOMBIA_TZ)


class SoporteTicket(db.Model):
    __tablename__ = 'soporte_tickets'
    """
    Tabla: soporte_tickets
    ----------------------
    Descripción:
        Representa cada solicitud de soporte realizada por un cliente con un soporte activo.
        Funciona como el sistema oficial de seguimiento, historial y solución de problemas.
    Casos de uso:
        - Clientes reportan errores, dudas o problemas técnicos.
        - Área técnica responde, actualiza y cierra tickets.
        - El SaaS registra automáticamente tickets generados desde la app principal.
    Campos:
        id_ticket (PK, BIGINT)
            Identificador único del ticket.
        id_suscripcion (FK → suscripciones.id_suscripcion)
            Suscripción desde la que se originó el ticket.
        id_soporte_suscripcion (FK → soporte_suscripcion.id_soporte_suscripcion)
            Soporte contratado que habilita el ticket.
        id_usuario_crea (FK → usuario.id_usuario)
            Usuario que genera el ticket (cliente).
        titulo (VARCHAR)
            Título breve del problema reportado.
        descripcion (TEXT)
            Detalle completo del caso.
        prioridad (ENUM)
            - baja
            - media
            - alta
            - crítica
        estado (ENUM)
            - abierto
            - en_proceso
            - en_espera
            - resuelto
            - cerrado
        fecha_creacion (DATETIME)
            Fecha en que se creó el ticket.
        fecha_actualizacion (DATETIME)
            Última modificación del estado.
        fecha_cierre (DATETIME)
            Fecha cuando se marcó como resuelto/cerrado.
        asignado_a (FK → usuario.id_usuario)
            Técnico o administrador asignado para atender el ticket.
    Consideraciones:
        - Los tickets solo pueden crearse si existe soporte activo.
        - Puede extenderse con archivos adjuntos, mensajes internos y SLA en versiones futuras.
    """
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    soporte_suscripcion_id = db.Column(db.Integer, db.ForeignKey('soporte_suscripcion.id', ondelete='CASCADE'), nullable=False)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    usuario_creador_id = db.Column(db.Integer, nullable=True)  # Usuario de la instancia SaaS que creó el ticket
    titulo = db.Column(db.String(255), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    estado = db.Column(
        db.Enum('abierto', 'en_proceso', 'pendiente_respuesta', 'cerrado', 'cancelado', name='estado_ticket'),
        default='abierto'
    )
    prioridad = db.Column(
        db.Enum('baja', 'media', 'alta', 'critica', name='prioridad_ticket'),
        default='media'
    )
    asignado_a = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)  # Admin asignado
    fecha_creacion = db.Column(db.DateTime, default=get_colombia_now)
    fecha_actualizacion = db.Column(db.DateTime, default=get_colombia_now, onupdate=get_colombia_now)
    fecha_cierre = db.Column(db.DateTime, nullable=True)
    extra_data = db.Column(db.JSON, nullable=True)  # Info adicional: origen, versión, etc.

    # Relaciones
    soporte_suscripcion = db.relationship('SoporteSuscripcion', back_populates='tickets')
    empresa = db.relationship('Empresa', backref=db.backref('tickets_soporte', lazy='dynamic'))
    admin_asignado = db.relationship('Usuario', foreign_keys=[asignado_a], backref='tickets_asignados')
    comentarios = db.relationship('SoporteTicketComentario', back_populates='ticket', lazy='dynamic', cascade='all, delete-orphan', order_by='SoporteTicketComentario.fecha_creacion')

    __table_args__ = (
        db.Index('idx_soporte_tickets_suscripcion', 'soporte_suscripcion_id'),
        db.Index('idx_soporte_tickets_empresa', 'empresa_id'),
        db.Index('idx_soporte_tickets_estado', 'estado'),
        db.Index('idx_soporte_tickets_prioridad', 'prioridad'),
        db.Index('idx_soporte_tickets_asignado', 'asignado_a'),
    )

    def cerrar(self):
        """Cierra el ticket"""
        self.estado = 'cerrado'
        self.fecha_cierre = get_colombia_now()

    def to_dict(self, include_comentarios=False, include_relations=True):
        data = {
            'id': self.id,
            'soporte_suscripcion_id': self.soporte_suscripcion_id,
            'empresa_id': self.empresa_id,
            'usuario_creador_id': self.usuario_creador_id,
            'titulo': self.titulo,
            'descripcion': self.descripcion,
            'estado': self.estado,
            'prioridad': self.prioridad,
            'asignado_a': self.asignado_a,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            'fecha_cierre': self.fecha_cierre.isoformat() if self.fecha_cierre else None,
            'extra_data': self.extra_data,
            'total_comentarios': self.comentarios.count() if self.comentarios else 0
        }
        
        if include_relations:
            data['empresa'] = {'id': self.empresa.id, 'nombre': self.empresa.nombre} if self.empresa else None
            data['admin_asignado'] = {
                'id': self.admin_asignado.id,
                'nombre': self.admin_asignado.nombre
            } if self.admin_asignado else None
            data['tipo_soporte'] = self.soporte_suscripcion.tipo_soporte.nombre if self.soporte_suscripcion and self.soporte_suscripcion.tipo_soporte else None
        
        if include_comentarios:
            data['comentarios'] = [c.to_dict() for c in self.comentarios.all()]
        
        return data

    def __repr__(self):
        return f'<SoporteTicket {self.id}: {self.titulo[:30]}... ({self.estado})>'


class SoporteTicketComentario(db.Model):
    __tablename__ = 'soporte_tickets_comentarios'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('soporte_tickets.id', ondelete='CASCADE'), nullable=False)
    usuario_id = db.Column(db.Integer, nullable=True)  # Puede ser usuario de instancia o admin
    es_admin = db.Column(db.Boolean, default=False)  # True si el comentario es del equipo de soporte
    admin_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)  # Si es admin, guardamos referencia
    comentario = db.Column(db.Text, nullable=False)
    archivos = db.Column(db.JSON, nullable=True)  # Lista de URLs/paths de archivos adjuntos
    fecha_creacion = db.Column(db.DateTime, default=get_colombia_now)

    # Relaciones
    ticket = db.relationship('SoporteTicket', back_populates='comentarios')
    admin = db.relationship('Usuario', foreign_keys=[admin_id], backref='comentarios_soporte')

    __table_args__ = (
        db.Index('idx_soporte_comentarios_ticket', 'ticket_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'usuario_id': self.usuario_id,
            'es_admin': self.es_admin,
            'admin_id': self.admin_id,
            'admin_nombre': self.admin.nombre if self.admin else None,
            'comentario': self.comentario,
            'archivos': self.archivos,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None
        }

    def __repr__(self):
        return f'<SoporteTicketComentario {self.id} - Ticket {self.ticket_id}>'
