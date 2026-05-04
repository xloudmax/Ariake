import asyncio
import csv
import json
import os
import signal
import time
from pathlib import Path

import requests

from ai_service.llm import client_configured, get_gemini_response
from ai_service.prompts import EVAL_PAPER_CORE_V2_PROMPT, EVAL_STANDARD_PROMPT
from ai_service.script_support import (
    benchmark_eval_model,
    build_paper_core_eval_prompt,
    build_run_manifest,
    default_service_url,
    file_sha256,
    load_paper_core_judge_overrides,
    load_service_env,
    resolve_experiment_identity,
    resolve_experiment_paths,
    resolve_from_service,
    resolve_paper_core_query_file,
    service_request_headers,
    write_json_file,
)

load_service_env()
DEFAULT_QUERY_PATH = resolve_from_service("benchmarks", "results", "benchmark_queries.json")
DATASET_NAME = os.getenv("BENCHMARK_QUERY_SET", "").strip().lower()
API_URL = f"{default_service_url()}/graph/global-search"
SERVICE_HEADERS = service_request_headers()
EVAL_MODEL = benchmark_eval_model(dataset_name=DATASET_NAME)
HTTP = requests.Session()
HTTP.trust_env = False

REQUEST_TIMEOUT_SECONDS = int(os.getenv("BENCHMARK_REQUEST_TIMEOUT_SECONDS", "120"))
EVAL_TIMEOUT_SECONDS = int(os.getenv("BENCHMARK_EVAL_TIMEOUT_SECONDS", "90"))


class BenchmarkTimeoutError(RuntimeError):
    pass


def _raise_timeout(_signum, _frame):
    raise BenchmarkTimeoutError("benchmark step timed out")


def _with_wall_clock_timeout(timeout_seconds: int, func):
    previous = signal.signal(signal.SIGALRM, _raise_timeout)
    signal.setitimer(signal.ITIMER_REAL, timeout_seconds)
    try:
        return func()
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


def resolve_query_path() -> Path:
    custom_path = os.getenv("BENCHMARK_QUERY_PATH", "").strip()
    if custom_path:
        return Path(custom_path).expanduser()
    if DATASET_NAME == "paper_core":
        return resolve_paper_core_query_file(
            default_version=os.getenv("BENCHMARK_VERSION", "paper_core_v2") or "paper_core_v2",
            version_env="BENCHMARK_VERSION",
            path_override_env="BENCHMARK_QUERY_PATH",
        )
    return DEFAULT_QUERY_PATH


def resolve_eval_prompt() -> str:
    if DATASET_NAME == "paper_core":
        return EVAL_PAPER_CORE_V2_PROMPT
    return EVAL_STANDARD_PROMPT


def resolve_query_limit(default_limit: int = 10) -> int | None:
    raw = os.getenv("BENCHMARK_QUERY_LIMIT", "").strip()
    if not raw:
        return default_limit
    if raw.lower() == "all":
        return None
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(
            "BENCHMARK_QUERY_LIMIT must be an integer or 'all'"
        ) from exc
    return None if value <= 0 else value


def resolve_identity() -> tuple[str, str, str, str, str]:
    if DATASET_NAME == "paper_core":
        paper_core_version = os.getenv("BENCHMARK_VERSION", "paper_core_v2") or "paper_core_v2"
        return (
            "paper_core",
            paper_core_version,
            os.getenv("BENCHMARK_CORPUS_VERSION", "corpus_v3_scale"),
            os.getenv("BENCHMARK_PIPELINE_VARIANT", "DRR_Final"),
            os.getenv("BENCHMARK_JUDGE_PROFILE", "paper_core_v2_neutral"),
        )
    return (
        DATASET_NAME or "benchmark",
        os.getenv("BENCHMARK_VERSION", "default"),
        os.getenv("BENCHMARK_CORPUS_VERSION", "default"),
        os.getenv("BENCHMARK_PIPELINE_VARIANT", "DRR_Final"),
        os.getenv("BENCHMARK_JUDGE_PROFILE", "standard_judge"),
    )


def load_queries(limit: int | None = 10) -> list[dict[str, object]]:
    with QUERY_PATH.open("r", encoding="utf-8") as handle:
        dataset = json.load(handle)
    
    rows = [
        {
            "id": item["id"],
            "query": item["engineering_query"],
            "engineering_query": item["engineering_query"],
            "ground_truth": item.get("ground_truth", {}),
            "benchmark_group": item.get("benchmark_group", ""),
        }
        for item in dataset
    ]
    return rows if limit is None else rows[:limit]


QUERY_PATH = resolve_query_path()
EVAL_PROMPT = resolve_eval_prompt()
PAPER_CORE_JUDGE_OVERRIDES = load_paper_core_judge_overrides() if DATASET_NAME == "paper_core" else {}
BENCHMARK_NAME, DEFAULT_VERSION, DEFAULT_CORPUS, DEFAULT_PIPELINE, DEFAULT_JUDGE = resolve_identity()
EXPERIMENT_IDENTITY = resolve_experiment_identity(
    benchmark_name=BENCHMARK_NAME,
    default_version=DEFAULT_VERSION,
    default_corpus=DEFAULT_CORPUS,
    default_pipeline=DEFAULT_PIPELINE,
    default_judge=DEFAULT_JUDGE,
    env_prefix="BENCHMARK",
)
RUN_PATHS = resolve_experiment_paths(
    identity=EXPERIMENT_IDENTITY,
    result_filename="results.csv",
    result_override_env="BENCHMARK_RESULTS_PATH",
)
CSV_PATH = RUN_PATHS.results_csv
QUERIES = load_queries(resolve_query_limit())


def build_eval_prompt(item: dict[str, object]) -> str:
    if DATASET_NAME == "paper_core":
        return build_paper_core_eval_prompt(EVAL_PROMPT, item, PAPER_CORE_JUDGE_OVERRIDES)
    return EVAL_PROMPT


async def evaluate_output(item: dict[str, object], ai_output: str) -> dict:
    if not client_configured():
        return {
            "causality": 0,
            "actionability": 0,
            "novelty": 0,
            "reasoning": "Missing LLM API Key for evaluation",
        }

    query = str(item.get("query") or item.get("engineering_query") or "")
    prompt = f"Query: {query}\n\nGlobal Search Output:\n{ai_output}\n\nProvide your evaluation in JSON."
    system_prompt = build_eval_prompt(item)

    try:
        for attempt in range(5):
            try:
                text = await asyncio.wait_for(
                    get_gemini_response(
                        prompt=prompt,
                        system_instruction=system_prompt,
                        json_mode=True,
                        model_id=EVAL_MODEL,
                        task="benchmark_judge",
                        use_cache=False,
                    ),
                    timeout=EVAL_TIMEOUT_SECONDS,
                )
                return json.loads(text)
            except Exception as e:
                if attempt < 4:
                    await asyncio.sleep(15)
                    continue
                raise e
    except Exception as e:
        print(f"Evaluation failed for query '{query}': {e}")
        return {
            "causality": 0,
            "actionability": 0,
            "novelty": 0,
            "reasoning": f"Error: {e}",
        }


def write_results(results: list[dict]) -> None:
    headers = [
        "id",
        "query",
        "mechanism_divergence",
        "novelty",
        "causality",
        "actionability",
        "error",
        "g_eval_reasoning",
    ]
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(results)


def _safe_float(value: object) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def write_summary(results: list[dict], elapsed_seconds: float) -> dict[str, object]:
    query_count = len(results)
    fallback_count = sum(1 for row in results if str(row.get("error") or "").strip())
    means = {
        "causality": round(sum(_safe_float(row.get("causality")) for row in results) / query_count, 3)
        if query_count
        else 0.0,
        "actionability": round(sum(_safe_float(row.get("actionability")) for row in results) / query_count, 3)
        if query_count
        else 0.0,
        "novelty": round(sum(_safe_float(row.get("novelty")) for row in results) / query_count, 3)
        if query_count
        else 0.0,
    }

    group_summary: dict[str, dict[str, float]] = {}
    grouped: dict[str, list[dict]] = {}
    for item, row in zip(QUERIES, results):
        group = str(item.get("benchmark_group") or "ungrouped")
        grouped.setdefault(group, []).append(row)
    for group, rows in grouped.items():
        count = len(rows)
        group_summary[group] = {
            "count": count,
            "causality": round(sum(_safe_float(r.get("causality")) for r in rows) / count, 3),
            "actionability": round(sum(_safe_float(r.get("actionability")) for r in rows) / count, 3),
            "novelty": round(sum(_safe_float(r.get("novelty")) for r in rows) / count, 3),
        }

    summary = {
        "query_count": query_count,
        "fallback_count": fallback_count,
        "elapsed_seconds": round(elapsed_seconds, 2),
        "means": means,
        "group_summary": group_summary,
    }
    write_json_file(RUN_PATHS.summary_json, summary)
    return summary


def write_manifest(summary: dict[str, object]) -> None:
    metadata = {
        "dataset_name": DATASET_NAME or "default",
        "query_limit": resolve_query_limit(),
        "api_url": API_URL,
        "summary": summary,
    }
    manifest = build_run_manifest(
        paths=RUN_PATHS,
        query_path=QUERY_PATH,
        eval_model=EVAL_MODEL,
        command="python -m scripts.run_benchmark",
        metadata=metadata,
    )
    if CSV_PATH.exists():
        manifest["outputs"]["results_sha256"] = file_sha256(CSV_PATH)
    write_json_file(RUN_PATHS.manifest_json, manifest)


async def run_benchmark():
    print(
        f"Starting DRR Benchmark using {QUERY_PATH} ({len(QUERIES)} queries) -> {CSV_PATH}\n"
        f"Run directory: {RUN_PATHS.run_dir}"
    )
    started_at = time.time()
    results = []

    for item in QUERIES:
        q_id = item["id"]
        query = item["query"]
        print(f"\n[{q_id}] Query: {query}")

        # 1. Call AI Service
        try:
            start_time = time.time()
            for attempt in range(3):
                try:
                    resp = _with_wall_clock_timeout(
                        REQUEST_TIMEOUT_SECONDS + 5,
                        lambda: HTTP.post(
                            API_URL,
                            json={"query": query, "search_mode": "hybrid", "bypass_critic": False},
                            headers=SERVICE_HEADERS,
                            timeout=REQUEST_TIMEOUT_SECONDS,
                        ),
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    ai_answer = data.get("answer", "")
                    print(f"  -> Generation completed in {time.time() - start_time:.2f}s")
                    break
                except Exception as e:
                    if attempt < 2:
                        time.sleep(5)
                        continue
                    raise e
        except Exception as e:
            print(f"  -> Service call failed: {e}")
            results.append(
                {
                    "id": q_id,
                    "query": query,
                    "mechanism_divergence": 0.0,
                    "novelty": 0,
                    "causality": 0,
                    "actionability": 0,
                    "error": str(e),
                    "g_eval_reasoning": "Failed to connect to AI Service.",
                }
            )
            write_results(results)
            continue

        if (
            "AI Service not fully configured" in ai_answer
            or "No relevant knowledge" in ai_answer
        ):
            print(f"  -> Service returned fallback/error: {ai_answer}")
            results.append(
                {
                    "id": q_id,
                    "query": query,
                    "mechanism_divergence": 0.0,
                    "novelty": 0,
                    "causality": 0,
                    "actionability": 0,
                    "error": ai_answer,
                    "g_eval_reasoning": "Fallback barrier hit.",
                }
            )
            write_results(results)
            continue

        # 2. Evaluate
        print("  -> Evaluating with G-Eval...")
        eval_res = await evaluate_output(item, ai_answer)

        print(
            f"  -> Scores: Causality={eval_res.get('causality')}, Actionability={eval_res.get('actionability')}, Novelty={eval_res.get('novelty')}"
        )

        results.append(
            {
                "id": q_id,
                "query": query,
                "mechanism_divergence": 0.0,  # Placeholder for backward compatibility
                "novelty": eval_res.get("novelty", 0),
                "causality": eval_res.get("causality", 0),
                "actionability": eval_res.get("actionability", 0),
                "error": "",
                "g_eval_reasoning": eval_res.get("reasoning", ""),
            }
        )
        write_results(results)

    # 3. Write summary + manifest
    print(f"\nWriting results to {CSV_PATH}...")
    write_results(results)
    summary = write_summary(results, elapsed_seconds=time.time() - started_at)
    write_manifest(summary)

    print(
        f"Benchmark complete! Summary: {RUN_PATHS.summary_json} | Manifest: {RUN_PATHS.manifest_json}"
    )


if __name__ == "__main__":
    asyncio.run(run_benchmark())
