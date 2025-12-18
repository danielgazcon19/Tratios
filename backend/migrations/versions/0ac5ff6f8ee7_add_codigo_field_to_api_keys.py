"""add_codigo_field_to_api_keys

Revision ID: 0ac5ff6f8ee7
Revises: 0c3391f4e75a
Create Date: 2025-12-17 17:22:03.391859

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0ac5ff6f8ee7'
down_revision = '0c3391f4e75a'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar columna codigo a la tabla api_keys
    op.add_column('api_keys', sa.Column('codigo', sa.String(length=50), nullable=False, server_default='licencias'))
    
    # Crear índice en la columna codigo
    op.create_index(op.f('ix_api_keys_codigo'), 'api_keys', ['codigo'], unique=False)
    
    # Remover el server_default después de aplicar
    op.alter_column('api_keys', 'codigo', server_default=None)


def downgrade():
    # Eliminar índice
    op.drop_index(op.f('ix_api_keys_codigo'), table_name='api_keys')
    
    # Eliminar columna codigo
    op.drop_column('api_keys', 'codigo')
