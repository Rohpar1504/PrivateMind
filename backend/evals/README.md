# LLM-as-a-Judge Eval Harness

Automated evaluation suite for PrivateMind. Ingests known test documents, runs ground-truth queries, and uses a local LLM to score retrieval and answer quality.

## How to run

Make sure `docker compose up` is running, then from the `backend/` directory:

```bash
# M1 — search retrieval quality
python -m evals.runner --milestone M1

# M2+ — chat answer quality (adds M2 Q&A pairs)
python -m evals.runner --milestone M2

# Override API or Ollama URLs
python -m evals.runner --milestone M1 --api-url http://localhost:8000 --ollama-url http://localhost:11434 --model mistral
```

Exit code `0` = passed, `1` = failed (suitable for CI gates).

## Pass criteria

A milestone passes if:
- **Overall average score ≥ 3.5 / 5.0** across all Q&A pairs
- **Retrieval accuracy ≥ 50%** — the correct document is the top result for at least half the queries

## Scoring criteria (per retrieved chunk, 1–5 each)

| Criterion | What it measures |
|-----------|-----------------|
| **Relevance** | Is the retrieved chunk on-topic for the question? |
| **Faithfulness** | Is the information factually grounded, not hallucinated? |
| **Completeness** | Does the chunk cover the key concepts expected in a good answer? |

## Adding Q&A pairs

Edit `qa_pairs.json`. Each entry needs:
- `id` — unique string (e.g. `m2-004`)
- `milestone` — `M1`, `M2`, `M3`, or `M4`
- `question` — the natural language query
- `expected_doc` — filename in `test_docs/` that should be the top result
- `expected_answer_contains` — list of key terms the chunk should mention

## Adding test documents

Drop any `.txt` file into `test_docs/`. The runner ingests all `.txt` files automatically.
