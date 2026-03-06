from sqlalchemy.orm import Session

from app import models
from app.auth import generate_stream_key, hash_password
from app.permissions.club_policy import can_edit_club_profile, can_manage_invites, can_manage_members, can_manage_stream, can_view_club_studio
from app.permissions.stream_policy import can_edit_stream


def _make_user(db: Session, username: str, display_name: str) -> models.User:
    user = models.User(
        username=username,
        hashed_password=hash_password("password123"),
        display_name=display_name,
        stream_key=generate_stream_key(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_club_with_membership(db: Session, owner: models.User, role: str) -> models.Club:
    club = models.Club(slug=f"club-{owner.username}-{role}", title=f"Club {role}", owner_user_id=owner.id)
    db.add(club)
    db.commit()
    db.refresh(club)

    membership = models.ClubMembership(club_id=club.id, user_id=owner.id, role=role, status="active")
    db.add(membership)
    db.commit()
    return club


def test_club_owner_permissions(db_session: Session) -> None:
    owner = _make_user(db_session, "owner_perm", "Owner Perm")
    club = _make_club_with_membership(db_session, owner, "owner")

    assert can_manage_members(owner, club, db_session) is True
    assert can_manage_stream(owner, club, db_session) is True
    assert can_edit_club_profile(owner, club, db_session) is True


def test_club_admin_permissions(db_session: Session) -> None:
    admin = _make_user(db_session, "admin_perm", "Admin Perm")
    club = _make_club_with_membership(db_session, admin, "admin")

    assert can_manage_stream(admin, club, db_session) is True
    assert can_manage_invites(admin, club, db_session) is True


def test_regular_member_cannot_manage_members(db_session: Session) -> None:
    dj = _make_user(db_session, "dj_perm", "DJ Perm")
    club = _make_club_with_membership(db_session, dj, "dj")

    assert can_manage_members(dj, club, db_session) is False


def test_user_without_membership_cannot_view_club_studio(db_session: Session) -> None:
    owner = _make_user(db_session, "owner_nomember", "Owner NoMember")
    outsider = _make_user(db_session, "outsider_nomember", "Outsider NoMember")
    club = _make_club_with_membership(db_session, owner, "owner")

    assert can_view_club_studio(outsider, club, db_session) is False


def test_stream_edit_permissions_owner_and_non_member(db_session: Session) -> None:
    owner = _make_user(db_session, "stream_owner", "Stream Owner")
    outsider = _make_user(db_session, "stream_outsider", "Stream Outsider")
    club = _make_club_with_membership(db_session, owner, "owner")

    stream = models.Stream(owner_id=owner.id, title="Set")
    db_session.add(stream)
    db_session.commit()
    db_session.refresh(stream)

    settings = models.StreamSettings(stream_id=stream.id, club_id=club.id, visibility="public")
    db_session.add(settings)
    db_session.commit()
    db_session.refresh(settings)

    stream.settings = settings
    stream.settings.club = club

    assert can_edit_stream(owner, stream, db_session) is True
    assert can_edit_stream(outsider, stream, db_session) is False
