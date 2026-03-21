"""restore users email unique

Revision ID: b8a5d7d4f9c1
Revises: a423107c63d4
Create Date: 2026-03-21 10:05:00
"""

from __future__ import annotations

from alembic import op


revision = "b8a5d7d4f9c1"
down_revision = "a423107c63d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_users_email'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT uq_users_email UNIQUE (email);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_users_email'
            ) THEN
                ALTER TABLE users
                DROP CONSTRAINT uq_users_email;
            END IF;
        END $$;
        """
    )

