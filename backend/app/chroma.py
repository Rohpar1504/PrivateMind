"""ChromaDB client — singleton collection."""

from functools import lru_cache

import chromadb

from app.config import get_settings


@lru_cache(maxsize=1)
def get_chroma_collection():
    settings = get_settings()
    client = chromadb.PersistentClient(path=settings.chroma_path)
    return client.get_or_create_collection("documents", metadata={"hnsw:space": "cosine"})


def add_chunks(doc_id: str, chunks: list[str], embeddings: list[list[float]]) -> list[str]:
    collection = get_chroma_collection()
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"document_id": doc_id, "chunk_index": i} for i in range(len(chunks))],
    )
    return ids


def search_chunks(query_embedding: list[float], top_k: int = 6) -> list[dict]:
    collection = get_chroma_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        include=["documents", "metadatas", "distances"],
    )
    output = []
    for i, doc_text in enumerate(results["documents"][0]):
        output.append({
            "chunk_text": doc_text,
            "document_id": results["metadatas"][0][i]["document_id"],
            "score": 1 - results["distances"][0][i],  # cosine similarity
        })
    return output


def delete_chunks(doc_id: str) -> None:
    collection = get_chroma_collection()
    existing = collection.get(where={"document_id": doc_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
