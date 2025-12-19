"""fix_seleccionado_column_type

Revision ID: e54c1ae4cedb
Revises: 0ac5ff6f8ee7
Create Date: 2025-12-19 01:41:44.974214

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e54c1ae4cedb'
down_revision = '0ac5ff6f8ee7'
branch_labels = None
depends_on = None


def upgrade():
    # Estrategia: crear columna temporal, copiar valores convertidos, eliminar original, renombrar temporal
    
    # 1. Agregar columna temporal de tipo BOOLEAN
    op.add_column('planes', sa.Column('seleccionado_tmp', sa.Boolean(), nullable=True))
    
    # 2. Copiar valores convertidos de JSON a BOOLEAN usando CAST
    op.execute("""
        UPDATE planes 
        SET seleccionado_tmp = CASE 
            WHEN CAST(seleccionado AS CHAR) = 'true' THEN 1 
            ELSE 0 
        END
    """)
    
    # 3. Hacer la columna temporal NOT NULL
    op.alter_column('planes', 'seleccionado_tmp', 
                    existing_type=sa.Boolean(),
                    nullable=False)
    
    # 4. Eliminar la columna original
    op.drop_column('planes', 'seleccionado')
    
    # 5. Renombrar la columna temporal a seleccionado
    op.alter_column('planes', 'seleccionado_tmp', 
                    new_column_name='seleccionado',
                    existing_type=sa.Boolean(),
                    nullable=False)


def downgrade():
    # Revertir de BOOLEAN a JSON
    
    # 1. Agregar columna temporal de tipo JSON
    op.add_column('planes', sa.Column('seleccionado_tmp', sa.JSON(), nullable=True))
    
    # 2. Copiar valores convertidos de BOOLEAN a JSON
    op.execute("""
        UPDATE planes 
        SET seleccionado_tmp = CASE 
            WHEN seleccionado = 1 THEN 'true' 
            ELSE 'false' 
        END
    """)
    
    # 3. Hacer la columna temporal NOT NULL
    op.alter_column('planes', 'seleccionado_tmp', 
                    existing_type=sa.JSON(),
                    nullable=False)
    
    # 4. Eliminar la columna original
    op.drop_column('planes', 'seleccionado')
    
    # 5. Renombrar la columna temporal a seleccionado
    op.alter_column('planes', 'seleccionado_tmp', 
                    new_column_name='seleccionado',
                    existing_type=sa.JSON(),
                    nullable=False)
