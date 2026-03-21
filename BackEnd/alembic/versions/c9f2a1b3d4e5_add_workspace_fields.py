"""add workspace fields to chat_sessions

Revision ID: c9f2a1b3d4e5
Revises: b8a5d7d4f9c1
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "c9f2a1b3d4e5"
down_revision = "b8a5d7d4f9c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_sessions", sa.Column("learning_goal", sa.Text(), nullable=True))
    op.add_column("chat_sessions", sa.Column("current_code", sa.Text(), nullable=True))
    op.add_column("chat_sessions", sa.Column("last_execution", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_sessions", "last_execution")
    op.drop_column("chat_sessions", "current_code")
    op.drop_column("chat_sessions", "learning_goal")
