import pytest
from fastapi.testclient import TestClient

from app.database import init_db
from app.main import app


@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    """Point SQLite and ChromaDB at a temp directory for every test."""
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("CHROMA_PATH", str(tmp_path / "chroma"))
    # Re-initialise after env vars are set
    from app import database
    from app.config import get_settings
    get_settings.cache_clear()
    database.engine = database.get_engine()
    database.SessionLocal.configure(bind=database.engine)
    init_db()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)
