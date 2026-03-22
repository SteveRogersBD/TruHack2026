"""add chat mode to chat_sessions

Revision ID: d4e6f7a8b9c0
Revises: c9f2a1b3d4e5
Create Date: 2026-03-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "d4e6f7a8b9c0"
down_revision = "c9f2a1b3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    chat_mode = sa.Enum("general", "youtube", "webpage", "math", "coding", name="chat_mode")
    chat_mode.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "chat_sessions",
        sa.Column("mode", chat_mode, nullable=False, server_default="general"),
    )


def downgrade() -> None:
    op.drop_column("chat_sessions", "mode")
    chat_mode = sa.Enum("general", "youtube", "webpage", "math", "coding", name="chat_mode")
    chat_mode.drop(op.get_bind(), checkfirst=True)
