import warnings
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine
from .settings import settings
from .routes import auth, chat, clubs, dj, internal_stream_events, me, profile, streams

app = FastAPI(title="DJ Streams API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(dj.router, prefix="/api")
app.include_router(clubs.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(streams.router, prefix="/api")
app.include_router(internal_stream_events.router, prefix="/api")
app.include_router(chat.router)

Path(settings.media_root).mkdir(parents=True, exist_ok=True)
app.mount(settings.media_url_prefix, StaticFiles(directory=settings.media_root), name="media")


@app.on_event("startup")
def startup_db_guardrails() -> None:
    # Production baseline is Alembic migrations; this is an explicit dev-only fallback.
    if settings.db_auto_create:
        warnings.warn("DB_AUTO_CREATE is enabled: running Base.metadata.create_all for local development only.", stacklevel=2)
        Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok"}
