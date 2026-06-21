"""RAG chain: retrieve relevant chunks, stream Ollama response with conversation memory."""

import json

import httpx
from sqlalchemy.orm import Session

from app.chroma import search_chunks
from app.config import get_settings
from app.embeddings import embed
from app.models.db_models import Document
from app.routers.settings import get_current_model

# In-memory session store: session_id -> [{role, content}, ...]
_sessions: dict[str, list[dict]] = {}


def get_session(session_id: str) -> list[dict]:
    return _sessions.setdefault(session_id, [])


def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def _add_message(session_id: str, role: str, content: str) -> None:
    _sessions.setdefault(session_id, []).append({"role": role, "content": content})


def _build_prompt(message: str, context: str, history: list[dict]) -> str:
    history_text = ""
    for msg in history[-6:]:  # keep last 3 exchanges (6 messages)
        label = "Human" if msg["role"] == "user" else "Assistant"
        history_text += f"{label}: {msg['content']}\n"

    return (
        "You are PrivateMind, a helpful assistant that answers questions "
        "based only on the user's personal knowledge base.\n"
        "Use ONLY the context below to answer. "
        "If the answer is not found in the context, say so clearly.\n\n"
        f"Context from knowledge base:\n{context}\n\n"
        + (f"Conversation so far:\n{history_text}\n" if history_text else "")
        + f"Human: {message}\nAssistant:"
    )


async def stream_rag_response(session_id: str, message: str, db: Session):
    """
    Async generator yielding SSE-formatted strings:
      data: {"type": "token",   "content": "<token>"}
      data: {"type": "sources", "content": ["Title 1", "Title 2"]}
      data: {"type": "done"}
    """
    # 1. Retrieve relevant chunks from ChromaDB
    query_embedding = embed([message])[0]
    chunks = search_chunks(query_embedding, top_k=4)

    # 2. Look up document titles from SQLite
    doc_ids = list(dict.fromkeys(c["document_id"] for c in chunks))
    title_map: dict[str, str] = {}
    for doc_id in doc_ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            title_map[doc_id] = doc.title

    context = "\n\n---\n\n".join(c["chunk_text"] for c in chunks)
    source_titles = [title_map.get(did, did) for did in doc_ids]

    # 3. Build prompt with conversation history
    history = get_session(session_id)
    prompt = _build_prompt(message, context, history)

    # 4. Record user message before streaming
    _add_message(session_id, "user", message)

    # 5. Stream tokens from Ollama
    settings = get_settings()
    full_response: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_base_url}/api/generate",
                json={"model": get_current_model(), "prompt": prompt, "stream": True},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    token = data.get("response", "")
                    if token:
                        full_response.append(token)
                        yield f'data: {json.dumps({"type": "token", "content": token})}\n\n'
                    if data.get("done"):
                        break
    except Exception as e:
        yield f'data: {json.dumps({"type": "token", "content": f"[Error: {e}]"})}\n\n'

    # 6. Save assistant reply to session memory
    _add_message(session_id, "assistant", "".join(full_response))

    # 7. Send sources then done signal
    yield f'data: {json.dumps({"type": "sources", "content": source_titles})}\n\n'
    yield f'data: {json.dumps({"type": "done"})}\n\n'
