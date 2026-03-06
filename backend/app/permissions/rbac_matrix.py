RBAC_MATRIX = {
    "club_owner": {
        "manage_club_profile": True,
        "manage_members": True,
        "manage_invites": True,
        "manage_stream": True,
    },
    "club_admin": {
        "manage_club_profile": True,
        "manage_members": True,
        "manage_invites": True,
        "manage_stream": True,
    },
    "club_moderator": {
        "manage_club_profile": False,
        "manage_members": False,
        "manage_invites": False,
        "manage_stream": False,
    },
    "club_dj": {
        "manage_club_profile": False,
        "manage_members": False,
        "manage_invites": False,
        "manage_stream": False,
    },
}


ROLE_KEY_BY_MEMBERSHIP_ROLE = {
    "owner": "club_owner",
    "admin": "club_admin",
    "moderator": "club_moderator",
    "dj": "club_dj",
}
