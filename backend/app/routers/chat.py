from fastapi import APIRouter

from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory session store: session_id → list of {role, content} dicts
_sessions: dict[str, list[dict]] = {}


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest):
    # TODO (M2): retrieve session history, run LangChain RAG chain, stream response
    _sessions.setdefault(body.session_id, [])
    return ChatResponse(answer="Chat not yet implemented — coming in M2", sources=[])


@router.delete("/{session_id}", status_code=204)
async def clear_session(session_id: str):
    _sessions.pop(session_id, None)
