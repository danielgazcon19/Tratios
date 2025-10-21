"""add is_active flag to usuario

Revision ID: d4bc2a31789f
Revises: c2d5f78a0bd1
Create Date: 2025-10-16 21:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4bc2a31789f'
down_revision = 'c2d5f78a0bd1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False))

    # remove server default to let application control the value
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.alter_column('is_active', server_default=None)


def downgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_column('is_active')
