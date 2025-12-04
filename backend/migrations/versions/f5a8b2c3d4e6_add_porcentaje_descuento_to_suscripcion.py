"""Add porcentaje_descuento to suscripcion

Revision ID: f5a8b2c3d4e6
Revises: 9866b3dfd804
Create Date: 2024-12-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f5a8b2c3d4e6'
down_revision = '9866b3dfd804'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar columna porcentaje_descuento a la tabla suscripciones
    # Default 0, no nullable, representa el porcentaje de descuento (0-100)
    op.add_column('suscripciones', sa.Column('porcentaje_descuento', sa.Float(), nullable=False, server_default='0'))


def downgrade():
    # Eliminar columna porcentaje_descuento
    op.drop_column('suscripciones', 'porcentaje_descuento')
