from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.chroma import search_chunks
from app.database import get_db
from app.embeddings import embed
from app.models.db_models import Document
from app.models.schemas import SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., description="Natural-language search query"),
    top_k: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    query_embedding = embed([q])[0]
    raw_results = search_chunks(query_embedding, top_k=top_k)

    results = []
    for r in raw_results:
        doc = db.query(Document).filter(Document.id == r["document_id"]).first()
        results.append(SearchResult(
            document_id=r["document_id"],
            document_title=doc.title if doc else "Unknown",
            chunk_text=r["chunk_text"],
            score=round(r["score"], 4),
        ))

    results.sort(key=lambda x: x.score, reverse=True)
    return SearchResponse(results=results)
