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
    _migrate(engine)


def _migrate(eng) -> None:
    """Add columns introduced after initial schema creation."""
    new_columns = [
        "ALTER TABLE documents ADD COLUMN last_accessed_at DATETIME",
        "ALTER TABLE documents ADD COLUMN file_path TEXT",
    ]
    with eng.connect() as conn:
        for stmt in new_columns:
            try:
                conn.execute(__import__("sqlalchemy").text(stmt))
                conn.commit()
            except Exception:
                pass  # column already exists — safe to ignore
