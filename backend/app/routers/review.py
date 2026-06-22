from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Document, SM2Record
from app.models.schemas import ReviewCard, ReviewCompleteRequest, ReviewStats
from app.sm2 import apply_sm2

router = APIRouter(prefix="/review", tags=["review"])


def _get_chunk_text(chunk_id: str | None) -> str:
    """Fetch chunk text from ChromaDB by chunk_id."""
    if not chunk_id:
        return ""
    try:
        from app.chroma import get_chroma_collection
        col = get_chroma_collection()
        result = col.get(ids=[chunk_id], include=["documents"])
        docs = result.get("documents") or []
        return docs[0] if docs else ""
    except Exception:
        return ""


def _to_card(record: SM2Record, db: Session) -> ReviewCard:
    doc = db.query(Document).filter(Document.id == record.document_id).first()
    title = doc.title if doc else "Unknown document"
    chunk_text = _get_chunk_text(record.chunk_id)
    # Fallback: use document summary if chunk text unavailable
    if not chunk_text and doc and doc.summary:
        chunk_text = doc.summary
    return ReviewCard(
        sm2_id=record.id,
        document_id=record.document_id,
        document_title=title,
        chunk_id=record.chunk_id,
        chunk_text=chunk_text,
        interval_days=record.interval_days,
        repetitions=record.repetitions,
        next_review_date=record.next_review_date,
    )


@router.get("/stats", response_model=ReviewStats)
async def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    due = db.query(SM2Record).filter(SM2Record.next_review_date <= today).count()
    start_of_day = datetime.combine(today, datetime.min.time()).replace(tzinfo=UTC)
    reviewed_today = (
        db.query(SM2Record)
        .filter(SM2Record.last_reviewed_at >= start_of_day)
        .count()
    )
    return ReviewStats(due=due, reviewed_today=reviewed_today)


@router.get("/due", response_model=list[ReviewCard])
async def get_due(db: Session = Depends(get_db)):
    today = date.today()
    records = db.query(SM2Record).filter(SM2Record.next_review_date <= today).all()
    return [_to_card(r, db) for r in records]


@router.get("/completed", response_model=list[ReviewCard])
async def get_completed(db: Session = Depends(get_db)):
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time()).replace(tzinfo=UTC)
    records = (
        db.query(SM2Record)
        .filter(SM2Record.last_reviewed_at >= start_of_day)
        .all()
    )
    return [_to_card(r, db) for r in records]


@router.post("/{sm2_id}/complete", status_code=200, response_model=ReviewCard)
async def complete_review(
    sm2_id: UUID, body: ReviewCompleteRequest, db: Session = Depends(get_db)
):
    record = db.query(SM2Record).filter(SM2Record.id == str(sm2_id)).first()
    if not record:
        raise HTTPException(status_code=404, detail="SM2 record not found")

    update = apply_sm2(
        ease_factor=record.ease_factor,
        interval_days=record.interval_days,
        repetitions=record.repetitions,
        rating=body.rating,
    )

    record.ease_factor = update.ease_factor
    record.interval_days = update.interval_days
    record.repetitions = update.repetitions
    record.next_review_date = update.next_review_date
    record.last_reviewed_at = datetime.now(UTC)
    db.commit()
    db.refresh(record)

    return _to_card(record, db)
