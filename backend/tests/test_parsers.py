from app.parsers import extract_text, parse_text


def test_parse_plain_text():
    data = b"Hello, world. This is a test."
    text, file_type = extract_text(data, "note.txt", None)
    assert "Hello" in text
    assert file_type == "txt"


def test_parse_markdown():
    data = b"# Title\n\nSome **markdown** content."
    text, file_type = extract_text(data, "note.md", None)
    assert "Title" in text
    assert file_type == "md"


def test_requires_file_or_url():
    import pytest
    with pytest.raises(ValueError, match="file or a URL"):
        extract_text(None, None, None)


def test_encoding_fallback():
    data = "café".encode("latin-1")
    result = parse_text(data)
    assert "caf" in result
