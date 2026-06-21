"""Thin async client for Ollama text generation."""

import json
import re

import httpx

from app.config import get_settings
from app.routers.settings import get_current_model


async def _generate(prompt: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={"model": get_current_model(), "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"].strip()


async def generate_summary(text: str) -> str:
    excerpt = text[:3000]
    prompt = (
        "Summarize the following document in 2-3 sentences. "
        "Be concise and capture the main topic and key points only.\n\n"
        f"Document:\n{excerpt}\n\nSummary:"
    )
    return await _generate(prompt)


async def extract_relationships(doc_id: str, title: str, summary: str, existing_docs: list[dict]) -> list[dict]:
    """Return list of {target_doc_id, relationship_type, confidence}."""
    if not existing_docs:
        return []

    doc_list = "\n".join(f"- id={d['id']} title={d['title']} summary={d['summary']}" for d in existing_docs[:20])
    prompt = (
        "You are analyzing relationships between documents in a knowledge base.\n\n"
        f"New document:\nTitle: {title}\nSummary: {summary}\n\n"
        f"Existing documents:\n{doc_list}\n\n"
        "For each existing document that has a meaningful relationship to the new document, "
        "output a JSON array of objects with keys: target_doc_id, relationship_type, confidence.\n"
        "relationship_type must be one of: references, contradicts, expands_on, similar_to.\n"
        "confidence is a float 0-1. Only include relationships with confidence >= 0.5.\n"
        "If no relationships exist, return an empty array [].\n"
        "Return ONLY the JSON array, no other text."
    )
    raw = await _generate(prompt)
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        return []
    try:
        edges = json.loads(match.group())
        return [e for e in edges if isinstance(e, dict) and "target_doc_id" in e]
    except json.JSONDecodeError:
        return []
