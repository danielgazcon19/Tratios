"""remove_incorrect_unique_empresa_constraint

Revision ID: 25359d2e35f3
Revises: 00e9b36b3480
Create Date: 2025-12-16 19:08:29.434630

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '25359d2e35f3'
down_revision = '00e9b36b3480'
branch_labels = None
depends_on = None


def upgrade():
    # Eliminar la constraint única incorrecta que permite solo un usuario por empresa
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_constraint('uq_usuarios_empresa_id', type_='unique')


def downgrade():
    # Si se necesita revertir, recrear la constraint (no recomendado)
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_usuarios_empresa_id', ['empresa_id'])
