from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://ollama:11434"
    chroma_path: str = "./data/chroma"
    sqlite_path: str = "./data/privatemind.db"
    embed_model: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
