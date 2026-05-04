from __future__ import annotations

import asyncio
import csv
import json
import os
import signal
import time
from collections import defaultdict
from pathlib import Path

import requests

from ai_service.prompts import EVAL_PROMPT
from ai_service.config import get_model_setting
from ai_service.llm import client_configured, get_gemini_response
from ai_service.script_support import (
    build_paper_core_eval_prompt,
    benchmark_eval_model,
    build_run_manifest,
    default_service_url,
    file_sha256,
    load_service_env,
    resolve_experiment_identity,
    resolve_experiment_paths,
    resolve_from_service,
    service_request_headers,
    write_json_file,
)

load_service_env()
TREE_URL = f"{default_service_url()}/generate/mechanism-tree"
SEARCH_URL = f"{default_service_url()}/graph/global-search"
SERVICE_HEADERS = service_request_headers()
EVAL_MODEL = benchmark_eval_model()
ZERO_SHOT_MODEL = os.getenv(
    "ADVANCED_ABLATION_ZERO_SHOT_MODEL",
    get_model_setting("zero_shot_generation", "model_id"),
)
HTTP = requests.Session()
HTTP.trust_env = False

REQUEST_TIMEOUT_SECONDS = int(os.getenv("BENCHMARK_REQUEST_TIMEOUT_SECONDS", "120"))
EVAL_TIMEOUT_SECONDS = int(os.getenv("BENCHMARK_EVAL_TIMEOUT_SECONDS", "90"))

# Legacy deep-abstraction cases kept for continuity with earlier reports.
LEGACY_QUERIES = [
    {
        "id": "Q1-Level4",
        "query": "How to design a decentralized financial fraud detection system by mimicking the apoptosis (programmed cell death) mechanism of the human immune system?",
    },
    {
        "id": "Q2-Level4",
        "query": "How to optimize data packet routing latency in an interplanetary communication network using the resource allocation principles of fungal mycelium networks?",
    },
    {
        "id": "Q3-Level3",
        "query": "How to design an adaptive urban traffic light control system based on the swarming intelligence and pheromone trails of ant colonies?",
    },
]
V2_QUERY_PATH = resolve_from_service(
    "benchmarks", "results", "advanced_ablation_v2_queries.json"
)
HEADERS = [
    "id",
    "query",
    "scenario",
    "latency",
    "causality",
    "actionability",
    "novelty",
    "final_score",
    "reasoning",
]


def resolve_query_set() -> str:
    value = os.getenv("ADVANCED_ABLATION_QUERY_SET", "legacy").strip().lower()
    if value in {"legacy", "v1", "default"}:
        return "legacy"
    if value in {"v2", "paper_core_v2"}:
        return "v2"
    if value == "probe":
        return "probe"
    if value == "balanced_probe":
        return "balanced_probe"
    return value


def resolve_query_path(query_set: str) -> Path:
    custom_path = os.getenv("ADVANCED_ABLATION_QUERY_PATH", "").strip()
    if custom_path:
        return Path(custom_path).expanduser().resolve()
    if query_set == "v2":
        return V2_QUERY_PATH
    if query_set == "probe":
        return resolve_from_service(
            "benchmarks", "results", "advanced_ablation_backbone_probe.json"
        )
    if query_set == "balanced_probe":
        return resolve_from_service(
            "benchmarks", "results", "advanced_ablation_balanced_probe.json"
        )
    return resolve_from_service(
        "benchmarks", "results", "advanced_ablation_legacy_queries.json"
    )


def resolve_csv_path(query_set: str) -> Path:
    identity = resolve_experiment_identity(
        benchmark_name="advanced_ablation",
        default_version=f"advanced_ablation_{query_set}",
        default_corpus=os.getenv("ADVANCED_ABLATION_CORPUS_VERSION", "corpus_v3_scale"),
        default_pipeline=os.getenv("ADVANCED_ABLATION_PIPELINE_VARIANT", "ablation_suite"),
        default_judge=os.getenv("ADVANCED_ABLATION_JUDGE_PROFILE", "standard_judge"),
        env_prefix="ADVANCED_ABLATION",
    )
    run_paths = resolve_experiment_paths(
        identity=identity,
        result_filename="results.csv",
        result_override_env="ADVANCED_ABLATION_OUTPUT_PATH",
    )
    resolve_csv_path.run_paths = run_paths  # type: ignore[attr-defined]
    return run_paths.results_csv


def load_queries(query_set: str) -> list[dict[str, str]]:
    path = resolve_query_path(query_set)
    if query_set == "legacy" and not path.exists():
        return LEGACY_QUERIES

    payload = json.loads(path.read_text(encoding="utf-8"))
    return [
        {
            "id": item["id"],
            "query": item.get("engineering_query", item.get("query", "")),
        }
        for item in payload
        if item.get("id") and (item.get("engineering_query") or item.get("query"))
    ]


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


def write_results(csv_path: Path, results: list[dict]) -> None:
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(results)


def _safe_float(value: object) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def write_summary(run_paths, queries: list[dict[str, str]], results: list[dict]) -> dict[str, object]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in results:
        grouped[str(row.get("scenario") or "unknown")].append(row)

    scenario_summary: dict[str, dict[str, float]] = {}
    for scenario, rows in grouped.items():
        count = len(rows)
        scenario_summary[scenario] = {
            "count": count,
            "latency": round(sum(_safe_float(r.get("latency")) for r in rows) / count, 3),
            "causality": round(sum(_safe_float(r.get("causality")) for r in rows) / count, 3),
            "actionability": round(sum(_safe_float(r.get("actionability")) for r in rows) / count, 3),
            "novelty": round(sum(_safe_float(r.get("novelty")) for r in rows) / count, 3),
            "final_score": round(sum(_safe_float(r.get("final_score")) for r in rows) / count, 3),
        }

    summary = {
        "query_count": len(queries),
        "row_count": len(results),
        "scenario_summary": scenario_summary,
    }
    write_json_file(run_paths.summary_json, summary)
    return summary


def write_manifest(
    run_paths,
    query_path: Path,
    summary: dict[str, object],
    query_set: str,
) -> None:
    manifest = build_run_manifest(
        paths=run_paths,
        query_path=query_path,
        eval_model=EVAL_MODEL,
        command="python -m scripts.run_advanced_ablation",
        metadata={
            "query_set": query_set,
            "generation_model": ZERO_SHOT_MODEL,
            "summary": summary,
        },
    )
    if run_paths.results_csv.exists():
        manifest["outputs"]["results_sha256"] = file_sha256(run_paths.results_csv)
    write_json_file(run_paths.manifest_json, manifest)


async def evaluate_output(item: dict, ai_output: str) -> dict:
    if not client_configured():
        return {
            "causality": 0,
            "actionability": 0,
            "novelty": 0,
            "reasoning": "Missing API Key",
        }

    query = str(item.get("query") or item.get("engineering_query") or "")
    prompt = f"Query: {query}\n\nAI Output:\n{ai_output}\n\nProvide your evaluation in JSON."

    from ai_service.prompts import EVAL_PAPER_CORE_V2_PROMPT
    global PAPER_CORE_JUDGE_OVERRIDES
    if item.get("id") and item.get("id").startswith("Q"):
        system_prompt = build_paper_core_eval_prompt(EVAL_PAPER_CORE_V2_PROMPT, item, PAPER_CORE_JUDGE_OVERRIDES)
    else:
        system_prompt = EVAL_PROMPT

    try:
        text = await asyncio.wait_for(
            get_gemini_response(
                prompt=prompt,
                system_instruction=system_prompt,
                json_mode=True,
                model_id=EVAL_MODEL,
                task="benchmark_judge_strict",
                use_cache=False,
            ),
            timeout=EVAL_TIMEOUT_SECONDS,
        )
        return json.loads(text)
    except Exception as e:
        print(f"Evaluation failed: {e}")
        return {
            "causality": 0,
            "actionability": 0,
            "novelty": 0,
            "reasoning": f"Error: {e}",
        }


def build_drr_payload(query: str) -> tuple[str, str, float]:
    start_time = time.time()
    tree_resp = _with_wall_clock_timeout(
        REQUEST_TIMEOUT_SECONDS + 5,
        lambda: HTTP.post(
            TREE_URL,
            json={"query": query},
            headers=SERVICE_HEADERS,
            timeout=REQUEST_TIMEOUT_SECONDS,
        ),
    )
    tree_resp.raise_for_status()
    tree_data = tree_resp.json()
    nodes = tree_data.get("nodes", [])
    ingredients = [
        node.get("active_ingredient")
        for node in nodes[:3]
        if node.get("active_ingredient")
    ]
    if not ingredients:
        return query, "", time.time() - start_time
    tree_output = ", ".join(ingredients)
    search_query = f"{query}. Consider mechanisms like: {tree_output}"
    return search_query, tree_output, time.time() - start_time


async def test_zero_shot_scenario(item: dict):
    q_id = item.get("id", "")
    query = item.get("query") or item.get("engineering_query") or ""
    print("  -> Testing Zero-Shot...")
    start_time = time.time()
    if not client_configured():
        return None

    try:
        prompt = (
            "As a senior engineering expert, answer the following query directly and comprehensively. "
            "Provide specific architectural suggestions or parameters if applicable.\n\n"
            f"Query: {query}"
        )

        ai_answer = await asyncio.wait_for(
            get_gemini_response(
                prompt=prompt,
                model_id=ZERO_SHOT_MODEL,
                task="zero_shot_generation",
                use_cache=False,
            ),
            timeout=EVAL_TIMEOUT_SECONDS,
        )
    except Exception as e:
        print(f"     [Error] Zero-Shot API call failed: {e}")
        return None

    latency = time.time() - start_time
    print(f"     Latency: {latency:.2f}s")

    print("     Evaluating...")
    eval_res = await evaluate_output(item, ai_answer)
    c = eval_res.get("causality", 0)
    a = eval_res.get("actionability", 0)
    n = eval_res.get("novelty", 0)
    final_score = (c * a * n) ** (1 / 3) if (c > 0 and a > 0 and n > 0) else 0.0
    print(f"     Scores (1-5): C={c}, A={a}, N={n}, Final={final_score:.2f}")

    return {
        "id": q_id,
        "query": query,
        "scenario": "Zero_Shot",
        "latency": round(latency, 2),
        "causality": c,
        "actionability": a,
        "novelty": n,
        "final_score": round(final_score, 2),
        "reasoning": eval_res.get("reasoning", ""),
    }


async def test_vector_scenario(item: dict):
    q_id = item.get("id", "")
    query = item.get("query") or item.get("engineering_query") or ""
    return await test_search_scenario(
        q_id=q_id,
        query=query,
        scenario_name="Vector",
        payload={"query": query, "search_mode": "vector", "bypass_critic": False},
        item=item,
    )


async def test_drr_scenario(item: dict, scenario_name, bypass_critic):
    q_id = item.get("id", "")
    query = item.get("query") or item.get("engineering_query") or ""
    try:
        search_query, active_ingredients, tree_latency = build_drr_payload(query)
    except Exception as e:
        print(f"     [Error] Mechanism tree failed: {e}")
        return None
    return await test_search_scenario(
        q_id=q_id,
        query=query,
        scenario_name=scenario_name,
        initial_latency=tree_latency,
        payload={
            "query": search_query,
            "search_mode": "hybrid",
            "active_ingredients": active_ingredients,
            "bypass_critic": bypass_critic,
        },
        item=item,
    )


async def test_search_scenario(
    q_id,
    query,
    scenario_name,
    payload,
    *,
    item: dict,
    initial_latency: float = 0.0,
    **kwargs,
):
    print(f"  -> Testing {scenario_name}...")
    start_time = time.time()
    try:
        resp = _with_wall_clock_timeout(
            REQUEST_TIMEOUT_SECONDS + 5,
            lambda: HTTP.post(
                SEARCH_URL,
                json=payload,
                headers=SERVICE_HEADERS,
                timeout=REQUEST_TIMEOUT_SECONDS,
            ),
        )
        resp.raise_for_status()
        data = resp.json()
        ai_answer = data.get("answer", "")
    except Exception as e:
        print(f"     [Error] API call failed: {e}")
        return None

    latency = initial_latency + (time.time() - start_time)
    print(f"     Latency: {latency:.2f}s")

    if (
        "AI Service not fully configured" in ai_answer
        or "No relevant knowledge" in ai_answer
    ):
        print(f"     [Fallback] {ai_answer}")
        return {
            "id": q_id,
            "query": query,
            "scenario": scenario_name,
            "latency": round(latency, 2),
            "causality": 1,
            "actionability": 1,
            "novelty": 1,
            "final_score": 1.0,
            "reasoning": "Fallback triggered.",
        }

    print("     Evaluating...")
    eval_res = await evaluate_output(item, ai_answer)
    c = eval_res.get("causality", 0)
    a = eval_res.get("actionability", 0)
    n = eval_res.get("novelty", 0)
    final_score = (c * a * n) ** (1 / 3) if (c > 0 and a > 0 and n > 0) else 0.0

    print(f"     Scores (1-5): C={c}, A={a}, N={n}, Final={final_score:.2f}")

    return {
        "id": q_id,
        "query": query,
        "scenario": scenario_name,
        "latency": round(latency, 2),
        "causality": c,
        "actionability": a,
        "novelty": n,
        "final_score": round(final_score, 2),
        "reasoning": eval_res.get("reasoning", ""),
    }


async def run_advanced_benchmark():
    query_set = resolve_query_set()
    query_path = resolve_query_path(query_set)
    queries = load_queries(query_set)
    csv_path = resolve_csv_path(query_set)
    run_paths = getattr(resolve_csv_path, "run_paths")

    print(
        f"🚀 Starting Advanced DRR Benchmark ({query_set} | {len(queries)} queries | 1-5 Scale)\n"
        f"Query file: {query_path}\n"
        f"Output: {csv_path}\n"
        f"Run directory: {run_paths.run_dir}"
    )
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    results = []

    for item in queries:
        q_id = item["id"]
        query = item["query"]
        print(f"\n[{q_id}] {query}")

        # Scenario 0: External zero-shot baseline (no tree, no graph, no DB retrieval)
        res_zero = await test_zero_shot_scenario(item)
        if res_zero:
            results.append(res_zero)

        if os.getenv("ONLY_ZEROSHOT") != "1":
            # Scenario 1: Vector Baseline
            res_vec = await test_vector_scenario(item)
            if res_vec:
                results.append(res_vec)

            # Scenario 2: DRR Draft (Tree-guided, critic bypassed)
            res_draft = await test_drr_scenario(item, "DRR_Draft", bypass_critic=True)
            if res_draft:
                results.append(res_draft)

            # Scenario 3: DRR Final (Tree-guided with critic)
            res_final = await test_drr_scenario(item, "DRR_Final", bypass_critic=False)
            if res_final:
                results.append(res_final)

        write_results(csv_path, results)

    print(f"\n💾 Writing results to {csv_path}...")
    if not results:
        raise SystemExit(
            "Advanced ablation produced no valid rows. Ensure the AI service is running and reachable."
        )
    write_results(csv_path, results)
    summary = write_summary(run_paths, queries, results)
    write_manifest(run_paths, query_path, summary, query_set)

    print(
        f"✅ Advanced Benchmark complete! Summary: {run_paths.summary_json} | Manifest: {run_paths.manifest_json}"
    )


if __name__ == "__main__":
    asyncio.run(run_advanced_benchmark())
