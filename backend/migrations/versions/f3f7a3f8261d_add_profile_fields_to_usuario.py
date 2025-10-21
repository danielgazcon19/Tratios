"""add profile fields to usuario

Revision ID: f3f7a3f8261d
Revises: d4bc2a31789f
Create Date: 2025-10-16 17:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3f7a3f8261d'
down_revision = 'd4bc2a31789f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('telefono', sa.String(length=30), nullable=True))
    op.add_column('usuarios', sa.Column('direccion', sa.String(length=255), nullable=True))
    op.add_column('usuarios', sa.Column('ciudad', sa.String(length=120), nullable=True))
    op.add_column('usuarios', sa.Column('pais', sa.String(length=120), nullable=True))
    op.add_column('usuarios', sa.Column('fecha_nacimiento', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('usuarios', 'fecha_nacimiento')
    op.drop_column('usuarios', 'pais')
    op.drop_column('usuarios', 'ciudad')
    op.drop_column('usuarios', 'direccion')
    op.drop_column('usuarios', 'telefono')
