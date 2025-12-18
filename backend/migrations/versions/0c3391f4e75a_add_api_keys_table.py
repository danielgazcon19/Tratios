"""add_api_keys_table

Revision ID: 0c3391f4e75a
Revises: 25359d2e35f3
Create Date: 2025-12-17 09:17:16.487426

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0c3391f4e75a'
down_revision = '25359d2e35f3'
branch_labels = None
depends_on = None


def upgrade():
    # Crear tabla api_keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('api_key_hash', sa.String(length=255), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('ultimo_uso', sa.DateTime(), nullable=True),
        sa.Column('fecha_expiracion', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('api_key_hash', name='uq_api_keys_hash')
    )
    
    # Crear índices para optimizar consultas
    op.create_index('ix_api_keys_empresa_id', 'api_keys', ['empresa_id'])
    op.create_index('ix_api_keys_activo', 'api_keys', ['activo'])
    op.create_index('ix_api_keys_hash', 'api_keys', ['api_key_hash'])


def downgrade():
    # Eliminar índices
    op.drop_index('ix_api_keys_hash', table_name='api_keys')
    op.drop_index('ix_api_keys_activo', table_name='api_keys')
    op.drop_index('ix_api_keys_empresa_id', table_name='api_keys')
    
    # Eliminar tabla
    op.drop_table('api_keys')
