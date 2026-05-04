import asyncio
import csv
import json
import os
import time

from ai_service.prompts import EVAL_PAPER_CORE_V2_PROMPT
from ai_service.config import get_model_setting
from ai_service.llm import client_configured, get_gemini_response
from ai_service.script_support import (
    benchmark_eval_model,
    build_paper_core_eval_prompt,
    build_run_manifest,
    file_sha256,
    load_paper_core_judge_overrides,
    load_service_env,
    resolve_experiment_identity,
    resolve_experiment_paths,
    resolve_paper_core_query_file,
    write_json_file,
)

load_service_env()
PAPER_CORE_QUERY_PATH = resolve_paper_core_query_file(
    default_version=os.getenv("PAPER_CORE_ZERO_SHOT_VERSION", "paper_core_v2") or "paper_core_v2",
    version_env="PAPER_CORE_ZERO_SHOT_VERSION",
    path_override_env="PAPER_CORE_ZERO_SHOT_QUERY_PATH",
)

EVAL_MODEL = benchmark_eval_model(dataset_name="paper_core")
EVAL_PROMPT = EVAL_PAPER_CORE_V2_PROMPT
PAPER_CORE_JUDGE_OVERRIDES = load_paper_core_judge_overrides()
ZERO_SHOT_MODEL = os.getenv(
    "ADVANCED_ABLATION_ZERO_SHOT_MODEL",
    get_model_setting("zero_shot_generation", "model_id"),
)
EVAL_TIMEOUT_SECONDS = 90
MAX_CONCURRENCY = 10

EXPERIMENT_IDENTITY = resolve_experiment_identity(
    benchmark_name="paper_core",
    default_version="paper_core_v2",
    default_corpus="corpus_v3_scale",
    default_pipeline="Zero_Shot",
    default_judge="paper_core_v2_neutral",
    env_prefix="PAPER_CORE_ZERO_SHOT",
)
RUN_PATHS = resolve_experiment_paths(
    identity=EXPERIMENT_IDENTITY,
    result_filename="results.csv",
    result_override_env="PAPER_CORE_ZERO_SHOT_RESULTS_PATH",
)
CSV_PATH = RUN_PATHS.results_csv


def build_eval_prompt(item: dict[str, object]) -> str:
    return build_paper_core_eval_prompt(EVAL_PROMPT, item, PAPER_CORE_JUDGE_OVERRIDES)


async def evaluate_output(item: dict[str, object], ai_output: str) -> dict:
    if not client_configured():
        return {
            "causality": 0,
            "actionability": 0,
            "novelty": 0,
            "reasoning": "No client",
        }

    query = str(item.get("engineering_query") or item.get("query") or "")
    prompt = f"Query: {query}\n\nGlobal Search Output:\n{ai_output}\n\nProvide your evaluation in JSON."
    system_prompt = build_eval_prompt(item)

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
        if text.startswith("```json"):
            text = text[7:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Eval Error: {e}")
        return {
            "causality": 0,
            "actionability": 0,
            "novelty": 0,
            "reasoning": str(e),
        }


async def process_query(item: dict[str, object]) -> dict[str, object]:
    q_id = item["id"]
    query = item["engineering_query"]

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
        print(f"Gen Error: {e}")
        ai_answer = "Error"

    eval_res = await evaluate_output(item, ai_answer)
    print(
        f"[{q_id}] C={eval_res.get('causality')}, A={eval_res.get('actionability')}, N={eval_res.get('novelty')}"
    )

    return {
        "id": q_id,
        "query": query,
        "mechanism_divergence": 0.0,
        "novelty": eval_res.get("novelty", 0),
        "causality": eval_res.get("causality", 0),
        "actionability": eval_res.get("actionability", 0),
        "error": "",
        "g_eval_reasoning": eval_res.get("reasoning", ""),
    }


def _safe_float(value: object) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def write_summary(
    queries: list[dict[str, object]],
    results: list[dict[str, object]],
    elapsed_seconds: float,
) -> dict[str, object]:
    count = len(results)
    means = {
        "causality": round(sum(_safe_float(r.get("causality")) for r in results) / count, 3)
        if count
        else 0.0,
        "actionability": round(sum(_safe_float(r.get("actionability")) for r in results) / count, 3)
        if count
        else 0.0,
        "novelty": round(sum(_safe_float(r.get("novelty")) for r in results) / count, 3)
        if count
        else 0.0,
    }
    result_by_id = {str(row.get("id")): row for row in results}
    grouped: dict[str, list[dict[str, object]]] = {}
    for item in queries:
        group = str(item.get("benchmark_group") or "ungrouped")
        row = result_by_id.get(str(item.get("id")))
        if row:
            grouped.setdefault(group, []).append(row)

    group_summary: dict[str, dict[str, float]] = {}
    for group, rows in grouped.items():
        g_count = len(rows)
        group_summary[group] = {
            "count": g_count,
            "causality": round(sum(_safe_float(r.get("causality")) for r in rows) / g_count, 3),
            "actionability": round(sum(_safe_float(r.get("actionability")) for r in rows) / g_count, 3),
            "novelty": round(sum(_safe_float(r.get("novelty")) for r in rows) / g_count, 3),
        }

    summary = {
        "query_count": count,
        "fallback_count": sum(1 for r in results if str(r.get("error") or "").strip()),
        "elapsed_seconds": round(elapsed_seconds, 2),
        "means": means,
        "group_summary": group_summary,
    }
    write_json_file(RUN_PATHS.summary_json, summary)
    return summary


def write_manifest(summary: dict[str, object]) -> None:
    manifest = build_run_manifest(
        paths=RUN_PATHS,
        query_path=PAPER_CORE_QUERY_PATH,
        eval_model=EVAL_MODEL,
        command="python -m scripts.run_paper_core_zero_shot",
        metadata={
            "generation_model": ZERO_SHOT_MODEL,
            "summary": summary,
        },
    )
    if CSV_PATH.exists():
        manifest["outputs"]["results_sha256"] = file_sha256(CSV_PATH)
    write_json_file(RUN_PATHS.manifest_json, manifest)


async def _run_bounded(semaphore: asyncio.Semaphore, item: dict[str, object]) -> dict[str, object]:
    async with semaphore:
        return await process_query(item)


async def run() -> None:
    started = time.time()
    with open(PAPER_CORE_QUERY_PATH, encoding="utf-8") as f:
        queries = json.load(f)

    print(
        f"Starting paper-core zero-shot benchmark with {len(queries)} queries from {PAPER_CORE_QUERY_PATH}\n"
        f"Run directory: {RUN_PATHS.run_dir}"
    )

    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
    results = await asyncio.gather(*[_run_bounded(semaphore, q) for q in queries])

    results.sort(key=lambda x: int(str(x["id"]).split("-")[0][1:]))

    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    summary = write_summary(queries, results, elapsed_seconds=time.time() - started)
    write_manifest(summary)
    print(f"Done! Results: {CSV_PATH} | Manifest: {RUN_PATHS.manifest_json}")


if __name__ == "__main__":
    asyncio.run(run())
