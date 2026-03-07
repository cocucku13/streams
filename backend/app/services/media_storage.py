from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import HTTPException, status
from PIL import Image, ImageOps, UnidentifiedImageError

from ..settings import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _ensure_media_root() -> Path:
    root = Path(settings.media_root)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _validate_upload(upload_bytes: bytes, content_type: str) -> str:
    if not upload_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл пустой")

    if len(upload_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Файл слишком большой")

    extension = ALLOWED_CONTENT_TYPES.get(content_type.lower())
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Поддерживаются только JPEG, PNG и WEBP",
        )

    return extension


def _kind_directory(*, user_id: int, kind: str) -> Path:
    if kind not in {"avatar", "cover"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестный тип изображения")
    media_root = _ensure_media_root()
    target_dir = media_root / "dj" / str(user_id) / kind
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


def clear_profile_images(*, user_id: int, kind: str) -> None:
    target_dir = _kind_directory(user_id=user_id, kind=kind)
    for child in target_dir.iterdir():
        if child.is_file():
            child.unlink(missing_ok=True)


def delete_media_file_by_url(url: str) -> None:
    if not url:
        return

    parsed = urlparse(url)
    path = parsed.path or ""
    if not path.startswith(settings.media_url_prefix):
        return

    relative_path = path.removeprefix(settings.media_url_prefix).lstrip("/")
    if not relative_path:
        return

    root = _ensure_media_root().resolve()
    target = (root / relative_path).resolve()

    # Block any path traversal and only touch files under MEDIA_ROOT.
    try:
        target.relative_to(root)
    except ValueError:
        return

    if target.exists() and target.is_file():
        target.unlink(missing_ok=True)


def save_profile_image(*, user_id: int, kind: str, upload_bytes: bytes, content_type: str) -> str:
    if kind not in {"avatar", "cover"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестный тип изображения")

    extension = _validate_upload(upload_bytes, content_type)

    try:
        image = Image.open(BytesIO(upload_bytes))
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный файл изображения") from exc

    max_size = (1024, 1024) if kind == "avatar" else (2560, 1440)
    image.thumbnail(max_size, Image.Resampling.LANCZOS)

    if extension == "jpg":
        image = image.convert("RGB")

    target_dir = _kind_directory(user_id=user_id, kind=kind)
    clear_profile_images(user_id=user_id, kind=kind)

    filename = f"{uuid4().hex}.{extension}"
    target_path = target_dir / filename

    if extension == "jpg":
        image.save(target_path, format="JPEG", quality=88, optimize=True)
    elif extension == "png":
        image.save(target_path, format="PNG", optimize=True)
    else:
        image.save(target_path, format="WEBP", quality=88, method=6)

    return f"{settings.media_url_prefix}/dj/{user_id}/{kind}/{filename}"
