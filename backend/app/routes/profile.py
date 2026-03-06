from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


def _global_role_for_user(user: models.User) -> str:
    return "dj" if user.dj_profile else "viewer"


@router.get("/me", response_model=schemas.ProfileResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return schemas.ProfileResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        club_name=current_user.club_name,
        global_role=_global_role_for_user(current_user),
    )


@router.put("/me", response_model=schemas.ProfileResponse)
def update_me(
    payload: schemas.ProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.display_name = payload.display_name
    current_user.bio = payload.bio
    current_user.avatar_url = payload.avatar_url
    current_user.club_name = payload.club_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return schemas.ProfileResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        club_name=current_user.club_name,
        global_role=_global_role_for_user(current_user),
    )
