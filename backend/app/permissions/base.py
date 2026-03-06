from sqlalchemy.orm import Session

from .. import models


def require_authenticated(user: models.User | None) -> bool:
    return user is not None


def require_membership(user: models.User | None, club: models.Club, db: Session) -> models.ClubMembership | None:
    if not user:
        return None

    return (
        db.query(models.ClubMembership)
        .filter(
            models.ClubMembership.club_id == club.id,
            models.ClubMembership.user_id == user.id,
            models.ClubMembership.status == "active",
        )
        .first()
    )


def require_role(membership: models.ClubMembership | None, roles: set[str]) -> bool:
    return bool(membership and membership.role in roles)
