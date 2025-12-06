"""Fix unique constraint on suscripciones - allow multiple inactive subscriptions

Revision ID: g6b9c4d5e7f8
Revises: f5a8b2c3d4e6
Create Date: 2025-12-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g6b9c4d5e7f8'
down_revision = 'f5a8b2c3d4e6'
branch_labels = None
depends_on = None


def upgrade():
    # Eliminar la restricción única antigua que incluye estado
    # Esto permite múltiples suscripciones inactivas para la misma empresa y plan
    op.drop_constraint('uk_empresa_plan_activo', 'suscripciones', type_='unique')
    
    # Nota: No creamos una nueva restricción porque la lógica de negocio
    # (solo una suscripción activa por empresa) se maneja a nivel de aplicación
    # en el endpoint de renovación


def downgrade():
    # Restaurar la restricción única original
    op.create_unique_constraint(
        'uk_empresa_plan_activo', 
        'suscripciones', 
        ['empresa_id', 'plan_id', 'estado']
    )
