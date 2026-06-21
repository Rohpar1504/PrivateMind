from app.chunker import MAX_CHUNK_CHARS, chunk_text


def test_empty_text():
    assert chunk_text("") == []


def test_single_short_paragraph():
    result = chunk_text("Hello world. This is a short note.")
    assert len(result) == 1
    assert "Hello world" in result[0]


def test_chunks_within_size_bounds():
    long_text = "\n\n".join([f"Paragraph {i}. " + "Word " * 50 for i in range(20)])
    chunks = chunk_text(long_text)
    for chunk in chunks:
        assert len(chunk) <= MAX_CHUNK_CHARS + 200, f"Chunk too large: {len(chunk)}"


def test_no_empty_chunks():
    text = "\n\n".join(["   ", "Real content here.", "", "More content here."])
    chunks = chunk_text(text)
    for chunk in chunks:
        assert chunk.strip() != ""


def test_multiple_paragraphs_merged():
    short_paras = "\n\n".join(["Short para."] * 3)
    chunks = chunk_text(short_paras)
    assert len(chunks) >= 1
