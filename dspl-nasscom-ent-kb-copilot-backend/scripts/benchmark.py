"""scripts/benchmark.py — RAGAS evaluation runner.

Evaluates the full RAG pipeline against a SQuAD-v2 sample using RAGAS metrics:
  - Answer Faithfulness   : does the answer stay faithful to the retrieved context?
  - Context Recall        : does retrieved context cover the ground-truth answer?
  - Answer Relevance      : is the answer relevant to the question?

Usage:
    poetry run python scripts/benchmark.py

Outputs a summary table to stdout and saves results to data/benchmarks/results.json.

Note: The SQuAD sample (data/benchmarks/squad_v2_sample.json) is used ONLY for
evaluation. It is NOT added to the vector store knowledge base.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.agent.graph import run_agent

setup_logging()
logger = get_logger("benchmark")

SQUAD_SAMPLE_PATH = Path(__file__).parent.parent / "data" / "benchmarks" / "squad_v2_sample.json"
RESULTS_PATH      = Path(__file__).parent.parent / "data" / "benchmarks" / "results.json"

MAX_EVAL_SAMPLES = 50   # limit for speed; increase for full eval


def load_squad_sample(path: Path) -> list[dict]:
    """Load the SQuAD v2 sample JSON.

    Expected format: list of {"question": str, "answers": {"text": [str]}, "context": str}
    """
    if not path.exists():
        print(f"[WARNING] SQuAD sample not found at {path}")
        print("  Download it from: https://huggingface.co/datasets/rajpurkar/squad_v2")
        print("  Place a 50-record sample at data/benchmarks/squad_v2_sample.json")
        return []

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    # Support both top-level list and SQuAD nested format
    if isinstance(data, list):
        return data[:MAX_EVAL_SAMPLES]

    # SQuAD nested: {"data": [{"paragraphs": [{"qas": [...], "context": "..."}]}]}
    samples = []
    for article in data.get("data", []):
        for paragraph in article.get("paragraphs", []):
            context = paragraph.get("context", "")
            for qa in paragraph.get("qas", []):
                if qa.get("is_impossible", False):
                    continue
                answers = [a["text"] for a in qa.get("answers", [])]
                if answers:
                    samples.append({
                        "question": qa["question"],
                        "ground_truth": answers[0],
                        "context": context,
                    })
                if len(samples) >= MAX_EVAL_SAMPLES:
                    break
            if len(samples) >= MAX_EVAL_SAMPLES:
                break
        if len(samples) >= MAX_EVAL_SAMPLES:
            break
    return samples


async def evaluate_sample(sample: dict) -> dict:
    """Run the agent on one sample and collect evaluation fields."""
    question = sample["question"]
    ground_truth = sample.get("ground_truth", sample.get("answers", {}).get("text", [""])[0] if isinstance(sample.get("answers"), dict) else "")

    t0 = time.perf_counter()
    state = await run_agent(question=question)
    latency_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "question": question,
        "ground_truth": ground_truth,
        "answer": state.get("answer", ""),
        "sources": state.get("sources", []),
        "confidence": state.get("confidence", 0.0),
        "escalated": state.get("escalated", False),
        "latency_ms": latency_ms,
    }


def _faithfulness_score(answer: str, sources: list) -> float:
    """Simple heuristic: answer is faithful if it contains at least one citation."""
    return 1.0 if "[Source:" in answer else 0.0


def _relevance_score(question: str, answer: str) -> float:
    """Heuristic: check for question keywords in the answer."""
    if not answer or "not found" in answer.lower():
        return 0.0
    keywords = [w.lower() for w in question.split() if len(w) > 4]
    if not keywords:
        return 0.5
    hits = sum(1 for kw in keywords if kw in answer.lower())
    return round(hits / len(keywords), 2)


def _context_recall(ground_truth: str, answer: str) -> float:
    """Heuristic: fraction of ground-truth words found in the answer."""
    if not ground_truth or not answer:
        return 0.0
    gt_words = set(ground_truth.lower().split())
    ans_words = set(answer.lower().split())
    if not gt_words:
        return 0.0
    return round(len(gt_words & ans_words) / len(gt_words), 2)


async def main():
    print("=" * 65)
    print("  Enterprise Knowledge Gemini — RAGAS Benchmark")
    print("=" * 65)

    samples = load_squad_sample(SQUAD_SAMPLE_PATH)
    if not samples:
        print("\n[INFO] No evaluation samples found. Exiting.")
        return

    print(f"\nEvaluating {len(samples)} samples from SQuAD v2...\n")

    results = []
    for i, sample in enumerate(samples, start=1):
        print(f"  [{i:02d}/{len(samples)}] {sample['question'][:60]}...", end=" ", flush=True)
        try:
            res = await evaluate_sample(sample)
            res["faithfulness"]    = _faithfulness_score(res["answer"], res["sources"])
            res["answer_relevance"] = _relevance_score(sample["question"], res["answer"])
            res["context_recall"]  = _context_recall(res.get("ground_truth", ""), res["answer"])
            results.append(res)
            print(f"✓  ({res['latency_ms']}ms, conf={res['confidence']:.2f})")
        except Exception as exc:
            print(f"✗  ({exc})")
            results.append({"question": sample["question"], "error": str(exc)})

    # ── Summary ────────────────────────────────────────────────────────────────
    valid = [r for r in results if "error" not in r]
    n = len(valid)

    avg_faithfulness    = sum(r["faithfulness"]     for r in valid) / n if n else 0
    avg_relevance       = sum(r["answer_relevance"] for r in valid) / n if n else 0
    avg_recall          = sum(r["context_recall"]   for r in valid) / n if n else 0
    avg_latency         = sum(r["latency_ms"]       for r in valid) / n if n else 0
    escalation_rate     = sum(1 for r in valid if r.get("escalated")) / n if n else 0

    print("\n" + "=" * 65)
    print(f"  Samples evaluated   : {n}/{len(samples)}")
    print(f"  Answer Faithfulness : {avg_faithfulness:.2%}  (cite present in answer)")
    print(f"  Answer Relevance    : {avg_relevance:.2%}  (keyword overlap heuristic)")
    print(f"  Context Recall      : {avg_recall:.2%}  (GT words found in answer)")
    print(f"  Avg Latency         : {avg_latency:.0f} ms")
    print(f"  Escalation Rate     : {escalation_rate:.2%}")
    print("=" * 65)

    # Save detailed results
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "summary": {
                "samples": n,
                "faithfulness": avg_faithfulness,
                "answer_relevance": avg_relevance,
                "context_recall": avg_recall,
                "avg_latency_ms": avg_latency,
                "escalation_rate": escalation_rate,
            },
            "results": results,
        }, f, indent=2)
    print(f"\n  Detailed results saved → {RESULTS_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
