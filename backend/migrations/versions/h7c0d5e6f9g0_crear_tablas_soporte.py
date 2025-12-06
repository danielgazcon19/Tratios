"""Crear tablas de soporte: soporte_tipo, soporte_suscripcion, soporte_pagos, soporte_tickets, soporte_tickets_comentarios

Revision ID: h7c0d5e6f9g0
Revises: g6b9c4d5e7f8
Create Date: 2025-12-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision = 'h7c0d5e6f9g0'
down_revision = 'g6b9c4d5e7f8'
branch_labels = None
depends_on = None


def upgrade():
    # Tabla: soporte_tipo (catálogo de tipos de soporte)
    op.create_table(
        'soporte_tipo',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('modalidad', sa.Enum('mensual', 'anual', 'por_tickets', 'por_horas', name='modalidad_soporte'), nullable=False),
        sa.Column('precio', sa.Numeric(15, 2), nullable=False, server_default='0.00'),
        sa.Column('max_tickets', sa.Integer(), nullable=True),
        sa.Column('max_horas', sa.Integer(), nullable=True),
        sa.Column('activo', sa.Boolean(), server_default='1'),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_soporte_tipo_activo', 'soporte_tipo', ['activo'])
    op.create_index('idx_soporte_tipo_modalidad', 'soporte_tipo', ['modalidad'])

    # Tabla: soporte_suscripcion (vincula soporte a empresa/suscripción)
    op.create_table(
        'soporte_suscripcion',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('suscripcion_id', sa.Integer(), nullable=False),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('soporte_tipo_id', sa.Integer(), nullable=False),
        sa.Column('fecha_inicio', sa.Date(), nullable=False),
        sa.Column('fecha_fin', sa.Date(), nullable=True),
        sa.Column('estado', sa.Enum('activo', 'vencido', 'cancelado', 'pendiente_pago', name='estado_soporte_suscripcion'), server_default='activo'),
        sa.Column('precio_actual', sa.Numeric(15, 2), nullable=False, server_default='0.00'),
        sa.Column('tickets_consumidos', sa.Integer(), server_default='0'),
        sa.Column('horas_consumidas', sa.Numeric(10, 2), server_default='0.00'),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('creado_por', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['suscripcion_id'], ['suscripciones.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['soporte_tipo_id'], ['soporte_tipo.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['creado_por'], ['usuarios.id'], ondelete='SET NULL')
    )
    op.create_index('idx_soporte_suscripcion_empresa', 'soporte_suscripcion', ['empresa_id'])
    op.create_index('idx_soporte_suscripcion_estado', 'soporte_suscripcion', ['estado'])
    op.create_index('idx_soporte_suscripcion_fechas', 'soporte_suscripcion', ['fecha_inicio', 'fecha_fin'])

    # Tabla: soporte_pagos (pagos del soporte)
    op.create_table(
        'soporte_pagos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('soporte_suscripcion_id', sa.Integer(), nullable=False),
        sa.Column('fecha_pago', sa.DateTime(), nullable=False),
        sa.Column('monto', sa.Numeric(15, 2), nullable=False),
        sa.Column('metodo_pago', sa.String(100), nullable=True),
        sa.Column('referencia_pago', sa.String(255), nullable=True),
        sa.Column('estado', sa.Enum('exitoso', 'fallido', 'pendiente', name='estado_pago_soporte'), server_default='exitoso'),
        sa.Column('detalle', sa.JSON(), nullable=True),
        sa.Column('registrado_por', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['soporte_suscripcion_id'], ['soporte_suscripcion.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['registrado_por'], ['usuarios.id'], ondelete='SET NULL')
    )
    op.create_index('idx_soporte_pagos_suscripcion', 'soporte_pagos', ['soporte_suscripcion_id'])
    op.create_index('idx_soporte_pagos_estado', 'soporte_pagos', ['estado'])
    op.create_index('idx_soporte_pagos_fecha', 'soporte_pagos', ['fecha_pago'])

    # Tabla: soporte_tickets (tickets de soporte)
    op.create_table(
        'soporte_tickets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('soporte_suscripcion_id', sa.Integer(), nullable=False),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('usuario_creador_id', sa.Integer(), nullable=True),
        sa.Column('titulo', sa.String(255), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('estado', sa.Enum('abierto', 'en_proceso', 'pendiente_respuesta', 'cerrado', 'cancelado', name='estado_ticket'), server_default='abierto'),
        sa.Column('prioridad', sa.Enum('baja', 'media', 'alta', 'critica', name='prioridad_ticket'), server_default='media'),
        sa.Column('asignado_a', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('fecha_actualizacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
        sa.Column('fecha_cierre', sa.DateTime(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['soporte_suscripcion_id'], ['soporte_suscripcion.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['asignado_a'], ['usuarios.id'], ondelete='SET NULL')
    )
    op.create_index('idx_soporte_tickets_suscripcion', 'soporte_tickets', ['soporte_suscripcion_id'])
    op.create_index('idx_soporte_tickets_empresa', 'soporte_tickets', ['empresa_id'])
    op.create_index('idx_soporte_tickets_estado', 'soporte_tickets', ['estado'])
    op.create_index('idx_soporte_tickets_prioridad', 'soporte_tickets', ['prioridad'])
    op.create_index('idx_soporte_tickets_asignado', 'soporte_tickets', ['asignado_a'])

    # Tabla: soporte_tickets_comentarios (comentarios en tickets)
    op.create_table(
        'soporte_tickets_comentarios',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('es_admin', sa.Boolean(), server_default='0'),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('comentario', sa.Text(), nullable=False),
        sa.Column('archivos', sa.JSON(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['ticket_id'], ['soporte_tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['usuarios.id'], ondelete='SET NULL')
    )
    op.create_index('idx_soporte_comentarios_ticket', 'soporte_tickets_comentarios', ['ticket_id'])


def downgrade():
    # Eliminar tablas en orden inverso (por dependencias)
    op.drop_table('soporte_tickets_comentarios')
    op.drop_table('soporte_tickets')
    op.drop_table('soporte_pagos')
    op.drop_table('soporte_suscripcion')
    op.drop_table('soporte_tipo')
    
    # Eliminar enums
    op.execute("DROP TYPE IF EXISTS modalidad_soporte")
    op.execute("DROP TYPE IF EXISTS estado_soporte_suscripcion")
    op.execute("DROP TYPE IF EXISTS estado_pago_soporte")
    op.execute("DROP TYPE IF EXISTS estado_ticket")
    op.execute("DROP TYPE IF EXISTS prioridad_ticket")
