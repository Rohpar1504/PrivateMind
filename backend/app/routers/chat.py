from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import rag
from app.database import get_db
from app.models.schemas import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def chat(body: ChatRequest, db: Session = Depends(get_db)):
    return StreamingResponse(
        rag.stream_rag_response(body.session_id, body.message, db),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/{session_id}", status_code=204)
async def clear_session(session_id: str):
    rag.clear_session(session_id)
