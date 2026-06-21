from fastapi import APIRouter

from app.config import get_settings
from app.models.schemas import AppSettings, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

# In-memory settings override (persisted to disk in M4)
_ollama_model: str = "llama3"


def get_current_model() -> str:
    return _ollama_model


@router.get("", response_model=AppSettings)
async def get_app_settings():
    cfg = get_settings()
    return AppSettings(ollama_model=_ollama_model, embed_model=cfg.embed_model)


@router.patch("", response_model=AppSettings)
async def update_app_settings(body: SettingsUpdate):
    global _ollama_model
    cfg = get_settings()
    if body.ollama_model:
        _ollama_model = body.ollama_model
    return AppSettings(ollama_model=_ollama_model, embed_model=cfg.embed_model)
