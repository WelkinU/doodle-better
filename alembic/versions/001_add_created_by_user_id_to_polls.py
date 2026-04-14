"""Add created_by_user_id to polls

Revision ID: 001_add_created_by_user_id
Revises:
Create Date: 2026-04-13
"""

from alembic import op
import sqlalchemy as sa

revision = '001_add_created_by_user_id'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'polls',
        sa.Column('created_by_user_id', sa.String(36), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('polls', 'created_by_user_id')
