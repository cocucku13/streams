from fastapi import APIRouter, Depends

from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(tags=["me"])


@router.get("/me", response_model=schemas.MeResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return schemas.MeResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        club_name=current_user.club_name,
        global_role="dj" if current_user.dj_profile else "viewer",
    )
