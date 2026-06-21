"""
LLM-as-a-Judge eval runner.

Usage:
    python -m evals.runner --milestone M1 [--api-url http://localhost:8000] [--ollama-url http://localhost:11434] [--model llama3]
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

import httpx

from evals.judge import PASS_THRESHOLD, JudgeScore, score_chunk

EVALS_DIR = Path(__file__).parent
TEST_DOCS_DIR = EVALS_DIR / "test_docs"
QA_PAIRS_PATH = EVALS_DIR / "qa_pairs.json"


async def ingest_test_docs(api_url: str) -> dict[str, str]:
    """Ingest all test documents and return {filename: document_id}."""
    doc_ids: dict[str, str] = {}
    async with httpx.AsyncClient(timeout=120) as client:
        for doc_path in TEST_DOCS_DIR.glob("*.txt"):
            print(f"  Ingesting {doc_path.name}...")
            with open(doc_path, "rb") as f:
                resp = await client.post(
                    f"{api_url}/ingest",
                    files={"file": (doc_path.name, f, "text/plain")},
                    data={"title": doc_path.stem.replace("_", " ").title(), "granularity": "per_document"},
                )
            if resp.status_code == 200:
                doc_ids[doc_path.name] = resp.json()["document_id"]
                print(f"    ✓ {doc_path.name} → {doc_ids[doc_path.name][:8]}…")
            else:
                print(f"    ✗ Failed to ingest {doc_path.name}: {resp.text}")
    return doc_ids


async def search(api_url: str, question: str, top_k: int = 3) -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{api_url}/search", params={"q": question, "top_k": top_k})
        resp.raise_for_status()
        return resp.json()["results"]


async def run_eval(milestone: str, api_url: str, ollama_url: str, ollama_model: str) -> bool:
    print(f"\n{'='*60}")
    print(f"  PrivateMind LLM-as-a-Judge Eval — {milestone}")
    print(f"{'='*60}\n")

    with open(QA_PAIRS_PATH) as f:
        all_pairs = json.load(f)

    pairs = [p for p in all_pairs if p["milestone"] == milestone]
    if not pairs:
        print(f"No Q&A pairs found for milestone {milestone}.")
        return False

    print(f"[1/3] Ingesting {len(list(TEST_DOCS_DIR.glob('*.txt')))} test documents...")
    doc_ids = await ingest_test_docs(api_url)
    if not doc_ids:
        print("ERROR: No documents were ingested. Is the backend running?")
        return False

    print(f"\n[2/3] Running {len(pairs)} eval queries...\n")
    scores: list[JudgeScore] = []
    retrieval_hits = 0

    for pair in pairs:
        print(f"  Q: {pair['question']}")
        results = await search(api_url, pair["question"])

        if not results:
            print("    ✗ No search results returned\n")
            scores.append(JudgeScore(
                question=pair["question"],
                relevance=1.0, faithfulness=1.0, completeness=1.0,
                raw_response="no results",
            ))
            continue

        top_result = results[0]
        top_doc_id = top_result["document_id"]

        # Check if the top result came from the expected document
        expected_doc_id = doc_ids.get(pair["expected_doc"])
        hit = top_doc_id == expected_doc_id
        if hit:
            retrieval_hits += 1
            print(f"    ✓ Correct document retrieved ({pair['expected_doc']})")
        else:
            retrieved_name = next((k for k, v in doc_ids.items() if v == top_doc_id), "unknown")
            print(f"    ✗ Wrong document: got '{retrieved_name}', expected '{pair['expected_doc']}'")

        score = await score_chunk(
            question=pair["question"],
            chunk_text=top_result["chunk_text"],
            expected_contains=pair["expected_answer_contains"],
            ollama_base_url=ollama_url,
            ollama_model=ollama_model,
        )
        scores.append(score)
        print(f"    {score}\n")

    print(f"[3/3] Results summary\n{'─'*60}")
    avg_relevance = sum(s.relevance for s in scores) / len(scores)
    avg_faithfulness = sum(s.faithfulness for s in scores) / len(scores)
    avg_completeness = sum(s.completeness for s in scores) / len(scores)
    overall_avg = sum(s.average for s in scores) / len(scores)
    retrieval_accuracy = retrieval_hits / len(pairs) * 100

    print(f"  Retrieval accuracy : {retrieval_hits}/{len(pairs)} ({retrieval_accuracy:.0f}%)")
    print(f"  Avg relevance      : {avg_relevance:.2f}/5")
    print(f"  Avg faithfulness   : {avg_faithfulness:.2f}/5")
    print(f"  Avg completeness   : {avg_completeness:.2f}/5")
    print(f"  Overall average    : {overall_avg:.2f}/5  (threshold: {PASS_THRESHOLD}/5)")

    passed = overall_avg >= PASS_THRESHOLD and retrieval_accuracy >= 50
    status = "✓ PASSED" if passed else "✗ FAILED"
    print(f"\n  {status} — {milestone} eval {'passed' if passed else 'did not meet threshold'}")
    print(f"{'='*60}\n")

    return passed


def main() -> None:
    parser = argparse.ArgumentParser(description="Run LLM-as-a-Judge eval for PrivateMind")
    parser.add_argument("--milestone", default="M1", choices=["M1", "M2", "M3", "M4"])
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--ollama-url", default="http://localhost:11434")
    parser.add_argument("--model", default="llama3")
    args = parser.parse_args()

    passed = asyncio.run(run_eval(args.milestone, args.api_url, args.ollama_url, args.model))
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
