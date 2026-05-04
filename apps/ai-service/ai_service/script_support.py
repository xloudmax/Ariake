from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from .config import ROOT_DIR, get_model_setting

PAPER_CORE_JUDGE_OVERRIDES_PATH = ROOT_DIR / "benchmarks" / "results" / "paper_core_query_judge_overrides.json"
PAPER_CORE_QUERY_FILES: dict[str, Path] = {
    "paper_core_v1": ROOT_DIR / "benchmarks" / "results" / "paper_core_benchmark_queries_legacy_v1.json",
    "paper_core_v2": ROOT_DIR / "benchmarks" / "results" / "paper_core_benchmark_queries.json",
}


@dataclass(frozen=True)
class ExperimentIdentity:
    benchmark: str
    benchmark_version: str
    corpus_version: str
    pipeline_variant: str
    judge_profile: str
    run_id: str


@dataclass(frozen=True)
class ExperimentPaths:
    identity: ExperimentIdentity
    run_dir: Path
    results_csv: Path
    manifest_json: Path
    summary_json: Path


def load_service_env() -> None:
    load_dotenv(ROOT_DIR / ".env")


def service_root() -> Path:
    return ROOT_DIR


def resolve_from_service(*parts: str) -> Path:
    return ROOT_DIR.joinpath(*parts)


def default_service_url() -> str:
    return os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")


def benchmark_api_key() -> str:
    return (os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()


def service_request_headers() -> dict[str, str]:
    api_key = (os.getenv("AI_SERVICE_API_KEY") or "").strip()
    if not api_key:
        return {}
    return {"X-API-Key": api_key}


def create_vertex_express_client(api_key: str | None = None) -> genai.Client | None:
    resolved_key = (api_key or benchmark_api_key()).strip()
    if not resolved_key:
        return None
    # Match scripts/verify_vertex_ai.py: Vertex Express Mode via API key only.
    return genai.Client(vertexai=True, api_key=resolved_key)


def benchmark_eval_model(
    default: str | None = None, *, dataset_name: str | None = None
) -> str:
    if default is None:
        default = get_model_setting("benchmark_judge", "model_id")
    if not default:
        raise RuntimeError(
            "benchmark_judge.model_id is not set in model_config.yaml and no "
            "default was provided."
        )
    normalized_dataset = (dataset_name or "").strip().lower()
    if normalized_dataset == "paper_core":
        return os.getenv("PAPER_CORE_EVAL_MODEL") or default
    if normalized_dataset == "blind_test":
        return os.getenv("BLIND_AB_EVAL_MODEL") or default
    return os.getenv("BENCHMARK_EVAL_MODEL") or os.getenv("LLM_MODEL") or default


def load_paper_core_judge_overrides() -> dict[str, dict[str, object]]:
    if not PAPER_CORE_JUDGE_OVERRIDES_PATH.exists():
        return {}
    try:
        return json.loads(PAPER_CORE_JUDGE_OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def resolve_paper_core_query_file(
    *,
    default_version: str = "paper_core_v2",
    version_env: str = "PAPER_CORE_QUERY_VERSION",
    path_override_env: str = "PAPER_CORE_QUERY_PATH",
) -> Path:
    custom_path = os.getenv(path_override_env, "").strip()
    if custom_path:
        return Path(custom_path).expanduser()

    version = os.getenv(version_env, "").strip() or default_version
    normalized = _slug(version).lower()
    if normalized in PAPER_CORE_QUERY_FILES:
        return PAPER_CORE_QUERY_FILES[normalized]

    raise ValueError(
        f"Unsupported paper-core query version: {version}. "
        f"Expected one of: {', '.join(sorted(PAPER_CORE_QUERY_FILES))}"
    )


def build_paper_core_eval_prompt(base_prompt: str, item: dict[str, object], overrides: dict[str, dict[str, object]] | None = None) -> str:
    overrides = overrides or {}
    merged: dict[str, object] = {}
    if isinstance(item.get("ground_truth"), dict):
        merged.update(item["ground_truth"])
    item_id = str(item.get("id", ""))
    if item_id in overrides:
        merged.update(overrides[item_id])

    lines = [base_prompt.rstrip(), "", "Query-Specific Adjudication Notes:"]
    hardest = str(merged.get("hardest_requirement", "")).strip()
    if hardest:
        lines.append(f"- Hardest requirement: {hardest}")
    required_mechanisms = merged.get("required_mechanisms")
    if isinstance(required_mechanisms, list) and required_mechanisms:
        lines.append("- Required mechanisms:")
        lines.extend(f"  - {str(item)}" for item in required_mechanisms)
    physics_constraints = merged.get("physics_constraints")
    if isinstance(physics_constraints, list) and physics_constraints:
        lines.append("- Physics constraints:")
        lines.extend(f"  - {str(item)}" for item in physics_constraints)
    invalid_shortcuts = merged.get("invalid_shortcuts")
    if isinstance(invalid_shortcuts, list) and invalid_shortcuts:
        lines.append("- Invalid shortcuts:")
        lines.extend(f"  - {str(item)}" for item in invalid_shortcuts)
    judge_focus = str(merged.get("judge_focus", "")).strip()
    if judge_focus:
        lines.append(f"- Judge focus: {judge_focus}")
    return "\n".join(lines)


def _slug(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9._-]+", "_", (value or "").strip())
    normalized = normalized.strip("._-")
    return normalized or "default"


def utc_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def resolve_experiment_identity(
    *,
    benchmark_name: str,
    default_version: str,
    default_corpus: str,
    default_pipeline: str,
    default_judge: str,
    env_prefix: str = "BENCHMARK",
) -> ExperimentIdentity:
    prefix = env_prefix.strip().upper()
    version = os.getenv(f"{prefix}_VERSION", default_version)
    corpus = os.getenv(f"{prefix}_CORPUS_VERSION", default_corpus)
    pipeline = os.getenv(f"{prefix}_PIPELINE_VARIANT", default_pipeline)
    judge = os.getenv(f"{prefix}_JUDGE_PROFILE", default_judge)
    run_id = os.getenv(f"{prefix}_RUN_ID", "").strip() or utc_run_id()
    return ExperimentIdentity(
        benchmark=_slug(benchmark_name),
        benchmark_version=_slug(version),
        corpus_version=_slug(corpus),
        pipeline_variant=_slug(pipeline),
        judge_profile=_slug(judge),
        run_id=_slug(run_id),
    )


def resolve_experiment_paths(
    *,
    identity: ExperimentIdentity,
    result_filename: str,
    result_override_env: str | None = None,
) -> ExperimentPaths:
    override = os.getenv(result_override_env or "", "").strip() if result_override_env else ""
    if override:
        results_csv = Path(override).expanduser()
        run_dir = results_csv.parent
    else:
        run_dir = (
            ROOT_DIR
            / "benchmarks"
            / "runs"
            / identity.benchmark
            / identity.benchmark_version
            / identity.corpus_version
            / identity.pipeline_variant
            / identity.judge_profile
            / identity.run_id
        )
        results_csv = run_dir / result_filename
    return ExperimentPaths(
        identity=identity,
        run_dir=run_dir,
        results_csv=results_csv,
        manifest_json=run_dir / "manifest.json",
        summary_json=run_dir / "summary.json",
    )


def resolve_latest_run_result(base_dir: Path, *, result_filename: str = "results.csv") -> Path | None:
    if base_dir.is_file():
        return base_dir
    if not base_dir.exists():
        return None

    direct = [p for p in base_dir.glob(f"*/{result_filename}") if p.is_file()]
    recursive = [p for p in base_dir.rglob(result_filename) if p.is_file()]
    candidates = sorted({*direct, *recursive})
    if not candidates:
        return None
    return candidates[-1]


def current_git_commit() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(ROOT_DIR),
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return result.stdout.strip() or "unknown"
    except Exception:
        pass
    return "unknown"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json_file(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def build_run_manifest(
    *,
    paths: ExperimentPaths,
    query_path: Path,
    eval_model: str,
    command: str,
    metadata: dict[str, object] | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "identity": asdict(paths.identity),
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "git_commit": current_git_commit(),
        "command": command,
        "query_path": str(query_path),
        "query_sha256": file_sha256(query_path) if query_path.exists() else "",
        "eval_model": eval_model,
        "outputs": {
            "results_csv": str(paths.results_csv),
            "summary_json": str(paths.summary_json),
        },
    }
    if metadata:
        payload["metadata"] = metadata
    return payload
