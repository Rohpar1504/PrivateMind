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
git clone <repo-url> && cd PrivateMind

# 2. Copy env file
cp .env.example .env

# 3. Pull your preferred LLM (run on the host if using host Ollama)
ollama pull llama3

# 4. Start all services
docker compose up --build

# 5. Open the app
open http://localhost:5173
# API docs: http://localhost:8000/docs
```

## GPU support (NVIDIA)

To enable GPU passthrough for Ollama, install [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) and uncomment the `deploy` block in `docker-compose.yml` under the `ollama` service.

## Development

```bash
# Backend lint
cd backend && ruff check .

# Backend tests
cd backend && pytest

# Frontend lint
cd frontend && npm run lint

# Frontend tests
cd frontend && npm test
```

## Project structure

```
PrivateMind/
├── backend/          # FastAPI app (embeddings, RAG, scheduler)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── embeddings.py
│   │   ├── models/
│   │   └── routers/
│   └── tests/
├── frontend/         # React + Vite UI
│   └── src/
│       └── pages/    # Home, AddDocument, Search, Chat, Review, Settings
├── docs/
│   ├── SPEC.md
│   └── DECISION_LOG.md
└── docker-compose.yml
```

## Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| M0 — Scaffold | ✅ | Docker Compose, FastAPI skeleton, React skeleton, sentence-transformers loading |
| M1 — Ingest + Search | 🔜 | File parsers, chunking, ChromaDB, standalone search |
| M2 — Conversational QA | 🔜 | LangChain RAG chain, streaming chat |
| M3 — Forgetting Curve | 🔜 | SM-2 scheduler, review UI |
| M4 — Polish + Demo | 🔜 | Settings, relationship graph data, README, demo video |
