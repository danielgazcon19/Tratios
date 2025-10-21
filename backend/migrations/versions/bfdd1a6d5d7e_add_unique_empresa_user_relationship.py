"""add unique empresa user relationship

Revision ID: bfdd1a6d5d7e
Revises: aa1e7b1ec4e7
Create Date: 2025-10-17 16:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bfdd1a6d5d7e'
down_revision = 'aa1e7b1ec4e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DELETE u2 FROM usuarios u1
        JOIN usuarios u2 ON u1.empresa_id = u2.empresa_id AND u1.id < u2.id
        WHERE u1.empresa_id IS NOT NULL
    """)
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_usuarios_empresa_id', ['empresa_id'])


def downgrade() -> None:
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_constraint('uq_usuarios_empresa_id', type_='unique')
