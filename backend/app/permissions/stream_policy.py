from sqlalchemy.orm import Session

from .. import models
from .base import require_authenticated
from .club_policy import can_manage_stream as can_manage_club_stream


def can_view_stream(user: models.User | None, stream: models.Stream) -> bool:
    # Public visibility is controlled at route level; policy allows anonymous viewing by default.
    return True


def can_edit_stream(user: models.User | None, stream: models.Stream, db: Session) -> bool:
    if not require_authenticated(user):
        return False

    if user.id == stream.owner_id:
        return True

    settings = stream.settings
    if settings is None or settings.club is None:
        return False

    return can_manage_club_stream(user, settings.club, db)


def can_manage_stream(user: models.User | None, stream: models.Stream, db: Session) -> bool:
    return can_edit_stream(user, stream, db)
