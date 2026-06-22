# PrivateMind — Project Specification

---

## 1. Project Overview

**Project Name:**
> PrivateMind — Local AI Second Brain

**One-line description:**
> An offline AI assistant that ingests your notes and PDFs, answers questions based on them, maps their relationships visually, and resurfaces what you are about to forget.

**Problem Statement:**
> Students, researchers, and knowledge workers accumulate notes across many tools (Notion, PDFs, text files, etc.) but struggle to find information when they need it and forget material they have already read. Current solutions either require cloud access (risking privacy) or lack intelligent retrieval and proactive memory support.

**Target User:**
> Students, researchers, and knowledge workers who consume large volumes of notes and documents, value privacy, and want an intelligent assistant that works entirely on their own machine.

**Core Value Proposition:**
> Two compounding differentiators: (1) fully offline — every note, embedding, and query stays on your machine, nothing sent to any cloud; (2) proactive forgetting-curve scheduler — the system tells you what you are about to forget before you lose it, which no mainstream knowledge tool does.

---

## 2. Goals & Success Metrics

**Primary Goals:**
> _List 2–4 concrete goals for v1._
- [ ] Goal 1:
- [ ] Goal 2:
- [ ] Goal 3:

**Non-Goals (explicitly out of scope):**
> _What are you deliberately NOT building?_
-
-

**Success Metrics:**
> _How will you know this project is working? (quantitative where possible)_
-
-

---

## 3. Features & Scope

### Must-Have (v1)
| Feature | Description | Priority |
|---------|-------------|----------|
| Multi-format ingestion | Ingest PDFs, plain text, Markdown, Word docs, and web pages into the local knowledge base | P0 |
| Semantic search | Query documents by meaning, not just keywords; return relevant chunks with source attribution | P0 |
| Multi-turn conversational Q&A | LangChain RAG chain with session-level chat history so follow-up questions build on prior answers | P0 |
| Forgetting-curve scheduler | SM-2 Ebbinghaus algorithm per note; surfaces notes due for review each day | P0 |
| Review UI — list mode | "Notes due today" list with a one-click "mark reviewed" button | P0 |
| Review UI — flashcard mode | Card-flip interaction for users who prefer active recall; user selects mode preference | P0 |

### Nice-to-Have (v2+)
| Feature | Description |
|---------|-------------|
| Visual relationship map | Interactive graph in React showing connections between notes (most technically distinct piece; cut to v2 if time is tight) |
| Browser extension | Clip web pages directly from the browser into the knowledge base |
| Export / backup | Export the local ChromaDB + metadata to a portable archive |

### Unique Differentiator
> The Ebbinghaus forgetting-curve scheduler assigns each ingested document an SM-2 spaced-repetition state (ease factor, interval, next review date). Each day the system computes which notes are due and surfaces them in the Review UI. The user can work through them as a simple list or as flashcards, then mark each reviewed — which updates the interval and schedules the next review. No other personal knowledge tool does this proactively.

---

## 4. Technical Architecture

**Stack:**
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React | |
| Backend / API | FastAPI (Python) | |
| LLM Runtime | Ollama (configurable model — Llama 3, Mistral, etc.) | User selects model in settings |
| Embeddings | sentence-transformers (HuggingFace, runs in-process) | Default: `all-MiniLM-L6-v2` or `bge-large` |
| Vector Store | ChromaDB | Local persistent store |
| Orchestration | LangChain | RAG chain + session chat history |
| Chunking | Semantic (paragraph/section boundaries) | Applied uniformly across all file types |

**Ingestion Pipeline (data flow):**
```
Raw file / URL
  → Parser (PyMuPDF / python-docx / markdown / BeautifulSoup)
  → Semantic chunker
  → sentence-transformers embedding (in-process)
  → ChromaDB (vectors + chunk metadata)
  → LLM summary generation (Ollama)
  → Relationship extraction (Ollama)
  → SQLite / local DB (document metadata + SM-2 state + relationship edges)
```

**Query / Chat flow:**
```
User message + session history
  → sentence-transformers embedding
  → ChromaDB similarity search (top-k chunks)
  → LangChain RAG chain (retrieved chunks + history → Ollama LLM)
  → Streamed response with source attribution
```

**Offline / Privacy Constraints:**
> All document content, embeddings, metadata, and LLM inference stay on the local machine. The only exceptions are one-time downloads: Ollama model weights and the HuggingFace sentence-transformers model (both cached locally after first download).

**Deployment Target:**
> Docker Compose from day one for portability across machines. Services: (1) FastAPI backend + sentence-transformers, (2) Ollama, (3) React frontend (served via nginx or Vite dev server). ChromaDB and SQLite run as local volumes mounted into the backend container.

---

## 5. Data Model

**Document / Note Schema:**

Each ingested document is stored with the following metadata (separate from its chunks/embeddings in ChromaDB):

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `source_path` | string | Absolute local path or URL for web pages |
| `file_type` | enum | `pdf`, `txt`, `md`, `docx`, `web` |
| `title` | string | Auto-extracted or user-set at ingest time |
| `summary` | string | LLM-generated at ingest time (1–3 sentences) |
| `tags` | string[] | User-applied; editable after ingest |
| `created_at` | timestamp | When the document was ingested |
| `updated_at` | timestamp | Last metadata edit |
| `chunk_ids` | string[] | References to ChromaDB chunk records |

**Memory Graph:**

Relationships are extracted at ingest time (even though the visual graph is v2) so the data is ready when the graph is built. Stored as a simple edge table:

| Field | Type | Notes |
|-------|------|-------|
| `source_doc_id` | UUID | FK → document |
| `target_doc_id` | UUID | FK → document |
| `relationship_type` | enum | e.g. `references`, `contradicts`, `expands_on`, `similar_to` |
| `confidence` | float | LLM-assigned confidence score (0–1) |
| `extracted_at` | timestamp | |

**Forgetting Curve State:**

SM-2 state is tracked at two granularities, user-selectable per document at ingest time:
- **Per-document mode:** one SM-2 record for the whole document (simpler; good for short notes)
- **Per-chunk mode:** one SM-2 record per chunk (more granular; better for long docs/PDFs)

SM-2 record schema (applies to both modes):

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `document_id` | UUID | FK → document |
| `chunk_id` | string \| null | null in per-document mode |
| `ease_factor` | float | Starts at 2.5; adjusted after each review |
| `interval_days` | int | Days until next review; starts at 1 |
| `repetitions` | int | Count of successful reviews |
| `last_reviewed_at` | timestamp | |
| `next_review_date` | date | Computed after each review |

---

## 6. User Flows

### 6.1 Ingesting a Document
1. User navigates to the "Add Document" screen.
2. User selects a file via drag-and-drop or file picker (PDF, TXT, MD, DOCX) — or pastes a URL for a web page.
3. User optionally sets a title, tags, and SM-2 granularity (per-document or per-chunk; defaults to per-document).
4. User clicks "Ingest."
5. Backend parses the file using the appropriate parser (PyMuPDF / python-docx / markdown / BeautifulSoup).
6. Backend applies semantic chunking and generates embeddings via sentence-transformers (in-process).
7. Chunks and vectors are stored in ChromaDB.
8. Backend calls Ollama to generate a 1–3 sentence summary and extract relationship edges.
9. Backend writes the document metadata record, relationship edges, and SM-2 state record(s) to SQLite.
10. Frontend shows a progress indicator during steps 5–9, then a success screen displaying the auto-generated summary and any detected relationships.

### 6.2 Semantic Search
**Standalone search screen:**
1. User navigates to the "Search" screen.
2. User types a natural-language query into the search bar.
3. Backend embeds the query via sentence-transformers, runs ChromaDB similarity search, returns top-k chunks.
4. Frontend displays a ranked list of matching chunks, each showing: source document title, relevant snippet, and a link to open the full document.
5. User can click a result to open the source document or pivot the query into a chat session.

**Chat-based search (see 6.3):**
- Users can also retrieve information by asking questions in the chat interface, which returns a synthesized answer with inline source citations rather than a raw chunk list.

### 6.3 Conversational Querying
1. User navigates to the "Chat" screen.
2. User types a question. Session chat history is maintained in memory for the duration of the session (not persisted across sessions in v1).
3. Backend embeds the question, retrieves top-k chunks from ChromaDB, feeds chunks + session history into the LangChain RAG chain.
4. Ollama generates a response grounded in the retrieved chunks.
5. Frontend streams the response with inline source citations (document title + chunk reference).
6. User can ask follow-up questions; prior Q&A is included in the context window automatically.
7. Session history is cleared when the user starts a new session or refreshes the page.

### 6.4 Forgetting Curve Review Session
**Proactive notification:**
1. When the app loads, the backend computes how many SM-2 records have `next_review_date` ≤ today.
2. If any are due, a badge/banner is shown on the home screen: e.g. "5 notes due for review today."
3. User can click it to go directly to the Review screen.

**Review screen:**
1. User navigates to the "Review" section (accessible from nav regardless of badge).
2. Screen shows two tabs: "Due Today" and "Completed."
3. **Due Today tab:** lists all documents/chunks due for review with title, summary, and tags.
   - **List mode:** each item has a "Mark Reviewed" button. Clicking it triggers SM-2 update (increments repetitions, recalculates interval and next_review_date).
   - **Flashcard mode (opt-in, Study Mode):** a "Study Mode" toggle in the Review screen enables flashcard view. Hidden by default — general users never see it. When enabled, each card shows the title/summary on the front; flip reveals the full content. User rates recall ("Easy / Hard") which feeds into the SM-2 ease_factor adjustment.
   - Default mode is list. Study Mode toggle state persisted in localStorage.
4. **Completed tab:** shows all items reviewed today with their next scheduled review date. User can manually mark an item as reviewed here if they missed clicking it during review.

---

## 7. API Design

**Key Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Upload a file or URL; returns document ID and auto-generated summary |
| `GET` | `/documents` | List all ingested documents with metadata |
| `GET` | `/documents/{id}` | Get a single document's metadata, tags, and SM-2 state |
| `PATCH` | `/documents/{id}` | Update title or tags on an existing document |
| `DELETE` | `/documents/{id}` | Remove a document and its chunks/embeddings |
| `GET` | `/search?q=...` | Semantic search; returns ranked chunk list with source attribution |
| `POST` | `/chat` | Send a message; body includes `session_id` and `message`; returns streamed LLM response with citations |
| `DELETE` | `/chat/{session_id}` | Clear server-side session history |
| `GET` | `/review/due` | Get all SM-2 records due today |
| `GET` | `/review/completed` | Get all records reviewed today |
| `POST` | `/review/{sm2_id}/complete` | Mark reviewed; body contains `rating: easy\|hard`; triggers SM-2 update |
| `GET` | `/settings` | Get current app settings (selected Ollama model, etc.) |
| `PATCH` | `/settings` | Update settings |

**Session Management:**
Chat session history is held server-side in memory, keyed by a `session_id` (UUID generated client-side on new session start). The React frontend sends the `session_id` with every `/chat` request. The backend appends each exchange to the session's history buffer and feeds the full buffer into the LangChain RAG chain. Sessions are cleared on explicit `DELETE /chat/{session_id}` or on server restart.

---

## 8. UI / UX

**Interface Type:**
> Web app (React), desktop-only in v1.

**Key Screens / Views:**
1. **Home / Dashboard** — summary stats (total documents, notes due today), badge/banner for due reviews, quick-access nav
2. **Add Document** — file drag-and-drop / file picker / URL input; title, tags, SM-2 granularity fields; progress indicator during ingest
3. **Search** — natural-language search bar; ranked chunk results with source title, snippet, and link
4. **Chat** — multi-turn conversation interface; streamed responses with inline source citations; new session button
5. **Review** — "Due Today" and "Completed" tabs; list mode by default; "Study Mode" toggle reveals flashcard view
6. **Settings** — Ollama model selector (dropdown of locally pulled models); other app preferences

**Design Constraints:**
> - Desktop-only in v1 (no mobile responsiveness required)
> - All UI must function fully offline — no CDN assets, no external font or icon fetches at runtime
> - Loading/progress states required for all async operations (ingest, search, chat streaming)
> - Study Mode (flashcard view) must be visually distinct from list mode and hidden behind an explicit toggle so general users do not encounter it by default

---

## 9. Testing Strategy

Each milestone (M0–M4) must pass all four test layers before being considered complete.

| Layer | Tool / Approach | What it covers |
|-------|----------------|----------------|
| **Lint** | `ruff` (Python), `eslint` + `prettier` (React) | Code style, unused imports, type errors |
| **Unit** | `pytest` (Python), `vitest` or `jest` (React) | Individual functions: chunker, SM-2 scheduler logic, API endpoint handlers, React components |
| **User** | Manual walkthrough of each user flow in §6 against a local Docker instance | End-to-end correctness, UX clarity, edge cases (empty states, large files, bad URLs) |
| **LLM-as-a-Judge** | `python -m evals.runner --milestone <M>` — ingests 3 known test documents, runs ground-truth Q&A pairs, scores top retrieved chunk per question via local Ollama LLM | Quality of retrieval and generation; catches regressions in chunking or prompt changes |
| **User** | Per-milestone checklist (see below) — manual walkthrough of each user flow against a running Docker instance | End-to-end correctness, UX clarity, edge cases (empty states, bad URLs, large files) |

**LLM-as-a-Judge eval criteria (per retrieved chunk, scored 1–5):**
- **Relevance:** Is the chunk on-topic for the question?
- **Faithfulness:** Is the information factually grounded, not hallucinated?
- **Completeness:** Does the chunk cover the key concepts expected in a good answer?

**Pass criteria:** overall average ≥ 3.5/5.0 AND retrieval accuracy ≥ 50% (correct document is top result for ≥ half of queries).

**Test document set** (`backend/evals/test_docs/`):
- `ml_basics.txt` — machine learning fundamentals (supervised learning, overfitting, gradient descent)
- `spaced_repetition.txt` — Ebbinghaus forgetting curve and SM-2 algorithm
- `python_tips.txt` — Python best practices (generators, context managers, type hints)

**Ground-truth Q&A pairs** (`backend/evals/qa_pairs.json`): 6 pairs active from M1, 3 additional from M2. Each pair specifies the expected source document and key concepts the retrieved chunk must contain.

**User Testing Checklists (per milestone):**

_M1 — Ingest + Search:_
- [ ] App loads at `http://localhost:5173`, Home shows 0 documents
- [ ] Ingest a PDF → success banner with summary and chunk count appears
- [ ] Ingest a web URL → success
- [ ] Ingest a `.txt` or `.md` file → success
- [ ] Home document count increments after each ingest
- [ ] Search a term matching ingested content → ranked result cards appear with title, snippet, match %
- [ ] Search a term with no match → "No results found" message
- [ ] Search button disabled when query is empty
- [ ] Backend stopped → search shows error message, not blank screen

_M2 — Conversational QA:_
- [ ] Chat screen loads with empty message list
- [ ] Send a question → streamed response appears with source citations
- [ ] Follow-up question references prior answer correctly (multi-turn)
- [ ] "New session" clears history and starts fresh
- [ ] Long session (5+ turns) does not error

_M3 — Forgetting Curve:_
- [ ] Home badge shows correct count of notes due today after ingest
- [ ] Review screen "Due Today" tab shows all due items
- [ ] List mode: "Mark Reviewed" button updates item to Completed tab
- [ ] Study Mode toggle reveals flashcard view; hidden by default
- [ ] Flashcard flip works; Easy/Hard rating updates next review date
- [ ] "Completed" tab shows reviewed items with next scheduled date
- [ ] After marking all reviewed, badge on Home disappears

_M3.5 — Onboarding & Modes:_
- [ ] Fresh load (no `pm_mode` in localStorage) → Onboarding modal appears, covers full screen
- [ ] Each of the three option cards is selectable; "Get started" button disabled until a mode is chosen
- [ ] Educational mode: Review appears in nav; To-Do absent
- [ ] Personal mode: Review and To-Do both absent from nav
- [ ] Business mode: To-Do appears in nav; Review absent
- [ ] Home page shows correct stat card and quick-action for the chosen mode
- [ ] Home banner: Educational → review banner (if due); Business → To-Do overdue banner (if overdue)
- [ ] To-Do page: add a task, check it off, delete it; due-date highlights (due today / overdue)
- [ ] Settings → "Change mode" → Onboarding modal re-appears; picking a new mode takes effect immediately
- [ ] Mode badge in sidebar footer shows current mode label

_M4 — Polish + Demo:_
- [ ] Settings screen: change Ollama model → chat uses new model
- [ ] All four flows (ingest, search, chat, review) work end-to-end without errors
- [ ] App works fully offline (disconnect network, reload — no broken assets)
- [ ] README quick-start instructions work on a fresh machine

---

## 10. Risks & Open Questions

| Risk / Question | Likelihood | Impact | Mitigation |
|----------------|-----------|--------|------------|
| | | | |
| | | | |

---

## 10. Timeline & Milestones

> _Estimated 3–4 weeks total per concept card._

| Milestone | Target Date | Description | Test Gates |
|-----------|-------------|-------------|------------|
| M0 — Scaffold | ✅ Complete | Repo, Docker Compose, FastAPI + React skeleton, Ollama running, sentence-transformers loading | Lint |
| M1 — Ingest + Search | ✅ Complete | All file type parsers, semantic chunker, ChromaDB storage, dual-mode search, document library, per-chunk SM-2 default | Lint, Unit, User, LLM-as-a-Judge |
| M2 — Conversational QA | ✅ Complete | Streaming RAG chain, server-side session history, chat sidebar, stop/edit/floating bubble, background stream notifications | Lint, Unit, User, LLM-as-a-Judge |
| M3 — Forgetting Curve | ✅ Complete | SM-2 scheduler, review screen (list mode + Study Mode), home screen badge | Lint, Unit, User |
| M3.5 — Onboarding & Modes | ✅ Complete | First-load mode picker (Educational/Personal/Business), mode-aware nav, To-Do page, Settings mode switcher | Lint, Build, User |
| M4 — Polish + Demo | 🔜 | Settings screen, relationship extraction, README, demo video, portfolio-ready | All four layers + full regression pass |

---

## 11. References & Inspiration

> _Links, papers, competing tools, or prior art you're drawing on._
-
-
