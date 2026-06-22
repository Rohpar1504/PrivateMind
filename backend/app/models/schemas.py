from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel


class FileType(StrEnum):
    pdf = "pdf"
    txt = "txt"
    md = "md"
    docx = "docx"
    web = "web"


class SM2Granularity(StrEnum):
    per_document = "per_document"
    per_chunk = "per_chunk"


class RecallRating(StrEnum):
    easy = "easy"
    hard = "hard"


# --- Ingest ---

class IngestResponse(BaseModel):
    document_id: UUID
    title: str
    summary: str
    chunk_count: int


# --- Documents ---

class DocumentMeta(BaseModel):
    id: UUID
    source_path: str
    file_type: FileType
    title: str
    summary: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    last_accessed_at: datetime | None = None
    file_path: str | None = None

class DocumentUpdate(BaseModel):
    title: str | None = None
    tags: list[str] | None = None


# --- Search ---

class SearchResult(BaseModel):
    document_id: UUID
    document_title: str
    chunk_text: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


# --- Chat ---

class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]


# --- Review ---

class SM2Record(BaseModel):
    id: UUID
    document_id: UUID
    chunk_id: str | None
    ease_factor: float
    interval_days: int
    repetitions: int
    last_reviewed_at: datetime | None
    next_review_date: date


class ReviewCard(BaseModel):
    sm2_id: UUID
    document_id: UUID
    document_title: str
    chunk_id: str | None
    chunk_text: str
    interval_days: int
    repetitions: int
    next_review_date: date


class ReviewStats(BaseModel):
    due: int
    reviewed_today: int


class ReviewCompleteRequest(BaseModel):
    rating: RecallRating


# --- Settings ---

class AppSettings(BaseModel):
    ollama_model: str
    embed_model: str


class SettingsUpdate(BaseModel):
    ollama_model: str | None = None
