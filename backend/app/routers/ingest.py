from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.chroma import add_chunks
from app.chunker import chunk_text
from app.config import get_settings
from app.database import get_db
from app.embeddings import embed
from app.models.db_models import Document, RelationshipEdge, SM2Record
from app.models.schemas import IngestResponse
from app.ollama_client import extract_relationships, generate_summary
from app.parsers import extract_text

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile | None = File(None),
    url: str | None = Form(None),
    title: str | None = Form(None),
    tags: str | None = Form(None),
    db: Session = Depends(get_db),
):
    if not file and not url:
        raise HTTPException(status_code=422, detail="Provide either a file or a URL.")

    raw = await file.read() if file else None
    filename = file.filename if file else None

    try:
        text, file_type = extract_text(raw, filename, url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=422, detail="No content could be extracted from this document.")

    embeddings = embed(chunks)

    doc_id = str(uuid4())
    summary = await generate_summary(text)
    doc_title = title or (filename or url or "Untitled").split("/")[-1]
    tag_list = [t.strip() for t in tags.split(",")] if tags else []

    # Save uploaded file to disk so it can be served back later
    saved_file_path: str | None = None
    if raw and filename:
        settings = get_settings()
        files_dir = Path(settings.sqlite_path).parent / "files" / doc_id
        files_dir.mkdir(parents=True, exist_ok=True)
        dest = files_dir / filename
        dest.write_bytes(raw)
        saved_file_path = str(dest)

    doc = Document(
        id=doc_id,
        source_path=url or filename or "",
        file_type=file_type,
        title=doc_title,
        summary=summary,
        _chunk_count=len(chunks),
        file_path=saved_file_path,
    )
    doc.tags = tag_list
    db.add(doc)
    db.flush()

    add_chunks(doc_id, chunks, embeddings)

    # Always review per chunk
    chunk_ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    for cid in chunk_ids:
        db.add(SM2Record(document_id=doc_id, chunk_id=cid, next_review_date=date.today()))

    existing = db.query(Document).filter(Document.id != doc_id).all()
    existing_meta = [{"id": d.id, "title": d.title, "summary": d.summary} for d in existing]
    edges = await extract_relationships(doc_id, doc_title, summary, existing_meta)
    for edge in edges:
        db.add(RelationshipEdge(
            source_doc_id=doc_id,
            target_doc_id=edge["target_doc_id"],
            relationship_type=edge.get("relationship_type", "similar_to"),
            confidence=float(edge.get("confidence", 1.0)),
        ))

    db.commit()

    return IngestResponse(document_id=doc_id, title=doc_title, summary=summary, chunk_count=len(chunks))
