"""Unit tests for the chat endpoint and session management."""

import json
from unittest.mock import patch

from app import rag


def test_session_lifecycle():
    """Session is created on first access and cleared on delete."""
    sid = "test-session-abc"
    rag._sessions.pop(sid, None)

    msgs = rag.get_session(sid)
    assert msgs == []

    rag._add_message(sid, "user", "hello")
    assert rag.get_session(sid) == [{"role": "user", "content": "hello"}]

    rag.clear_session(sid)
    assert sid not in rag._sessions


def test_clear_nonexistent_session():
    """Clearing a session that does not exist should not raise."""
    rag.clear_session("nonexistent-session-xyz")


def test_delete_session_endpoint(client):
    resp = client.delete("/chat/some-session-id")
    assert resp.status_code == 204


def test_chat_endpoint_streams(client):
    """POST /chat returns 200 with text/event-stream content type."""

    async def _fake_stream(session_id, message, db):
        yield f'data: {json.dumps({"type": "token", "content": "Hello"})}\n\n'
        yield f'data: {json.dumps({"type": "sources", "content": ["Doc A"]})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'

    with patch("app.routers.chat.rag.stream_rag_response", side_effect=_fake_stream):
        resp = client.post("/chat", json={"session_id": "s1", "message": "hi"})

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    body = resp.text
    assert '"type": "token"' in body
    assert '"type": "sources"' in body
    assert '"type": "done"' in body


def test_chat_session_memory_persists():
    """Messages added to a session accumulate across calls."""
    sid = "memory-test-session"
    rag._sessions.pop(sid, None)

    rag._add_message(sid, "user", "first question")
    rag._add_message(sid, "assistant", "first answer")
    rag._add_message(sid, "user", "follow-up question")

    history = rag.get_session(sid)
    assert len(history) == 3
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[2]["content"] == "follow-up question"

    rag.clear_session(sid)
