from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user
from ..services.media_storage import clear_profile_images, delete_media_file_by_url, save_profile_image

router = APIRouter(prefix="/dj", tags=["dj"])


def _absolute_media_url(request: Request, url: str) -> str:
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"{str(request.base_url).rstrip('/')}{url}"


def _social_links(raw: dict | None) -> schemas.SocialLinks:
    return schemas.SocialLinks(**(raw or {}))


def _build_dj_profile_response(user: models.User, profile: models.DJProfile, db: Session) -> schemas.DJProfileResponse:
    memberships = (
        db.query(models.ClubMembership, models.Club)
        .join(models.Club, models.ClubMembership.club_id == models.Club.id)
        .filter(models.ClubMembership.user_id == user.id, models.ClubMembership.status == "active")
        .all()
    )

    clubs = [
        schemas.ClubListItemResponse(
            id=club.id,
            slug=club.slug,
            title=club.title,
            city=club.city,
            avatar_url=club.avatar_url,
            role=membership.role,
        )
        for membership, club in memberships
        if membership.role in {"owner", "admin", "moderator", "dj"}
    ]

    stream = (
        db.query(models.Stream)
        .filter(models.Stream.owner_id == user.id)
        .order_by(models.Stream.updated_at.desc())
        .first()
    )

    return schemas.DJProfileResponse(
        id=profile.id,
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        bio=profile.bio or user.bio,
        avatar_url=profile.avatar_url or user.avatar_url,
        cover_url=profile.cover_url,
        socials=_social_links(profile.socials),
        clubs=clubs,
        is_live=bool(stream and stream.is_live),
        live_stream_id=stream.id if stream and stream.is_live else None,
    )


@router.get("/me", response_model=schemas.DJProfileResponse)
def get_my_dj_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.DJProfile(user_id=current_user.id, avatar_url=current_user.avatar_url, bio=current_user.bio)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return _build_dj_profile_response(current_user, profile, db)


@router.get("/{username}", response_model=schemas.DJProfileResponse)
def get_dj_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DJ not found")

    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == user.id).first()
    if not profile:
        profile = models.DJProfile(user_id=user.id, avatar_url=user.avatar_url, bio=user.bio)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return _build_dj_profile_response(user, profile, db)


@router.patch("/me", response_model=schemas.DJProfileResponse)
def patch_my_dj_profile(
    payload: schemas.DJProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.DJProfile(user_id=current_user.id)

    current_user.display_name = payload.display_name
    current_user.bio = payload.bio
    current_user.avatar_url = payload.avatar_url

    profile.bio = payload.bio
    profile.avatar_url = payload.avatar_url
    profile.cover_url = payload.cover_url
    profile.socials = payload.socials.model_dump()

    db.add(current_user)
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return _build_dj_profile_response(current_user, profile, db)


@router.post("/me/avatar", response_model=schemas.MediaUploadResponse)
async def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_bytes = await file.read()
    previous_avatar_url = current_user.avatar_url
    relative_url = save_profile_image(
        user_id=current_user.id,
        kind="avatar",
        upload_bytes=upload_bytes,
        content_type=file.content_type or "",
    )
    absolute_url = _absolute_media_url(request, relative_url)

    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.DJProfile(user_id=current_user.id)

    current_user.avatar_url = absolute_url
    profile.avatar_url = absolute_url
    db.add(
        models.MediaAsset(
            owner_type="dj",
            owner_id=current_user.id,
            type="avatar",
            url=absolute_url,
        )
    )
    db.add(current_user)
    db.add(profile)
    db.commit()

    if previous_avatar_url and previous_avatar_url != absolute_url:
        delete_media_file_by_url(previous_avatar_url)

    return schemas.MediaUploadResponse(url=absolute_url)


@router.post("/me/cover", response_model=schemas.MediaUploadResponse)
async def upload_my_cover(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_bytes = await file.read()
    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == current_user.id).first()
    previous_cover_url = profile.cover_url if profile else ""
    relative_url = save_profile_image(
        user_id=current_user.id,
        kind="cover",
        upload_bytes=upload_bytes,
        content_type=file.content_type or "",
    )
    absolute_url = _absolute_media_url(request, relative_url)

    if not profile:
        profile = models.DJProfile(user_id=current_user.id)

    profile.cover_url = absolute_url
    db.add(
        models.MediaAsset(
            owner_type="dj",
            owner_id=current_user.id,
            type="cover",
            url=absolute_url,
        )
    )
    db.add(profile)
    db.commit()

    if previous_cover_url and previous_cover_url != absolute_url:
        delete_media_file_by_url(previous_cover_url)

    return schemas.MediaUploadResponse(url=absolute_url)


@router.delete("/me/avatar", response_model=schemas.MediaUploadResponse)
def reset_my_avatar(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == current_user.id).first()
    previous_avatar_url = current_user.avatar_url

    current_user.avatar_url = ""
    if profile:
        profile.avatar_url = ""
        db.add(profile)

    clear_profile_images(user_id=current_user.id, kind="avatar")
    delete_media_file_by_url(previous_avatar_url)

    db.add(current_user)
    db.commit()
    return schemas.MediaUploadResponse(url="")


@router.delete("/me/cover", response_model=schemas.MediaUploadResponse)
def reset_my_cover(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.DJProfile).filter(models.DJProfile.user_id == current_user.id).first()
    if not profile:
        return schemas.MediaUploadResponse(url="")

    previous_cover_url = profile.cover_url
    profile.cover_url = ""

    clear_profile_images(user_id=current_user.id, kind="cover")
    delete_media_file_by_url(previous_cover_url)

    db.add(profile)
    db.commit()
    return schemas.MediaUploadResponse(url="")
