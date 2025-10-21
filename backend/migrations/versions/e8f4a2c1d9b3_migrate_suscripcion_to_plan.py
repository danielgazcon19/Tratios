"""migrate_suscripcion_to_plan

Revision ID: e8f4a2c1d9b3
Revises: (última migración existente)
Create Date: 2025-10-19 13:22:10.000000

Migración para cambiar suscripciones de servicio_id a plan_id
- Elimina la relación con servicios
- Agrega relación con planes
- Agrega campos adicionales para gestión de suscripciones
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision = 'e8f4a2c1d9b3'
down_revision = 'bfdd1a6d5d7e'  # add_unique_empresa_user_relationship (actual en BD)
branch_labels = None
depends_on = None


def upgrade():
    """
    Actualiza la estructura de la tabla suscripciones:
    - Elimina servicio_id
    - Agrega plan_id
    - Agrega campos de control (creado_por, motivo_cancelacion, etc.)
    """
    
    # 1. Eliminar el constraint único actual (si existe)
    try:
        op.drop_constraint('uk_empresa_servicio_activo', 'suscripciones', type_='unique')
    except:
        pass  # El constraint no existe
    
    # 2. Eliminar el índice compuesto (si existe)
    try:
        op.drop_index('idx_empresa_estado', table_name='suscripciones')
    except:
        pass  # El índice no existe
    
    # 3. Agregar nueva columna plan_id (nullable temporalmente)
    op.add_column('suscripciones', sa.Column('plan_id', sa.Integer(), nullable=True))
    
    # 4. Agregar columnas adicionales para gestión
    op.add_column('suscripciones', sa.Column('periodo', sa.String(20), nullable=True, comment='mensual o anual'))
    op.add_column('suscripciones', sa.Column('precio_pagado', sa.Float(), nullable=True, comment='Precio al momento de la suscripción'))
    op.add_column('suscripciones', sa.Column('creado_en', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.add_column('suscripciones', sa.Column('actualizado_en', sa.DateTime(), nullable=True, onupdate=sa.func.now()))
    op.add_column('suscripciones', sa.Column('creado_por', sa.Integer(), nullable=True, comment='ID del admin que creó la suscripción'))
    op.add_column('suscripciones', sa.Column('motivo_cancelacion', sa.Text(), nullable=True))
    op.add_column('suscripciones', sa.Column('notas', sa.Text(), nullable=True))
    
    # 5. Crear foreign key con planes
    op.create_foreign_key('fk_suscripcion_plan', 'suscripciones', 'planes', ['plan_id'], ['id'])
    
    # 6. Crear índices nuevos
    op.create_index('idx_suscripcion_plan', 'suscripciones', ['plan_id'])
    op.create_index('idx_suscripcion_empresa_estado', 'suscripciones', ['empresa_id', 'estado'])
    op.create_index('idx_suscripcion_fecha_fin', 'suscripciones', ['fecha_fin'])
    
    # 7. Crear constraint único para prevenir suscripciones duplicadas
    # Solo una suscripción activa por empresa
    op.create_unique_constraint('uk_empresa_plan_activo', 'suscripciones', ['empresa_id', 'plan_id', 'estado'])
    
    # 8. Ahora que tenemos plan_id, podemos eliminar servicio_id
    try:
        op.drop_constraint('suscripciones_ibfk_2', 'suscripciones', type_='foreignkey')  # FK servicio_id
    except:
        pass  # La FK no existe o tiene otro nombre
    
    # Eliminar la columna servicio_id si existe
    try:
        op.drop_column('suscripciones', 'servicio_id')
    except:
        pass  # La columna ya no existe
    
    # 9. Hacer plan_id NOT NULL después de migrar datos
    # NOTA: En producción, primero migra los datos antes de este paso
    op.alter_column('suscripciones', 'plan_id',
                    existing_type=sa.Integer(),
                    nullable=False)


def downgrade():
    """
    Revierte los cambios (restaura servicio_id)
    ADVERTENCIA: Puede perder datos si no se hace backup
    """
    
    # 1. Eliminar constraints y índices nuevos
    op.drop_constraint('uk_empresa_plan_activo', 'suscripciones', type_='unique')
    op.drop_constraint('fk_suscripcion_plan', 'suscripciones', type_='foreignkey')
    op.drop_index('idx_suscripcion_plan', table_name='suscripciones')
    op.drop_index('idx_suscripcion_empresa_estado', table_name='suscripciones')
    op.drop_index('idx_suscripcion_fecha_fin', table_name='suscripciones')
    
    # 2. Restaurar servicio_id
    op.add_column('suscripciones', sa.Column('servicio_id', mysql.INTEGER(), nullable=False))
    op.create_foreign_key('suscripciones_ibfk_2', 'suscripciones', 'servicios', ['servicio_id'], ['id'])
    
    # 3. Eliminar columnas nuevas
    op.drop_column('suscripciones', 'notas')
    op.drop_column('suscripciones', 'motivo_cancelacion')
    op.drop_column('suscripciones', 'creado_por')
    op.drop_column('suscripciones', 'actualizado_en')
    op.drop_column('suscripciones', 'creado_en')
    op.drop_column('suscripciones', 'precio_pagado')
    op.drop_column('suscripciones', 'periodo')
    op.drop_column('suscripciones', 'plan_id')
    
    # 4. Restaurar constraints originales
    op.create_unique_constraint('uk_empresa_servicio_activo', 'suscripciones', ['empresa_id', 'servicio_id'])
    op.create_index('idx_empresa_estado', 'suscripciones', ['empresa_id', 'estado'])
