"""add otp fields to usuario

Revision ID: c2d5f78a0bd1
Revises: 74c93d28519a
Create Date: 2025-10-16 15:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2d5f78a0bd1'
down_revision = '74c93d28519a'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.add_column(sa.Column('otp_secret', sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column('otp_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False))
        batch_op.add_column(sa.Column('otp_backup_codes', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('otp_backup_codes_used', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('otp_last_verified_at', sa.DateTime(), nullable=True))
        batch_op.alter_column('otp_enabled', server_default=None)


def downgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_column('otp_last_verified_at')
        batch_op.drop_column('otp_backup_codes_used')
        batch_op.drop_column('otp_backup_codes')
        batch_op.drop_column('otp_enabled')
        batch_op.drop_column('otp_secret')
