"""LLM-as-a-Judge scorer. Sends retrieved chunks to Ollama for evaluation."""

import json
import re
from dataclasses import dataclass

import httpx

PASS_THRESHOLD = 3.5  # minimum average score (out of 5) to pass a milestone


@dataclass
class JudgeScore:
    question: str
    relevance: float
    faithfulness: float
    completeness: float
    raw_response: str

    @property
    def average(self) -> float:
        return round((self.relevance + self.faithfulness + self.completeness) / 3, 2)

    @property
    def passed(self) -> bool:
        return self.average >= PASS_THRESHOLD

    def __str__(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return (
            f"[{status}] avg={self.average}/5  "
            f"relevance={self.relevance}  faithfulness={self.faithfulness}  completeness={self.completeness}\n"
            f"  Q: {self.question}"
        )


def _extract_scores(text: str) -> tuple[float, float, float]:
    """Parse relevance/faithfulness/completeness scores from LLM JSON output."""
    match = re.search(r"\{[^}]+\}", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            r = float(data.get("relevance", 1))
            f = float(data.get("faithfulness", 1))
            c = float(data.get("completeness", 1))
            return (
                max(1.0, min(5.0, r)),
                max(1.0, min(5.0, f)),
                max(1.0, min(5.0, c)),
            )
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    # Fallback: look for bare numbers in order
    numbers = re.findall(r"\b([1-5](?:\.\d)?)\b", text)
    if len(numbers) >= 3:
        return float(numbers[0]), float(numbers[1]), float(numbers[2])

    return 1.0, 1.0, 1.0


async def score_chunk(
    question: str,
    chunk_text: str,
    expected_contains: list[str],
    ollama_base_url: str,
    ollama_model: str,
) -> JudgeScore:
    """Ask the LLM to score a retrieved chunk on three criteria."""
    expected_str = ", ".join(f'"{k}"' for k in expected_contains)
    prompt = f"""You are evaluating the quality of a document retrieval system.

Question asked: {question}

Retrieved chunk:
\"\"\"
{chunk_text[:1500]}
\"\"\"

Key concepts that should appear in a good answer: {expected_str}

Score this retrieved chunk on three criteria, each from 1 to 5:
- relevance: How relevant is this chunk to the question? (1=completely irrelevant, 5=perfectly on-topic)
- faithfulness: Is the information in this chunk factually grounded and not hallucinated? (1=fabricated, 5=factually sound)
- completeness: Does this chunk address the key concepts listed above? (1=misses all, 5=covers all)

Respond with ONLY a JSON object in this exact format:
{{"relevance": <score>, "faithfulness": <score>, "completeness": <score>}}"""

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{ollama_base_url}/api/generate",
            json={"model": ollama_model, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        raw = resp.json()["response"].strip()

    relevance, faithfulness, completeness = _extract_scores(raw)
    return JudgeScore(
        question=question,
        relevance=relevance,
        faithfulness=faithfulness,
        completeness=completeness,
        raw_response=raw,
    )
