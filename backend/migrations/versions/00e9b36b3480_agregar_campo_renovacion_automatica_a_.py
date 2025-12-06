"""Agregar campo renovacion_automatica a suscripciones y soporte_suscripcion

Revision ID: 00e9b36b3480
Revises: h7c0d5e6f9g0
Create Date: 2025-12-05 19:02:17.184269

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '00e9b36b3480'
down_revision = 'h7c0d5e6f9g0'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar campo renovacion_automatica a soporte_suscripcion
    op.add_column('soporte_suscripcion', sa.Column('renovacion_automatica', sa.Boolean(), nullable=False, server_default='0'))
    
    # Agregar campo renovacion_automatica a suscripciones
    op.add_column('suscripciones', sa.Column('renovacion_automatica', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    # Eliminar campo renovacion_automatica de suscripciones
    op.drop_column('suscripciones', 'renovacion_automatica')
    
    # Eliminar campo renovacion_automatica de soporte_suscripcion
    with op.batch_alter_table('soporte_suscripcion', schema=None) as batch_op:
        batch_op.drop_column('renovacion_automatica')
    
    # Resto del código comentado
    '''
    with op.batch_alter_table('soporte_tipo', schema=None) as batch_op:
        batch_op.alter_column('fecha_actualizacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp() ON UPDATE current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('fecha_creacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('activo',
               existing_type=mysql.TINYINT(display_width=1),
               server_default=sa.text('1'),
               existing_nullable=True)
        batch_op.alter_column('precio',
               existing_type=mysql.DECIMAL(precision=15, scale=2),
               server_default=sa.text('0.00'),
               existing_nullable=False)

    with op.batch_alter_table('soporte_tickets_comentarios', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key(batch_op.f('soporte_tickets_comentarios_ibfk_2'), 'usuarios', ['admin_id'], ['id'], ondelete='SET NULL')
        batch_op.alter_column('fecha_creacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('es_admin',
               existing_type=mysql.TINYINT(display_width=1),
               server_default=sa.text('0'),
               existing_nullable=True)

    with op.batch_alter_table('soporte_tickets', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key(batch_op.f('soporte_tickets_ibfk_2'), 'empresas', ['empresa_id'], ['id'], ondelete='CASCADE')
        batch_op.create_foreign_key(batch_op.f('soporte_tickets_ibfk_3'), 'usuarios', ['asignado_a'], ['id'], ondelete='SET NULL')
        batch_op.alter_column('fecha_actualizacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp() ON UPDATE current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('fecha_creacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('prioridad',
               existing_type=mysql.ENUM('baja', 'media', 'alta', 'critica'),
               server_default=sa.text("'media'"),
               existing_nullable=True)
        batch_op.alter_column('estado',
               existing_type=mysql.ENUM('abierto', 'en_proceso', 'pendiente_respuesta', 'cerrado', 'cancelado'),
               server_default=sa.text("'abierto'"),
               existing_nullable=True)

    with op.batch_alter_table('soporte_suscripcion', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key(batch_op.f('soporte_suscripcion_ibfk_4'), 'usuarios', ['creado_por'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key(batch_op.f('soporte_suscripcion_ibfk_1'), 'suscripciones', ['suscripcion_id'], ['id'], ondelete='CASCADE')
        batch_op.create_foreign_key(batch_op.f('soporte_suscripcion_ibfk_2'), 'empresas', ['empresa_id'], ['id'], ondelete='CASCADE')
        batch_op.alter_column('fecha_actualizacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp() ON UPDATE current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('fecha_creacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('horas_consumidas',
               existing_type=mysql.DECIMAL(precision=10, scale=2),
               server_default=sa.text('0.00'),
               existing_nullable=True)
        batch_op.alter_column('tickets_consumidos',
               existing_type=mysql.INTEGER(display_width=11),
               server_default=sa.text('0'),
               existing_nullable=True)
        batch_op.alter_column('precio_actual',
               existing_type=mysql.DECIMAL(precision=15, scale=2),
               server_default=sa.text('0.00'),
               existing_nullable=False)
        batch_op.alter_column('estado',
               existing_type=mysql.ENUM('activo', 'vencido', 'cancelado', 'pendiente_pago'),
               server_default=sa.text("'activo'"),
               existing_nullable=True)
        batch_op.drop_column('renovacion_automatica')

    with op.batch_alter_table('soporte_pagos', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key(batch_op.f('soporte_pagos_ibfk_2'), 'usuarios', ['registrado_por'], ['id'], ondelete='SET NULL')
        batch_op.alter_column('fecha_creacion',
               existing_type=mysql.DATETIME(),
               server_default=sa.text('current_timestamp()'),
               existing_nullable=True)
        batch_op.alter_column('estado',
               existing_type=mysql.ENUM('exitoso', 'fallido', 'pendiente'),
               server_default=sa.text("'exitoso'"),
               existing_nullable=True)
    '''
