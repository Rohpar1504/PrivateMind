"""Extract plain text from various file types."""

import io
from pathlib import Path


def parse_pdf(data: bytes) -> str:
    import fitz  # PyMuPDF
    doc = fitz.open(stream=data, filetype="pdf")
    return "\n\n".join(page.get_text() for page in doc)


def parse_docx(data: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(data))
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def parse_text(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def parse_url(url: str) -> str:
    import trafilatura
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise ValueError(f"Could not fetch URL: {url}")
    text = trafilatura.extract(downloaded)
    if not text:
        raise ValueError(f"Could not extract text from URL: {url}")
    return text


def extract_text(data: bytes | None, filename: str | None, url: str | None) -> tuple[str, str]:
    """Return (text, file_type)."""
    if url:
        return parse_url(url), "web"

    if data is None or filename is None:
        raise ValueError("Must provide either a file or a URL")

    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return parse_pdf(data), "pdf"
    if ext == ".docx":
        return parse_docx(data), "docx"
    if ext in (".md", ".markdown"):
        return parse_text(data), "md"
    return parse_text(data), "txt"
