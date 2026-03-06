from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import create_access_token, generate_stream_key, hash_password, verify_password
from ..db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    user_exists = db.query(models.User).filter(models.User.username == payload.username).first()
    if user_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    user = models.User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
        stream_key=generate_stream_key(),
    )
    db.add(user)
    db.commit()

    profile = models.DJProfile(
        user_id=user.id,
        bio="",
        avatar_url="",
        cover_url="",
        socials={},
    )
    db.add(profile)
    db.commit()

    return schemas.TokenResponse(access_token=create_access_token(user.username))


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return schemas.TokenResponse(access_token=create_access_token(user.username))
