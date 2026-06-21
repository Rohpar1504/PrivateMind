"""Semantic chunker: split on paragraph/sentence boundaries."""

import re

MIN_CHUNK_CHARS = 150
MAX_CHUNK_CHARS = 1200


def _split_sentences(text: str) -> list[str]:
    return re.split(r"(?<=[.!?])\s+", text.strip())


def chunk_text(text: str) -> list[str]:
    """Split text into semantically meaningful chunks."""
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    chunks: list[str] = []
    buffer = ""

    for para in paragraphs:
        if len(para) > MAX_CHUNK_CHARS:
            if buffer:
                chunks.append(buffer.strip())
                buffer = ""
            sentences = _split_sentences(para)
            current = ""
            for sentence in sentences:
                if len(current) + len(sentence) > MAX_CHUNK_CHARS and current:
                    chunks.append(current.strip())
                    current = sentence
                else:
                    current = f"{current} {sentence}".strip() if current else sentence
            if current:
                chunks.append(current.strip())
        elif len(buffer) + len(para) > MAX_CHUNK_CHARS:
            if buffer:
                chunks.append(buffer.strip())
            buffer = para
        else:
            buffer = f"{buffer}\n\n{para}".strip() if buffer else para

        if len(buffer) >= MIN_CHUNK_CHARS:
            chunks.append(buffer.strip())
            buffer = ""

    if buffer.strip():
        if chunks and len(buffer) < MIN_CHUNK_CHARS:
            chunks[-1] = f"{chunks[-1]}\n\n{buffer}".strip()
        else:
            chunks.append(buffer.strip())

    return [c for c in chunks if c]
