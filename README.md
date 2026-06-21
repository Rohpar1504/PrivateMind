# PrivateMind — Local AI Second Brain

An offline AI assistant that ingests your notes and PDFs, answers questions based on them, maps their relationships visually, and resurfaces what you are about to forget.

**Stack:** Python · FastAPI · sentence-transformers · ChromaDB · LangChain · Ollama · React · Docker Compose

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Ollama](https://ollama.com) installed locally (for GPU acceleration) — or use the Ollama Docker service (CPU-only by default)

## Quick start

```bash
# 1. Clone and enter the repo
git clone https://github.com/Rohpar1504/PrivateMind.git && cd PrivateMind

# 2. Start all services
docker compose up --build

# 3. Pull a language model (run once)
docker compose exec ollama ollama pull llama3

# 4. Open the app
open http://localhost:5173
# API docs: http://localhost:8000/docs
```

## GPU support (NVIDIA)

To enable GPU passthrough for Ollama, install [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) and uncomment the `deploy` block in `docker-compose.yml` under the `ollama` service.

## Features

- **Ingest anything** — PDFs, plain text, Markdown, Word docs, and web pages
- **Semantic search** — search by meaning across all your document chunks, with % match scores
- **Document search** — find documents by title or tag, open originals in one click
- **Conversational QA** — ask questions and get answers grounded in your documents (M2)
- **Spaced repetition** — SM-2 scheduler resurfaces content you are about to forget (M3)
- **Fully offline** — no data leaves your machine; all models run locally via Ollama and sentence-transformers

## Development

```bash
# Backend lint
cd backend && ruff check .

# Backend tests
cd backend && pytest

# LLM-as-a-Judge eval (requires docker compose up first)
cd backend && python -m evals.runner --milestone M1

# Frontend lint
cd frontend && npm run lint

# Frontend tests
cd frontend && npm test
```

## Project structure

```
PrivateMind/
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py       # SQLAlchemy + schema migrations
│   │   ├── embeddings.py     # sentence-transformers (HuggingFace, in-process)
│   │   ├── chunker.py        # semantic chunking (150–1200 chars)
│   │   ├── chroma.py         # ChromaDB vector store
│   │   ├── parsers.py        # PDF, DOCX, TXT, MD, web page
│   │   ├── ollama_client.py  # summaries + relationship extraction
│   │   ├── models/
│   │   └── routers/          # ingest, documents, search, chat, review, settings
│   ├── evals/                # LLM-as-a-Judge eval harness
│   └── tests/
├── frontend/                 # React + Vite + TypeScript
│   └── src/
│       └── pages/            # Home, AddDocument, Search, Chat, Review, Settings
├── docs/
│   ├── SPEC.md
│   └── DECISION_LOG.md
└── docker-compose.yml
```

## Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| M0 — Scaffold | ✅ | Docker Compose, FastAPI skeleton, React skeleton, sentence-transformers loading |
| M1 — Ingest + Search | ✅ | File parsers, semantic chunking, ChromaDB, dual-mode search, document library |
| M2 — Conversational QA | 🔜 | LangChain RAG chain, streaming chat, source citations |
| M3 — Forgetting Curve | 🔜 | SM-2 scheduler, review UI, home badge |
| M4 — Polish + Demo | 🔜 | Settings, relationship graph data, demo video |
