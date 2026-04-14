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
    op.add_column('users', sa.Column('token', sa.String(64), nullable=True))
    # Populate tokens for existing rows using Python (SQLite doesn't support
    # non-constant defaults in ALTER TABLE across all versions)
    import secrets
    bind = op.get_bind()
    users = bind.execute(sa.text("SELECT id FROM users WHERE token IS NULL")).fetchall()
    for (uid,) in users:
        token = secrets.token_hex(32)
        bind.execute(sa.text("UPDATE users SET token = :t WHERE id = :id"), {"t": token, "id": uid})


def downgrade():
    op.drop_column('users', 'token')
