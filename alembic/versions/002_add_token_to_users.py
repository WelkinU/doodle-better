"""Add token to users table

Revision ID: 002
Revises: 001
Create Date: 2026-04-14
"""
from alembic import op
import sqlalchemy as sa


revision = '002'
down_revision = '001_add_created_by_user_id'
branch_labels = None
depends_on = None


def upgrade():
    # Add token column with a SQL default so existing rows get unique tokens automatically.
    # (SQLite does not support ALTER COLUMN to change nullability after the fact,
    # so we enforce NOT NULL at the application/model layer instead.)
    op.add_column('users', sa.Column(
        'token',
        sa.String(64),
        nullable=True,
        server_default=sa.text("lower(hex(randomblob(32)))")
    ))


def downgrade():
    op.drop_column('users', 'token')
