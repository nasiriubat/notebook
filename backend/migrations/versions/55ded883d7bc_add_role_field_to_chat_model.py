"""Add role field to Chat model

Revision ID: 55ded883d7bc
Revises: 1becb0b2b57a
Create Date: 2025-03-28 15:53:30.399924

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '55ded883d7bc'
down_revision = '1becb0b2b57a'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('chat', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(length=10), nullable=False))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('chat', schema=None) as batch_op:
        batch_op.drop_column('role')

    # ### end Alembic commands ###
