from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import subprocess
import sys
import time
from contextlib import suppress
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

from ai_service.openalex_corpus import corpus_artifact_paths
from ai_service.script_support import (
    ExperimentPaths,
    load_service_env,
    resolve_experiment_identity,
    resolve_experiment_paths,
    resolve_from_service,
    resolve_latest_run_result,
)
from scripts.run_postgres_smoke import (
    _create_temp_db,
    _database_urls,
    _drop_temp_db,
)

DEFAULT_PORT = 18000
DEFAULT_REVIEW_CONFIG = resolve_from_service(
    "benchmarks", "openalex", "reviews", "corpus_v3.yaml"
)
DEFAULT_KEEP_DB_ON_SUCCESS = False
SCHEMA_BOOTSTRAP_SQL = [
    "CREATE EXTENSION IF NOT EXISTS vector",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    """
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        type text,
        description text,
        embedding vector(768),
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        community_id bigint,
        canonical_name text NOT NULL UNIQUE,
        display_name text,
        search_vector tsvector GENERATED ALWAYS AS (
            to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(description, ''))
        ) STORED
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS knowledge_edges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        target_id uuid NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        relation_type text NOT NULL,
        description text,
        weight double precision DEFAULT 1.0,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        confidence double precision DEFAULT 0.58,
        evidence_count integer DEFAULT 1,
        directionality text DEFAULT 'directed',
        source_post_ids jsonb DEFAULT '[]'::jsonb,
        source_spans jsonb DEFAULT '[]'::jsonb,
        UNIQUE (source_id, target_id, relation_type)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS knowledge_evidence (
        id bigserial PRIMARY KEY,
        node_id uuid REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        edge_id uuid REFERENCES knowledge_edges(id) ON DELETE CASCADE,
        entity_kind text NOT NULL,
        post_id text,
        source_span text,
        signature text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS communities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        level integer NOT NULL DEFAULT 0,
        title varchar(255),
        summary text,
        findings jsonb DEFAULT '{}'::jsonb,
        community_id bigint UNIQUE,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        embedding vector(768),
        metadata jsonb DEFAULT '{}'::jsonb
    )
    """,
]
BASELINE_FILES = {
    "post_build_health": corpus_artifact_paths("corpus_v3_scale")["post_build_health"],
    "benchmark_coverage": corpus_artifact_paths("corpus_v3_scale")["benchmark_coverage_json"],
    "paper_core_runs_dir": resolve_from_service(
        "benchmarks",
        "runs",
        "paper_core",
        "paper_core_v2",
        "corpus_v3_scale",
        "DRR_Final",
        "paper_core_v2_neutral",
    ),
    "advanced_runs_dir": resolve_from_service(
        "benchmarks",
        "runs",
        "advanced_ablation",
        "advanced_ablation_v2",
        "corpus_v3_scale",
        "ablation_suite",
        "standard_judge",
    ),
}


def _resolve_baseline_result(key: str) -> Path | None:
    if key == "paper_core":
        return resolve_latest_run_result(BASELINE_FILES["paper_core_runs_dir"])
    if key == "advanced":
        return resolve_latest_run_result(BASELINE_FILES["advanced_runs_dir"])
    return None


def default_version_label() -> str:
    return f"corpus_retest_{datetime.now().strftime('%Y_%m_%d_%H%M%S')}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a cold-start isolated retest on a temporary PostgreSQL database."
    )
    parser.add_argument(
        "--version-label",
        default=default_version_label(),
        help="Artifact version label. Default: corpus_retest_YYYY_MM_DD",
    )
    parser.add_argument(
        "--review-config",
        default=str(DEFAULT_REVIEW_CONFIG),
        help="Review YAML to apply during the review step.",
    )
    parser.add_argument(
        "--keep-db-on-success",
        action="store_true",
        default=DEFAULT_KEEP_DB_ON_SUCCESS,
        help="Keep the temporary database after a successful run.",
    )
    parser.add_argument(
        "--skip-benchmarks",
        action="store_true",
        help="Stop after build/load/analyze without running paper-core or advanced benchmarks.",
    )
    parser.add_argument(
        "--cleanup-only",
        action="store_true",
        help="Drop an existing temporary database and exit.",
    )
    parser.add_argument(
        "--db-name",
        help="Explicit temporary database name. Required with --cleanup-only.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Temporary local AI service port. Default: {DEFAULT_PORT}.",
    )
    return parser.parse_args()


def clear_local_caches(root: Path | None = None) -> list[Path]:
    root_dir = root or resolve_from_service()
    cache_paths = [
        root_dir / ".embedding_cache.json",
        root_dir / ".gemini_cache.json",
    ]
    removed: list[Path] = []
    for path in cache_paths:
        if path.exists():
            path.unlink()
            removed.append(path)
    return removed


def run_step(
    label: str,
    command: list[str],
    *,
    env: dict[str, str],
    cwd: Path,
) -> dict[str, Any]:
    started_at = time.time()
    result = subprocess.run(
        command,
        cwd=str(cwd),
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"{label} failed with exit code {result.returncode}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return {
        "label": label,
        "command": command,
        "seconds": round(time.time() - started_at, 2),
        "stdout": result.stdout.strip(),
    }


def backup_result_files(result_files: dict[str, Path]) -> dict[str, bytes | None]:
    backups: dict[str, bytes | None] = {}
    for key, path in result_files.items():
        backups[key] = path.read_bytes() if path.exists() else None
    return backups


def restore_result_files(
    result_files: dict[str, Path], backups: dict[str, bytes | None]
) -> None:
    for key, path in result_files.items():
        previous = backups.get(key)
        if previous is None:
            with suppress(FileNotFoundError):
                path.unlink()
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(previous)


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _safe_float(value: str | None) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _summarize_paper_core(csv_path: Path) -> dict[str, Any]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    query_count = len(rows)
    if query_count == 0:
        return {"query_count": 0}
    novelty = sum(_safe_float(row.get("novelty")) for row in rows) / query_count
    causality = sum(_safe_float(row.get("causality")) for row in rows) / query_count
    actionability = (
        sum(_safe_float(row.get("actionability")) for row in rows) / query_count
    )
    fallback_count = sum(
        1
        for row in rows
        if (row.get("error") or "").strip()
        or "fallback" in (row.get("g_eval_reasoning") or "").lower()
    )
    return {
        "query_count": query_count,
        "mean_causality": round(causality, 3),
        "mean_actionability": round(actionability, 3),
        "mean_novelty": round(novelty, 3),
        "fallback_count": fallback_count,
    }


def _summarize_advanced(csv_path: Path) -> dict[str, Any]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(row.get("scenario", "unknown"), []).append(row)
    summary: dict[str, Any] = {}
    for scenario, scenario_rows in grouped.items():
        count = len(scenario_rows)
        summary[scenario] = {
            "query_count": count,
            "mean_causality": round(
                sum(_safe_float(row.get("causality")) for row in scenario_rows) / count,
                3,
            ),
            "mean_actionability": round(
                sum(_safe_float(row.get("actionability")) for row in scenario_rows)
                / count,
                3,
            ),
            "mean_novelty": round(
                sum(_safe_float(row.get("novelty")) for row in scenario_rows) / count,
                3,
            ),
            "mean_final_score": round(
                sum(_safe_float(row.get("final_score")) for row in scenario_rows) / count,
                3,
            ),
        }
    return {"row_count": len(rows), "scenario_summary": summary}


def _load_baseline_deltas(
    *,
    post_build: dict[str, Any],
    paper_core: dict[str, Any] | None,
    advanced: dict[str, Any] | None,
) -> dict[str, Any]:
    deltas: dict[str, Any] = {}
    baseline_post_path = BASELINE_FILES["post_build_health"]
    if baseline_post_path.exists():
        baseline_post = _read_json(baseline_post_path)
        baseline_graph = baseline_post.get("graph_summary")
        if baseline_graph:
            deltas["graph_summary"] = {
                "node_delta": post_build["graph_summary"]["node_count"]
                - baseline_graph["node_count"],
                "edge_delta": post_build["graph_summary"]["edge_count"]
                - baseline_graph["edge_count"],
                "community_delta": post_build["graph_summary"]["community_count"]
                - baseline_graph["community_count"],
            }
    baseline_paper_path = _resolve_baseline_result("paper_core")
    if paper_core and baseline_paper_path and baseline_paper_path.exists():
        baseline_paper = _summarize_paper_core(baseline_paper_path)
        deltas["paper_core"] = {
            "causality_delta": round(
                paper_core["mean_causality"] - baseline_paper["mean_causality"], 3
            ),
            "actionability_delta": round(
                paper_core["mean_actionability"]
                - baseline_paper["mean_actionability"],
                3,
            ),
            "novelty_delta": round(
                paper_core["mean_novelty"] - baseline_paper["mean_novelty"], 3
            ),
        }
    baseline_advanced_path = _resolve_baseline_result("advanced")
    if advanced and baseline_advanced_path and baseline_advanced_path.exists():
        baseline_advanced = _summarize_advanced(baseline_advanced_path)
        scenario_deltas: dict[str, Any] = {}
        for scenario, summary in advanced["scenario_summary"].items():
            baseline_summary = baseline_advanced["scenario_summary"].get(scenario)
            if not baseline_summary:
                continue
            scenario_deltas[scenario] = {
                "final_score_delta": round(
                    summary["mean_final_score"] - baseline_summary["mean_final_score"],
                    3,
                ),
                "actionability_delta": round(
                    summary["mean_actionability"]
                    - baseline_summary["mean_actionability"],
                    3,
                ),
            }
        deltas["advanced"] = scenario_deltas
    return deltas


def summarize_retest(
    *,
    db_name: str,
    caches_cleared: list[str],
    post_build_path: Path,
    coverage_path: Path,
    archived_results: dict[str, Path],
) -> dict[str, Any]:
    post_build = _read_json(post_build_path)
    coverage = _read_json(coverage_path)
    paper_core = (
        _summarize_paper_core(archived_results["paper_core"])
        if "paper_core" in archived_results
        else None
    )
    advanced = (
        _summarize_advanced(archived_results["advanced"])
        if "advanced" in archived_results
        else None
    )
    return {
        "db_name": db_name,
        "cache_summary": {
            "cleared_files": caches_cleared,
            "cleared_count": len(caches_cleared),
        },
        "seed_summary": post_build.get("seed_summary", {}),
        "graph_summary": post_build.get("graph_summary", {}),
        "quality_summary": post_build.get("quality_summary", {}),
        "readiness_checks": coverage.get("readiness_checks", {}),
        "hybrid_empty_ratio": coverage.get("hybrid_empty_ratio"),
        "paper_core_benchmark": paper_core,
        "advanced_benchmark": advanced,
        "baseline_deltas": _load_baseline_deltas(
            post_build=post_build,
            paper_core=paper_core,
            advanced=advanced,
        ),
    }


def _wait_for_service(base_url: str, timeout_seconds: float = 90.0) -> None:
    deadline = time.time() + timeout_seconds
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            if response.ok:
                return
        except Exception as exc:  # pragma: no cover - polling path
            last_error = exc
        time.sleep(1.0)
    raise RuntimeError(f"Timed out waiting for AI service at {base_url}: {last_error}")


def start_service(*, port: int, env: dict[str, str], cwd: Path) -> subprocess.Popen[str]:
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=str(cwd),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        _wait_for_service(f"http://127.0.0.1:{port}")
        return process
    except Exception:
        with suppress(Exception):
            process.terminate()
            process.wait(timeout=10)
        raise


def stop_service(process: subprocess.Popen[str] | None) -> None:
    if process is None:
        return
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=15)
    except subprocess.TimeoutExpired:  # pragma: no cover - defensive
        process.kill()
        process.wait(timeout=5)


def cleanup_database(*, admin_url: str, db_name: str) -> None:
    asyncio.run(_drop_temp_db(admin_url, db_name))


def create_retest_database_urls() -> tuple[str, str, str]:
    admin_url, temp_url, _ = _database_urls()
    db_name = f"codex_ai_service_retest_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    base, _, _ = temp_url.rpartition("/")
    return admin_url, f"{base}/{db_name}", db_name


def bootstrap_schema(temp_url: str) -> None:
    import asyncpg

    async def _bootstrap() -> None:
        conn = await asyncpg.connect(temp_url)
        try:
            for statement in SCHEMA_BOOTSTRAP_SQL:
                await conn.execute(statement)
        finally:
            await conn.close()

    asyncio.run(_bootstrap())


def _resolve_retest_paths(version_label: str) -> ExperimentPaths:
    identity = resolve_experiment_identity(
        benchmark_name="cold_start_retest",
        default_version="v1",
        default_corpus=version_label,
        default_pipeline="full_build",
        default_judge="none",
        env_prefix="RETEST",
    )
    return resolve_experiment_paths(
        identity=identity,
        result_filename="cold_start_retest_summary.json",
        result_override_env=None,
    )


def _resolve_benchmark_outputs(report_dir: Path, version_label: str) -> dict[str, Path]:
    paper_identity = resolve_experiment_identity(
        benchmark_name="paper_core",
        default_version="paper_core_v2",
        default_corpus=version_label,
        default_pipeline="DRR_Final",
        default_judge="paper_core_v2_neutral",
        env_prefix="BENCHMARK",
    )
    paper_paths = resolve_experiment_paths(
        identity=paper_identity,
        result_filename="results.csv",
        result_override_env=None,
    )

    advanced_identity = resolve_experiment_identity(
        benchmark_name="advanced_ablation",
        default_version="advanced_ablation_v2",
        default_corpus=version_label,
        default_pipeline="ablation_suite",
        default_judge="standard_judge",
        env_prefix="ADVANCED_ABLATION",
    )
    advanced_paths = resolve_experiment_paths(
        identity=advanced_identity,
        result_filename="results.csv",
        result_override_env=None,
    )

    return {
        "paper_core": paper_paths.results_csv,
        "advanced": advanced_paths.results_csv,
    }


def run_retest(args: argparse.Namespace) -> dict[str, Any]:
    service_root = resolve_from_service()
    paths = corpus_artifact_paths(args.version_label)
    report_dir = paths["post_build_health"].parent
    retest_paths = _resolve_retest_paths(args.version_label)
    report_dir.mkdir(parents=True, exist_ok=True)

    removed_cache_paths = clear_local_caches(service_root)

    admin_url, temp_url, generated_db_name = create_retest_database_urls()
    db_name = args.db_name or generated_db_name
    temp_url = temp_url.replace(generated_db_name, db_name)

    asyncio.run(_create_temp_db(admin_url, db_name))
    bootstrap_schema(temp_url)

    env = os.environ.copy()
    env["GRAPH_DATABASE_URL"] = temp_url
    env["AI_SERVICE_URL"] = f"http://127.0.0.1:{args.port}"

    executed_steps: list[dict[str, Any]] = []
    service_process: subprocess.Popen[str] | None = None
    archived_results: dict[str, Path] = {}
    benchmark_output_paths = _resolve_benchmark_outputs(report_dir, args.version_label)
    drop_on_exit = not args.keep_db_on_success

    try:
        executed_steps.append(
            run_step(
                "discover-openalex",
                [sys.executable, "-m", "scripts.discover_openalex", "--version", args.version_label],
                env=env,
                cwd=service_root,
            )
        )
        executed_steps.append(
            run_step(
                "expand-openalex",
                [sys.executable, "-m", "scripts.expand_openalex_neighbors", "--version", args.version_label],
                env=env,
                cwd=service_root,
            )
        )
        executed_steps.append(
            run_step(
                "review-openalex",
                [
                    sys.executable,
                    "-m",
                    "scripts.review_openalex_corpus",
                    "--version",
                    args.version_label,
                    "--review-config",
                    args.review_config,
                ],
                env=env,
                cwd=service_root,
            )
        )
        executed_steps.append(
            run_step(
                "build-seed-knowledge",
                [
                    sys.executable,
                    "-m",
                    "scripts.build_seed_knowledge",
                    "--version",
                    args.version_label,
                    "--per-pack-limit",
                    "16",
                ],
                env=env,
                cwd=service_root,
            )
        )
        executed_steps.append(
            run_step(
                "load-seed-knowledge",
                [sys.executable, "-m", "scripts.load_seed_knowledge", "--version", args.version_label],
                env=env,
                cwd=service_root,
            )
        )
        executed_steps.append(
            run_step(
                "analyze-benchmark-coverage",
                [
                    sys.executable,
                    "-m",
                    "scripts.analyze_benchmark_coverage",
                    "--version",
                    args.version_label,
                ],
                env=env,
                cwd=service_root,
            )
        )

        if not args.skip_benchmarks:
            service_process = start_service(port=args.port, env=env, cwd=service_root)
            benchmark_env = env.copy()
            benchmark_env.update(
                {
                    "AI_SERVICE_URL": f"http://127.0.0.1:{args.port}",
                    "BENCHMARK_QUERY_SET": "paper_core",
                    "BENCHMARK_QUERY_LIMIT": "all",
                    "BENCHMARK_VERSION": "paper_core_v2",
                    "BENCHMARK_CORPUS_VERSION": args.version_label,
                    "BENCHMARK_PIPELINE_VARIANT": "DRR_Final",
                    "BENCHMARK_JUDGE_PROFILE": "paper_core_v2_neutral",
                    "BENCHMARK_RUN_ID": "cold_start_retest",
                    "BENCHMARK_RESULTS_PATH": str(benchmark_output_paths["paper_core"]),
                    "ADVANCED_ABLATION_QUERY_SET": "v2",
                    "ADVANCED_ABLATION_VERSION": "advanced_ablation_v2",
                    "ADVANCED_ABLATION_CORPUS_VERSION": args.version_label,
                    "ADVANCED_ABLATION_PIPELINE_VARIANT": "ablation_suite",
                    "ADVANCED_ABLATION_JUDGE_PROFILE": "standard_judge",
                    "ADVANCED_ABLATION_RUN_ID": "cold_start_retest",
                    "ADVANCED_ABLATION_OUTPUT_PATH": str(benchmark_output_paths["advanced"]),
                }
            )
            executed_steps.append(
                run_step(
                    "benchmark-paper-core",
                    [sys.executable, "-m", "scripts.run_benchmark"],
                    env=benchmark_env,
                    cwd=service_root,
                )
            )
            executed_steps.append(
                run_step(
                    "benchmark-advanced",
                    [sys.executable, "-m", "scripts.run_advanced_ablation"],
                    env=benchmark_env,
                    cwd=service_root,
                )
            )
            archived_results = {
                key: path for key, path in benchmark_output_paths.items() if path.exists()
            }

        summary = summarize_retest(
            db_name=db_name,
            caches_cleared=[path.name for path in removed_cache_paths],
            post_build_path=paths["post_build_health"],
            coverage_path=paths["benchmark_coverage_json"],
            archived_results=archived_results,
        )
        summary["version_label"] = args.version_label
        summary["service_port"] = args.port
        summary["executed_steps"] = [
            {
                "label": step["label"],
                "seconds": step["seconds"],
            }
            for step in executed_steps
        ]
        retest_paths.summary_json.parent.mkdir(parents=True, exist_ok=True)
        retest_paths.summary_json.write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        retest_paths.results_csv.write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        summary["summary_path"] = str(retest_paths.summary_json)
        summary["results_path"] = str(retest_paths.results_csv)
        return summary
    except Exception:
        drop_on_exit = False
        raise
    finally:
        stop_service(service_process)
        if drop_on_exit:
            with suppress(Exception):
                cleanup_database(admin_url=admin_url, db_name=db_name)
        else:
            print(
                f"Temporary database preserved for inspection: {db_name}\n"
                f"Cleanup command: uv run python -m scripts.run_cold_start_retest --cleanup-only --db-name {db_name}"
            )


def main() -> None:
    load_service_env()
    args = parse_args()
    admin_url, _, _ = _database_urls()
    if args.cleanup_only:
        if not args.db_name:
            raise SystemExit("--cleanup-only requires --db-name")
        cleanup_database(admin_url=admin_url, db_name=args.db_name)
        print(json.dumps({"cleaned_db": args.db_name}, indent=2))
        return
    summary = run_retest(args)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
