from sqlalchemy.orm import Session

from .. import models
from .base import require_authenticated, require_membership
from .rbac_matrix import RBAC_MATRIX, ROLE_KEY_BY_MEMBERSHIP_ROLE


MANAGER_ROLE_KEYS = {role for role, rules in RBAC_MATRIX.items() if rules["manage_club_profile"]}
MEMBER_MANAGER_ROLE_KEYS = {role for role, rules in RBAC_MATRIX.items() if rules["manage_members"]}
INVITE_MANAGER_ROLE_KEYS = {role for role, rules in RBAC_MATRIX.items() if rules["manage_invites"]}
STREAM_MANAGER_ROLE_KEYS = {role for role, rules in RBAC_MATRIX.items() if rules["manage_stream"]}


def _membership_in_role_keys(membership: models.ClubMembership | None, role_keys: set[str]) -> bool:
    if not membership:
        return False

    mapped_key = ROLE_KEY_BY_MEMBERSHIP_ROLE.get(membership.role)
    return mapped_key in role_keys


def get_active_membership(user: models.User | None, club: models.Club, db: Session) -> models.ClubMembership | None:
    return require_membership(user, club, db)


def can_view_club_studio(user: models.User | None, club: models.Club, db: Session) -> bool:
    if not require_authenticated(user):
        return False
    membership = require_membership(user, club, db)
    return _membership_in_role_keys(membership, MANAGER_ROLE_KEYS)


def can_edit_club_profile(user: models.User | None, club: models.Club, db: Session) -> bool:
    if not require_authenticated(user):
        return False
    membership = require_membership(user, club, db)
    return _membership_in_role_keys(membership, MANAGER_ROLE_KEYS)


def can_manage_members(user: models.User | None, club: models.Club, db: Session) -> bool:
    if not require_authenticated(user):
        return False
    membership = require_membership(user, club, db)
    return _membership_in_role_keys(membership, MEMBER_MANAGER_ROLE_KEYS)


def can_manage_invites(user: models.User | None, club: models.Club, db: Session) -> bool:
    if not require_authenticated(user):
        return False
    membership = require_membership(user, club, db)
    return _membership_in_role_keys(membership, INVITE_MANAGER_ROLE_KEYS)


def can_manage_stream(user: models.User | None, club: models.Club, db: Session) -> bool:
    if not require_authenticated(user):
        return False
    membership = require_membership(user, club, db)
    return _membership_in_role_keys(membership, STREAM_MANAGER_ROLE_KEYS)
