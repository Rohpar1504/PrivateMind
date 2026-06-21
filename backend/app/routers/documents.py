from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.chroma import delete_chunks
from app.database import get_db
from app.models.db_models import Document
from app.models.schemas import DocumentMeta, DocumentUpdate

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_schema(doc: Document) -> DocumentMeta:
    return DocumentMeta(
        id=doc.id,
        source_path=doc.source_path,
        file_type=doc.file_type,
        title=doc.title,
        summary=doc.summary,
        tags=doc.tags,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


def _get_or_404(db: Session, document_id: str) -> Document:
    doc = db.query(Document).filter(Document.id == str(document_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("", response_model=list[DocumentMeta])
async def list_documents(db: Session = Depends(get_db)):
    return [_to_schema(d) for d in db.query(Document).order_by(Document.created_at.desc()).all()]


@router.get("/{document_id}", response_model=DocumentMeta)
async def get_document(document_id: UUID, db: Session = Depends(get_db)):
    return _to_schema(_get_or_404(db, str(document_id)))


@router.patch("/{document_id}", response_model=DocumentMeta)
async def update_document(document_id: UUID, body: DocumentUpdate, db: Session = Depends(get_db)):
    doc = _get_or_404(db, str(document_id))
    if body.title is not None:
        doc.title = body.title
    if body.tags is not None:
        doc.tags = body.tags
    db.commit()
    db.refresh(doc)
    return _to_schema(doc)


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: UUID, db: Session = Depends(get_db)):
    doc = _get_or_404(db, str(document_id))
    delete_chunks(str(document_id))
    db.delete(doc)
    db.commit()
