"""convert empresa estado to boolean

Revision ID: aa1e7b1ec4e7
Revises: f3f7a3f8261d
Create Date: 2025-10-16 20:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'aa1e7b1ec4e7'
down_revision = 'f3f7a3f8261d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.drop_index('ix_empresas_estado')
        batch_op.add_column(sa.Column('estado_tmp', sa.Boolean(), nullable=True, server_default=sa.text('1')))

    op.execute("""
        UPDATE empresas
        SET estado_tmp = CASE
            WHEN LOWER(COALESCE(estado, '')) IN ('activo', 'activa', 'true', '1', 'si', 'sí', 'yes') THEN 1
            ELSE 0
        END
    """)
    op.execute("UPDATE empresas SET estado_tmp = 1 WHERE estado_tmp IS NULL")

    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.drop_column('estado')

    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.alter_column('estado_tmp', new_column_name='estado', existing_type=sa.Boolean(), nullable=False, server_default=sa.text('1'))
        batch_op.create_index('ix_empresas_estado', ['estado'])


def downgrade() -> None:
    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.drop_index('ix_empresas_estado')
        batch_op.add_column(sa.Column('estado_txt', sa.String(length=20), nullable=True))

    op.execute("""
        UPDATE empresas
        SET estado_txt = CASE
            WHEN estado = 1 THEN 'activo'
            ELSE 'inactivo'
        END
    """)

    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.drop_column('estado')

    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.alter_column('estado_txt', new_column_name='estado', existing_type=sa.String(length=20), nullable=True)
        batch_op.create_index('ix_empresas_estado', ['estado'])

    op.execute("UPDATE empresas SET estado = 'activo' WHERE estado IS NULL")
