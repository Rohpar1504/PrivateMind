import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def get_engine():
    settings = get_settings()
    os.makedirs(os.path.dirname(settings.sqlite_path), exist_ok=True)
    return create_engine(f"sqlite:///{settings.sqlite_path}", connect_args={"check_same_thread": False})


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models.db_models  # noqa: F401 — ensure models are registered before create_all
    Base.metadata.create_all(bind=engine)
