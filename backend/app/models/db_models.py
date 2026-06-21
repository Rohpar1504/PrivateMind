import json
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid4())


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    _tags: Mapped[str] = mapped_column("tags", Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    sm2_records: Mapped[list["SM2Record"]] = relationship("SM2Record", back_populates="document", cascade="all, delete-orphan")
    outgoing_edges: Mapped[list["RelationshipEdge"]] = relationship("RelationshipEdge", foreign_keys="RelationshipEdge.source_doc_id", cascade="all, delete-orphan")

    @property
    def tags(self) -> list[str]:
        return json.loads(self._tags)

    @tags.setter
    def tags(self, value: list[str]) -> None:
        self._tags = json.dumps(value)

    @property
    def chunk_ids(self) -> list[str]:
        return [f"{self.id}_{i}" for i in range(self._chunk_count or 0)]

    _chunk_count: Mapped[int] = mapped_column("chunk_count", Integer, nullable=False, default=0)


class SM2Record(Base):
    __tablename__ = "sm2_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(String, ForeignKey("documents.id"), nullable=False)
    chunk_id: Mapped[str | None] = mapped_column(String, nullable=True)
    ease_factor: Mapped[float] = mapped_column(Float, nullable=False, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_review_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)

    document: Mapped["Document"] = relationship("Document", back_populates="sm2_records")


class RelationshipEdge(Base):
    __tablename__ = "relationship_edges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source_doc_id: Mapped[str] = mapped_column(String, ForeignKey("documents.id"), nullable=False)
    target_doc_id: Mapped[str] = mapped_column(String, nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    extracted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
