"""chat crisis pause

Revision ID: 7c1e4b9a2d10
Revises: 933b5017d682
Create Date: 2026-11-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c1e4b9a2d10'
down_revision: Union[str, None] = '933b5017d682'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('chat_paused_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('chat_checkin_due', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'chat_checkin_due')
    op.drop_column('users', 'chat_paused_until')
