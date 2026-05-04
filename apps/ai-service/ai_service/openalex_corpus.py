from __future__ import annotations

import asyncio
import html
import json
import os
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml
from pydantic import BaseModel, Field

from . import search
from .config import BENCHMARKS_DIR, logger
from .db import close_db_pool, db_connected, get_db_pool, init_db_pool
from .knowledge_graph import (
    generate_all_community_summaries,
    run_leiden_clustering,
    upsert_knowledge,
)
from .llm import (
    get_embedding,
    get_gemini_response,
)
from .models import Entity, KnowledgeExtractionResponse, Relationship
from .prompts import OPENALEX_EXTRACTION_PROMPT, OPENALEX_JSON_REPAIR_PROMPT

OPENALEX_WORKS_URL = "https://api.openalex.org/works"
OPENALEX_DIR = BENCHMARKS_DIR / "openalex"
OPENALEX_QUERY_PACKS_PATH = OPENALEX_DIR / "query_packs.yaml"
OPENALEX_ARTIFACTS_DIR = OPENALEX_DIR / "artifacts"
OPENALEX_RAW_DIR = OPENALEX_ARTIFACTS_DIR / "raw"
OPENALEX_CURATED_DIR = OPENALEX_ARTIFACTS_DIR / "curated"
OPENALEX_REPORTS_DIR = OPENALEX_ARTIFACTS_DIR / "reports"
OPENALEX_VERSIONS_DIR = OPENALEX_ARTIFACTS_DIR / "versions"
OPENALEX_REVIEWS_DIR = OPENALEX_DIR / "reviews"
DISCOVERY_ARTIFACT_PATH = OPENALEX_CURATED_DIR / "discovered_candidates.json"
ACCEPTED_ARTIFACT_PATH = OPENALEX_CURATED_DIR / "accepted_works.json"
REVIEWED_ARTIFACT_PATH = OPENALEX_CURATED_DIR / "reviewed_accepted_works.json"
SEED_KNOWLEDGE_PATH = OPENALEX_CURATED_DIR / "seed_knowledge.json"
SEED_PROVENANCE_PATH = OPENALEX_CURATED_DIR / "seed_knowledge_provenance.json"
POST_BUILD_REPORT_PATH = OPENALEX_REPORTS_DIR / "post_build_health.json"
BENCHMARK_COVERAGE_JSON = OPENALEX_REPORTS_DIR / "benchmark_coverage.json"
BENCHMARK_COVERAGE_CSV = OPENALEX_REPORTS_DIR / "benchmark_coverage.csv"
MATERIALIZATION_PREVIEW_PATH = OPENALEX_REPORTS_DIR / "materialization_preview.json"
BENCHMARK_QUERY_PATH = BENCHMARKS_DIR / "results" / "benchmark_queries.json"

ALLOWED_ENTITY_TYPES = {
    "biological_mechanism",
    "physical_principle",
    "material_strategy",
    "surface_structure",
    "control_strategy",
    "engineering_application",
    "constraint",
    "tradeoff",
}
ALLOWED_RELATION_TYPES = {
    "inspires",
    "enables",
    "depends_on",
    "improves",
    "regulated_by",
    "trade_off_with",
    "analogous_to",
    "implemented_as",
}



class YearRange(BaseModel):
    start: int
    end: int


class QueryPack(BaseModel):
    id: str
    display_name: str
    primary_queries: list[str]
    expansion_queries: list[str] = Field(default_factory=list)
    include_keywords: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    benchmark_signals: list[str] = Field(default_factory=list)
    year_range: YearRange
    target_paper_count: int = 30
    max_neighbor_count: int = 12
    seed_count: int = 8


class NormalizedOpenAlexWork(BaseModel):
    openalex_id: str
    doi: str | None = None
    title: str
    abstract: str = ""
    publication_year: int | None = None
    cited_by_count: int = 0
    concepts: list[str] = Field(default_factory=list)
    primary_topic: str | None = None
    open_access_is_oa: bool = False
    landing_page_url: str | None = None
    pdf_url: str | None = None
    source_packs: list[str] = Field(default_factory=list)
    source_queries: list[str] = Field(default_factory=list)
    pack_scores: dict[str, float] = Field(default_factory=dict)
    neighbor_of: list[str] = Field(default_factory=list)
    origin: str = "discover"


class WorkExtractionResult(BaseModel):
    openalex_id: str
    title: str
    source_packs: list[str]
    extraction_status: str
    entity_count: int = 0
    relationship_count: int = 0
    entity_names: list[str] = Field(default_factory=list)
    excerpt_used: bool = False
    landing_page_url: str | None = None
    pdf_url: str | None = None
    error: str | None = None


class PackReviewRule(BaseModel):
    exclude_ids: list[str] = Field(default_factory=list)
    exclude_dois: list[str] = Field(default_factory=list)
    exclude_title_patterns: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    include_ids: list[str] = Field(default_factory=list)
    dedupe_by_normalized_title: bool = False
    notes: str | None = None


class ReviewConfig(BaseModel):
    version: str | None = None
    packs: dict[str, PackReviewRule] = Field(default_factory=dict)


def ensure_openalex_dirs() -> None:
    for path in (
        OPENALEX_DIR,
        OPENALEX_ARTIFACTS_DIR,
        OPENALEX_RAW_DIR,
        OPENALEX_CURATED_DIR,
        OPENALEX_REPORTS_DIR,
        OPENALEX_VERSIONS_DIR,
        OPENALEX_REVIEWS_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)


def _version_slug(version: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", version.strip())


def _version_file_label(version: str) -> str:
    slug = _version_slug(version)
    if slug.startswith("corpus_"):
        return slug.removeprefix("corpus_")
    return slug


def versioned_artifact_path(path: Path, version: str | None = None) -> Path:
    if not version:
        return path
    relative = path.relative_to(OPENALEX_ARTIFACTS_DIR)
    label = _version_file_label(version)
    target_dir = OPENALEX_VERSIONS_DIR / _version_slug(version) / relative.parent
    return target_dir / f"{path.stem}_{label}{path.suffix}"


def corpus_artifact_paths(version: str | None = None) -> dict[str, Path]:
    return {
        "discovery": versioned_artifact_path(DISCOVERY_ARTIFACT_PATH, version),
        "accepted": versioned_artifact_path(ACCEPTED_ARTIFACT_PATH, version),
        "reviewed": versioned_artifact_path(REVIEWED_ARTIFACT_PATH, version),
        "seed": versioned_artifact_path(SEED_KNOWLEDGE_PATH, version),
        "provenance": versioned_artifact_path(SEED_PROVENANCE_PATH, version),
        "post_build_health": versioned_artifact_path(POST_BUILD_REPORT_PATH, version),
        "benchmark_coverage_json": versioned_artifact_path(BENCHMARK_COVERAGE_JSON, version),
        "benchmark_coverage_csv": versioned_artifact_path(BENCHMARK_COVERAGE_CSV, version),
        "preview": versioned_artifact_path(MATERIALIZATION_PREVIEW_PATH, version),
    }


def review_config_path(version: str | None = None) -> Path:
    filename = f"{_version_slug(version)}.yaml" if version else "default.yaml"
    return OPENALEX_REVIEWS_DIR / filename


def load_query_packs(config_path: Path = OPENALEX_QUERY_PACKS_PATH) -> list[QueryPack]:
    ensure_openalex_dirs()
    with config_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    packs = data.get("packs", [])
    return [QueryPack.model_validate(item) for item in packs]


def reconstruct_abstract(abstract_inverted_index: dict[str, list[int]] | None) -> str:
    if not abstract_inverted_index:
        return ""
    tokens_by_position: dict[int, str] = {}
    for token, positions in abstract_inverted_index.items():
        for position in positions:
            tokens_by_position[position] = token
    ordered = [tokens_by_position[idx] for idx in sorted(tokens_by_position)]
    text = " ".join(ordered)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def _normalize_concepts(work: dict[str, Any]) -> list[str]:
    concepts = []
    for concept in work.get("concepts") or []:
        name = concept.get("display_name")
        if name:
            concepts.append(name)
    primary_topic = work.get("primary_topic") or {}
    if isinstance(primary_topic, dict):
        topic_name = primary_topic.get("display_name")
        if topic_name and topic_name not in concepts:
            concepts.insert(0, topic_name)
    return concepts[:12]


def normalize_openalex_work(
    work: dict[str, Any],
    *,
    source_pack: str,
    source_query: str,
    origin: str = "discover",
    neighbor_of: str | None = None,
) -> NormalizedOpenAlexWork:
    best_location = work.get("best_oa_location") or work.get("primary_location") or {}
    open_access = work.get("open_access") or {}
    work_id = work.get("id") or ""
    doi = work.get("doi")
    title = work.get("display_name") or "Untitled work"
    abstract = reconstruct_abstract(work.get("abstract_inverted_index"))
    concepts = _normalize_concepts(work)
    primary_topic = (work.get("primary_topic") or {}).get("display_name")

    normalized = NormalizedOpenAlexWork(
        openalex_id=work_id,
        doi=doi,
        title=title,
        abstract=abstract,
        publication_year=work.get("publication_year"),
        cited_by_count=work.get("cited_by_count") or 0,
        concepts=concepts,
        primary_topic=primary_topic,
        open_access_is_oa=bool(open_access.get("is_oa")),
        landing_page_url=best_location.get("landing_page_url") or open_access.get("oa_url"),
        pdf_url=best_location.get("pdf_url"),
        source_packs=[source_pack],
        source_queries=[source_query],
        origin=origin,
        neighbor_of=[neighbor_of] if neighbor_of else [],
    )
    return normalized


def canonicalize_work_key(work: NormalizedOpenAlexWork | dict[str, Any]) -> str:
    doi = work.doi if isinstance(work, NormalizedOpenAlexWork) else work.get("doi")
    if doi:
        return doi.lower()
    openalex_id = work.openalex_id if isinstance(work, NormalizedOpenAlexWork) else work.get("openalex_id")
    return (openalex_id or "").lower()


def canonicalize_work_title(title: str) -> str:
    lowered = title.lower().strip()
    lowered = re.sub(r"<[^>]+>", " ", lowered)
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _text_blob(work: NormalizedOpenAlexWork) -> str:
    parts = [work.title, work.abstract, work.primary_topic or ""]
    parts.extend(work.concepts)
    return " ".join(part for part in parts if part).lower()


def _keyword_hits(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if keyword.lower() in text)


def score_work_for_pack(work: NormalizedOpenAlexWork, pack: QueryPack) -> float:
    text = _text_blob(work)
    include_hits = _keyword_hits(text, pack.include_keywords)
    primary_hits = _keyword_hits(text, pack.primary_queries)
    expansion_hits = _keyword_hits(text, pack.expansion_queries)
    signal_hits = _keyword_hits(text, pack.benchmark_signals)
    if pack.exclude_keywords and _keyword_hits(text, pack.exclude_keywords):
        return -1000.0
    topical_hits = include_hits + primary_hits + expansion_hits + signal_hits
    if topical_hits <= 0:
        return -1000.0

    citation_score = min(work.cited_by_count, 250) / 25.0
    recency_bonus = 0.0
    if work.publication_year is not None:
        if work.publication_year >= 2021:
            recency_bonus = 1.5
        elif work.publication_year >= 2018:
            recency_bonus = 0.8
    pdf_bonus = 0.5 if work.pdf_url else 0.0
    oa_bonus = 0.5 if work.open_access_is_oa else 0.0
    return (
        include_hits * 5.0
        + primary_hits * 4.0
        + expansion_hits * 2.0
        + signal_hits * 3.0
        + citation_score
        + recency_bonus
        + pdf_bonus
        + oa_bonus
    )


def matches_pack(work: NormalizedOpenAlexWork, pack: QueryPack) -> bool:
    return score_work_for_pack(work, pack) > 0


def dedupe_works(works: list[NormalizedOpenAlexWork]) -> list[NormalizedOpenAlexWork]:
    deduped: dict[str, NormalizedOpenAlexWork] = {}
    for work in works:
        key = canonicalize_work_key(work)
        existing = deduped.get(key)
        if existing is None:
            deduped[key] = work
            continue

        for pack_id, score in work.pack_scores.items():
            existing.pack_scores[pack_id] = max(existing.pack_scores.get(pack_id, 0.0), score)
        existing.source_packs = sorted(set(existing.source_packs + work.source_packs))
        existing.source_queries = sorted(set(existing.source_queries + work.source_queries))
        existing.neighbor_of = sorted(set(existing.neighbor_of + work.neighbor_of))
        if len(work.abstract) > len(existing.abstract):
            existing.abstract = work.abstract
            existing.title = work.title
            existing.primary_topic = work.primary_topic
            existing.concepts = work.concepts
            existing.landing_page_url = work.landing_page_url or existing.landing_page_url
            existing.pdf_url = work.pdf_url or existing.pdf_url
        existing.cited_by_count = max(existing.cited_by_count, work.cited_by_count)
        if work.publication_year and (existing.publication_year is None or work.publication_year > existing.publication_year):
            existing.publication_year = work.publication_year
        existing.open_access_is_oa = existing.open_access_is_oa or work.open_access_is_oa
    return list(deduped.values())


def rerank_pack_candidates(works: list[NormalizedOpenAlexWork], pack: QueryPack) -> list[NormalizedOpenAlexWork]:
    ranked = []
    for work in works:
        score = score_work_for_pack(work, pack)
        work.pack_scores[pack.id] = score
        if score > 0:
            ranked.append(work)
    ranked.sort(
        key=lambda item: (
            item.pack_scores.get(pack.id, 0.0),
            item.cited_by_count,
            item.publication_year or 0,
        ),
        reverse=True,
    )
    return ranked


def _pack_to_filter(pack: QueryPack, query: str) -> str:
    return ",".join(
        [
            f"title_and_abstract.search:{query}",
            "has_abstract:true",
            "open_access.is_oa:true",
            f"publication_year:{pack.year_range.start}-{pack.year_range.end}",
        ]
    )


def _openalex_params(filter_expression: str, *, cursor: str, per_page: int) -> dict[str, Any]:
    params: dict[str, Any] = {
        "filter": filter_expression,
        "cursor": cursor,
        "per-page": per_page,
    }
    env_mailto = os.getenv("OPENALEX_MAILTO")
    if env_mailto:
        params["mailto"] = env_mailto
    return params


async def fetch_openalex_results(
    client: httpx.AsyncClient,
    *,
    filter_expression: str,
    target_count: int,
    per_page: int = 50,
    max_pages: int = 4,
) -> list[dict[str, Any]]:
    cursor = "*"
    page_count = 0
    results: list[dict[str, Any]] = []
    while cursor and page_count < max_pages and len(results) < target_count:
        response = await client.get(
            OPENALEX_WORKS_URL,
            params=_openalex_params(filter_expression, cursor=cursor, per_page=per_page),
            timeout=60.0,
        )
        response.raise_for_status()
        payload = response.json()
        results.extend(payload.get("results", []))
        cursor = payload.get("meta", {}).get("next_cursor")
        page_count += 1
    return results[:target_count]


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)


def _load_artifact(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _copy_if_exists(source: Path, target: Path) -> None:
    if source.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def snapshot_corpus_artifacts(
    *,
    version: str,
    source_paths: dict[str, Path] | None = None,
) -> dict[str, str]:
    ensure_openalex_dirs()
    paths = source_paths or corpus_artifact_paths()
    versioned_paths = corpus_artifact_paths(version)
    copied: dict[str, str] = {}
    for key, source in paths.items():
        target = versioned_paths[key]
        if source.exists():
            _copy_if_exists(source, target)
            copied[key] = str(target)
    return copied


def load_review_config(path: Path) -> ReviewConfig:
    if not path.exists():
        return ReviewConfig()
    with path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    return ReviewConfig.model_validate(payload)


async def discover_openalex(
    *,
    config_path: Path = OPENALEX_QUERY_PACKS_PATH,
    output_path: Path = DISCOVERY_ARTIFACT_PATH,
) -> dict[str, Any]:
    ensure_openalex_dirs()
    packs = load_query_packs(config_path)
    artifact: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat(),
        "packs": {},
    }
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for pack in packs:
            pack_raw_results: list[dict[str, Any]] = []
            pack_candidates: list[NormalizedOpenAlexWork] = []
            target_raw_count = max(pack.target_paper_count * 3, pack.target_paper_count)
            discovery_queries = list(dict.fromkeys([*pack.primary_queries, *pack.expansion_queries]))
            for query in discovery_queries:
                query_target_count = target_raw_count if query in pack.primary_queries else max(pack.target_paper_count, pack.target_paper_count // 2)
                filter_expression = _pack_to_filter(pack, query)
                raw_results = await fetch_openalex_results(
                    client,
                    filter_expression=filter_expression,
                    target_count=query_target_count,
                )
                pack_raw_results.extend(raw_results)
                for raw_work in raw_results:
                    normalized = normalize_openalex_work(
                        raw_work,
                        source_pack=pack.id,
                        source_query=query,
                    )
                    pack_candidates.append(normalized)

            deduped = dedupe_works(pack_candidates)
            ranked = rerank_pack_candidates(deduped, pack)
            _write_json(OPENALEX_RAW_DIR / f"discovery_{pack.id}.json", pack_raw_results)
            artifact["packs"][pack.id] = {
                "display_name": pack.display_name,
                "query_pack": pack.model_dump(),
                "works": [work.model_dump() for work in ranked[: pack.target_paper_count * 2]],
            }

    _write_json(output_path, artifact)
    return artifact


async def expand_openalex_neighbors(
    *,
    config_path: Path = OPENALEX_QUERY_PACKS_PATH,
    discovery_path: Path = DISCOVERY_ARTIFACT_PATH,
    output_path: Path = ACCEPTED_ARTIFACT_PATH,
) -> dict[str, Any]:
    ensure_openalex_dirs()
    packs = {pack.id: pack for pack in load_query_packs(config_path)}
    discovery = _load_artifact(discovery_path)
    artifact: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat(),
        "packs": {},
    }
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for pack_id, pack_payload in discovery.get("packs", {}).items():
            pack = packs[pack_id]
            seed_candidates = [
                NormalizedOpenAlexWork.model_validate(item)
                for item in pack_payload.get("works", [])
            ]
            seeds = seed_candidates[: pack.seed_count]
            neighbor_raw_results: list[dict[str, Any]] = []
            merged_candidates: list[NormalizedOpenAlexWork] = list(seed_candidates)
            for seed in seeds:
                for relation in ("cites", "cited_by"):
                    raw_neighbors = await fetch_openalex_results(
                        client,
                        filter_expression=",".join(
                            [
                                f"{relation}:{seed.openalex_id}",
                                "has_abstract:true",
                                "open_access.is_oa:true",
                            ]
                        ),
                        target_count=pack.max_neighbor_count,
                        max_pages=1,
                    )
                    neighbor_raw_results.extend(raw_neighbors)
                    for raw_work in raw_neighbors:
                        normalized = normalize_openalex_work(
                            raw_work,
                            source_pack=pack.id,
                            source_query=relation,
                            origin="neighbor",
                            neighbor_of=seed.openalex_id,
                        )
                        merged_candidates.append(normalized)

            deduped = dedupe_works(merged_candidates)
            ranked = rerank_pack_candidates(deduped, pack)
            accepted = ranked[: pack.target_paper_count]
            _write_json(OPENALEX_RAW_DIR / f"neighbors_{pack.id}.json", neighbor_raw_results)
            artifact["packs"][pack.id] = {
                "display_name": pack.display_name,
                "query_pack": pack.model_dump(),
                "works": [work.model_dump() for work in accepted],
            }

    _write_json(output_path, artifact)
    return artifact


def _pattern_matches(text: str, pattern: str) -> bool:
    lowered = text.lower()
    candidate = pattern.lower().strip()
    if not candidate:
        return False
    if candidate in lowered:
        return True
    try:
        return re.search(pattern, text, flags=re.IGNORECASE) is not None
    except re.error:
        return False


def _review_reasons(work: NormalizedOpenAlexWork, rule: PackReviewRule) -> list[str]:
    key = canonicalize_work_key(work)
    doi = (work.doi or "").lower()
    title = work.title.lower()
    text = _text_blob(work)
    include_ids = {item.lower() for item in rule.include_ids}
    if key in include_ids or work.openalex_id.lower() in include_ids:
        return []

    reasons: list[str] = []
    if work.openalex_id.lower() in {item.lower() for item in rule.exclude_ids}:
        reasons.append("excluded_by_openalex_id")
    if doi and doi in {item.lower() for item in rule.exclude_dois}:
        reasons.append("excluded_by_doi")
    for pattern in rule.exclude_title_patterns:
        if _pattern_matches(title, pattern):
            reasons.append(f"title_pattern:{pattern}")
    for keyword in rule.exclude_keywords:
        if keyword.lower() in text:
            reasons.append(f"keyword:{keyword}")
    return reasons


def curate_accepted_works(
    *,
    accepted_path: Path = ACCEPTED_ARTIFACT_PATH,
    review_path: Path | None = None,
    output_path: Path = REVIEWED_ARTIFACT_PATH,
) -> dict[str, Any]:
    ensure_openalex_dirs()
    review = load_review_config(review_path or review_config_path())
    accepted_artifact = _load_artifact(accepted_path)
    curated: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat(),
        "source_artifact": str(accepted_path),
        "review_config": str(review_path or review_config_path()),
        "review_version": review.version,
        "packs": {},
    }
    accepted_before = 0
    accepted_after = 0
    removed_total = 0

    for pack_id, pack_payload in accepted_artifact.get("packs", {}).items():
        rule = review.packs.get(pack_id, PackReviewRule())
        kept: list[dict[str, Any]] = []
        removed: list[dict[str, Any]] = []
        title_index: dict[str, int] = {}
        for item in pack_payload.get("works", []):
            work = NormalizedOpenAlexWork.model_validate(item)
            accepted_before += 1
            reasons = _review_reasons(work, rule)
            if reasons:
                removed_total += 1
                removed.append(
                    {
                        "openalex_id": work.openalex_id,
                        "title": work.title,
                        "reasons": reasons,
                    }
                )
                continue
            if rule.dedupe_by_normalized_title:
                title_key = canonicalize_work_title(work.title)
                if title_key:
                    existing_idx = title_index.get(title_key)
                    if existing_idx is not None:
                        existing = kept[existing_idx]
                        existing_score = (
                            float(existing.get("pack_scores", {}).get(pack_id, 0.0)),
                            int(existing.get("cited_by_count", 0)),
                            len(existing.get("abstract", "")),
                        )
                        candidate_score = (
                            float(work.pack_scores.get(pack_id, 0.0)),
                            int(work.cited_by_count),
                            len(work.abstract),
                        )
                        if candidate_score > existing_score:
                            removed.append(
                                {
                                    "openalex_id": existing["openalex_id"],
                                    "title": existing["title"],
                                    "reasons": [f"duplicate_title:{title_key}"],
                                }
                            )
                            kept[existing_idx] = work.model_dump()
                        else:
                            removed.append(
                                {
                                    "openalex_id": work.openalex_id,
                                    "title": work.title,
                                    "reasons": [f"duplicate_title:{title_key}"],
                                }
                            )
                        removed_total += 1
                        continue
                    title_index[title_key] = len(kept)
            kept.append(work.model_dump())
            accepted_after += 1
        curated["packs"][pack_id] = {
            "display_name": pack_payload.get("display_name", pack_id),
            "query_pack": pack_payload.get("query_pack", {}),
            "review_notes": rule.notes,
            "kept_count": len(kept),
            "removed_count": len(removed),
            "removed": removed,
            "works": kept,
        }

    curated["summary"] = {
        "accepted_before_review": accepted_before,
        "accepted_after_review": accepted_after,
        "removed_count": removed_total,
    }
    _write_json(output_path, curated)
    return curated


def _strip_html_tags(content: str) -> str:
    content = re.sub(r"<script.*?</script>", " ", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<style.*?</style>", " ", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<[^>]+>", " ", content)
    content = html.unescape(content)
    return re.sub(r"\s+", " ", content).strip()


async def fetch_open_access_excerpt(
    client: httpx.AsyncClient,
    work: NormalizedOpenAlexWork,
    *,
    max_chars: int = 2200,
) -> str:
    url = work.landing_page_url
    if not url:
        return ""
    try:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
    except Exception as exc:
        logger.warning("Failed to fetch OA landing page for %s: %s", work.openalex_id, exc)
        return ""

    content_type = response.headers.get("content-type", "")
    if "pdf" in content_type.lower():
        return ""
    if "text" not in content_type.lower() and "html" not in content_type.lower():
        return ""
    text = _strip_html_tags(response.text)
    return text[:max_chars]


def build_extraction_input_text(work: NormalizedOpenAlexWork, excerpt: str = "") -> str:
    lines = [
        f"Title: {work.title}",
        f"Publication year: {work.publication_year or 'unknown'}",
        f"Primary topic: {work.primary_topic or 'unknown'}",
        f"Source theme packs: {', '.join(work.source_packs)}",
    ]
    if work.concepts:
        lines.append(f"Topics: {', '.join(work.concepts)}")
    if work.abstract:
        lines.append(f"Abstract: {work.abstract}")
    if excerpt:
        lines.append(f"Open access excerpt: {excerpt}")
    return "\n".join(lines)


def _coerce_json_payload(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


async def extract_knowledge_from_text(text: str) -> KnowledgeExtractionResponse:
    content = await get_gemini_response(
        prompt=f"Paper content for extraction:\n{text}",
        system_instruction=OPENALEX_EXTRACTION_PROMPT,
        json_mode=True,
        task="knowledge_extraction",
        use_cache=False,
    )
    try:
        payload = _coerce_json_payload(content)
    except json.JSONDecodeError:
        repaired = await get_gemini_response(
            prompt=(
                "Repair the malformed JSON below and return valid JSON only.\n\n"
                f"{content}"
            ),
            system_instruction=OPENALEX_JSON_REPAIR_PROMPT,
            json_mode=True,
            task="knowledge_extraction",
            use_cache=False,
        )
        payload = _coerce_json_payload(repaired)
    return KnowledgeExtractionResponse.model_validate(payload)


def canonicalize_entity_name(name: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    return re.sub(r"\s+", " ", normalized)


def normalize_entity_type(entity_type: str, *, name: str = "", description: str = "") -> str:
    text = " ".join([entity_type, name, description]).lower()
    if entity_type in ALLOWED_ENTITY_TYPES:
        return entity_type
    if any(token in text for token in ("surface", "roughness", "texture", "riblet", "cuticle", "nanostructure", "microstructure")):
        return "surface_structure"
    if any(token in text for token in ("constraint", "limit", "boundary", "failure mode", "requirement")):
        return "constraint"
    if any(token in text for token in ("tradeoff", "trade-off", "compromise", "penalty")):
        return "tradeoff"
    if any(token in text for token in ("control", "routing", "feedback", "algorithm", "swarm", "regulation")):
        return "control_strategy"
    if any(token in text for token in ("application", "system", "device", "reactor", "panel", "robot", "architecture")):
        return "engineering_application"
    if any(token in text for token in ("material", "composite", "fiber", "coating", "lattice", "membrane")):
        return "material_strategy"
    if any(token in text for token in ("pressure", "diffusion", "capillary", "fluid", "thermal", "mechanical", "flow", "electro", "hydrophobic")):
        return "physical_principle"
    return "biological_mechanism"


def normalize_relation_type(relation_type: str, *, description: str = "") -> str:
    text = " ".join([relation_type, description]).lower()
    if relation_type in ALLOWED_RELATION_TYPES:
        return relation_type
    if any(
        token in text
        for token in (
            "inspire",
            "motivated by",
            "derived from",
            "mapped from",
            "transferred from",
            "cross-domain transfer",
            "cross domain transfer",
            "source-domain transfer",
            "source domain transfer",
            "mechanism transfer",
            "source-domain mechanism",
            "source domain mechanism",
        )
    ):
        return "inspires"
    if any(token in text for token in ("enable", "allow", "support")):
        return "enables"
    if any(token in text for token in ("depend", "requires", "based on", "driven by")):
        return "depends_on"
    if any(token in text for token in ("improve", "reduce", "increase", "optimiz")):
        return "improves"
    if any(token in text for token in ("regulate", "control", "modulate")):
        return "regulated_by"
    if any(token in text for token in ("tradeoff", "trade-off", "compromise")):
        return "trade_off_with"
    if any(token in text for token in ("analog", "similar", "equivalent")):
        return "analogous_to"
    return "implemented_as"


def merge_knowledge_extractions(
    extractions: list[KnowledgeExtractionResponse],
) -> KnowledgeExtractionResponse:
    entity_map: dict[str, Entity] = {}
    edge_map: dict[tuple[str, str, str, str], Relationship] = {}

    def ensure_entity(name: str) -> Entity:
        key = canonicalize_entity_name(name)
        entity = entity_map.get(key)
        if entity is None:
            entity = Entity(
                name=name.strip(),
                type="physical_principle",
                description=f"{name.strip()} referenced during corpus extraction.",
            )
            entity_map[key] = entity
        return entity

    for extraction in extractions:
        for entity in extraction.entities:
            key = canonicalize_entity_name(entity.name)
            normalized_type = normalize_entity_type(
                entity.type,
                name=entity.name,
                description=entity.description,
            )
            candidate = Entity(
                name=entity.name.strip(),
                type=normalized_type,
                description=entity.description.strip(),
            )
            existing = entity_map.get(key)
            if existing is None or len(candidate.description) >= len(existing.description):
                entity_map[key] = candidate

        for relation in extraction.relationships:
            source = ensure_entity(relation.source)
            target = ensure_entity(relation.target)
            normalized_type = normalize_relation_type(
                relation.relation_type,
                description=relation.description,
            )
            normalized_description = relation.description.strip() or (
                f"{source.name} {normalized_type} {target.name}"
            )
            edge_key = (
                canonicalize_entity_name(source.name),
                canonicalize_entity_name(target.name),
                normalized_type,
                normalized_description.lower(),
            )
            edge_map[edge_key] = Relationship(
                source=entity_map[canonicalize_entity_name(source.name)].name,
                target=entity_map[canonicalize_entity_name(target.name)].name,
                relation_type=normalized_type,
                description=normalized_description,
            )

    return KnowledgeExtractionResponse(
        entities=sorted(entity_map.values(), key=lambda item: item.name.lower()),
        relationships=sorted(
            edge_map.values(),
            key=lambda item: (
                item.source.lower(),
                item.target.lower(),
                item.relation_type.lower(),
                item.description.lower(),
            ),
        ),
    )


def _unique_accepted_works(artifact: dict[str, Any]) -> list[NormalizedOpenAlexWork]:
    unique: dict[str, NormalizedOpenAlexWork] = {}
    for pack_payload in artifact.get("packs", {}).values():
        for item in pack_payload.get("works", []):
            work = NormalizedOpenAlexWork.model_validate(item)
            key = canonicalize_work_key(work)
            existing = unique.get(key)
            if existing is None:
                unique[key] = work
            else:
                existing.source_packs = sorted(set(existing.source_packs + work.source_packs))
                existing.source_queries = sorted(set(existing.source_queries + work.source_queries))
                existing.pack_scores |= work.pack_scores
    return list(unique.values())


def select_materialization_works(
    artifact: dict[str, Any],
    *,
    per_pack_limit: int | None,
    max_works: int | None,
) -> list[NormalizedOpenAlexWork]:
    selected_map: dict[str, NormalizedOpenAlexWork] = {}
    for pack_id, pack_payload in artifact.get("packs", {}).items():
        pack_works = [
            NormalizedOpenAlexWork.model_validate(item)
            for item in pack_payload.get("works", [])
        ]
        pack_works.sort(
            key=lambda item: (
                item.pack_scores.get(pack_id, 0.0),
                item.cited_by_count,
                item.publication_year or 0,
            ),
            reverse=True,
        )
        unique_added = 0
        for work in pack_works:
            key = canonicalize_work_key(work)
            existing = selected_map.get(key)
            if existing is None:
                selected_map[key] = work
                unique_added += 1
            else:
                existing.source_packs = sorted(set(existing.source_packs + work.source_packs))
                existing.source_queries = sorted(set(existing.source_queries + work.source_queries))
                existing.pack_scores |= work.pack_scores
            if per_pack_limit is not None and unique_added >= per_pack_limit:
                break

    deduped = dedupe_works(list(selected_map.values()))
    deduped.sort(
        key=lambda item: (
            max(item.pack_scores.values(), default=0.0),
            len(item.source_packs),
            item.cited_by_count,
            item.publication_year or 0,
        ),
        reverse=True,
    )
    if max_works is not None:
        deduped = deduped[:max_works]
    return deduped


def preview_materialization_selection(
    *,
    accepted_path: Path = REVIEWED_ARTIFACT_PATH,
    per_pack_limit: int | None = 8,
    max_works: int | None = None,
    output_path: Path | None = MATERIALIZATION_PREVIEW_PATH,
) -> dict[str, Any]:
    selected_path = accepted_path
    if not selected_path.exists() and accepted_path == REVIEWED_ARTIFACT_PATH:
        selected_path = ACCEPTED_ARTIFACT_PATH
    artifact = _load_artifact(selected_path)
    selected = select_materialization_works(
        artifact,
        per_pack_limit=per_pack_limit,
        max_works=max_works,
    )
    selected_keys = {canonicalize_work_key(work): work for work in selected}
    pack_summaries: list[dict[str, Any]] = []
    for pack_id, pack_payload in artifact.get("packs", {}).items():
        pack_selected = []
        for item in pack_payload.get("works", []):
            work = NormalizedOpenAlexWork.model_validate(item)
            selected_work = selected_keys.get(canonicalize_work_key(work))
            if selected_work is None:
                continue
            pack_selected.append(
                {
                    "openalex_id": selected_work.openalex_id,
                    "title": selected_work.title,
                    "publication_year": selected_work.publication_year,
                    "cited_by_count": selected_work.cited_by_count,
                    "score": round(selected_work.pack_scores.get(pack_id, 0.0), 3),
                    "source_packs": selected_work.source_packs,
                }
            )
        pack_summaries.append(
            {
                "pack_id": pack_id,
                "display_name": pack_payload.get("display_name", pack_id),
                "accepted_work_count": len(pack_payload.get("works", [])),
                "selected_work_count": len(pack_selected),
                "selected_titles": pack_selected,
            }
        )

    preview = {
        "generated_at": datetime.now(UTC).isoformat(),
        "accepted_path": str(selected_path),
        "per_pack_limit": per_pack_limit,
        "max_works": max_works,
        "selected_work_count": len(selected),
        "pack_summaries": pack_summaries,
    }
    if output_path is not None:
        _write_json(output_path, preview)
    return preview


async def materialize_seed_knowledge(
    *,
    accepted_path: Path = ACCEPTED_ARTIFACT_PATH,
    output_path: Path = SEED_KNOWLEDGE_PATH,
    provenance_path: Path = SEED_PROVENANCE_PATH,
    include_fulltext_excerpt: bool = False,
    per_pack_limit: int | None = 8,
    max_works: int | None = None,
) -> tuple[KnowledgeExtractionResponse, list[WorkExtractionResult]]:
    ensure_openalex_dirs()
    accepted_artifact = _load_artifact(accepted_path)
    works = select_materialization_works(
        accepted_artifact,
        per_pack_limit=per_pack_limit,
        max_works=max_works,
    )
    extractions: list[KnowledgeExtractionResponse] = []
    provenance: list[WorkExtractionResult] = []
    sem = asyncio.Semaphore(3)
    progress_path = provenance_path.with_suffix(".partial.json")
    extraction_timeout_seconds = float(os.getenv("OPENALEX_EXTRACTION_TIMEOUT_SECONDS", "180"))

    async def _materialize_work(
        client: httpx.AsyncClient,
        work: NormalizedOpenAlexWork,
    ) -> tuple[KnowledgeExtractionResponse | None, WorkExtractionResult]:
        async with sem:
            excerpt = ""
            try:
                if include_fulltext_excerpt:
                    excerpt = await asyncio.wait_for(
                        fetch_open_access_excerpt(client, work),
                        timeout=30.0,
                    )
                extraction = await asyncio.wait_for(
                    extract_knowledge_from_text(build_extraction_input_text(work, excerpt)),
                    timeout=extraction_timeout_seconds,
                )
            except TimeoutError:
                return None, WorkExtractionResult(
                    openalex_id=work.openalex_id,
                    title=work.title,
                    source_packs=work.source_packs,
                    extraction_status="failed",
                    excerpt_used=bool(excerpt),
                    landing_page_url=work.landing_page_url,
                    pdf_url=work.pdf_url,
                    error=f"timeout after {extraction_timeout_seconds:.0f}s",
                )
            except Exception as exc:
                return None, WorkExtractionResult(
                    openalex_id=work.openalex_id,
                    title=work.title,
                    source_packs=work.source_packs,
                    extraction_status="failed",
                    excerpt_used=bool(excerpt),
                    landing_page_url=work.landing_page_url,
                    pdf_url=work.pdf_url,
                    error=str(exc),
                )
            return extraction, WorkExtractionResult(
                openalex_id=work.openalex_id,
                title=work.title,
                source_packs=work.source_packs,
                extraction_status="success",
                entity_count=len(extraction.entities),
                relationship_count=len(extraction.relationships),
                entity_names=[entity.name for entity in extraction.entities],
                excerpt_used=bool(excerpt),
                landing_page_url=work.landing_page_url,
                pdf_url=work.pdf_url,
            )

    logger.info(
        "Materializing seed knowledge from %s selected works (per_pack_limit=%s, max_works=%s, include_fulltext_excerpt=%s)",
        len(works),
        per_pack_limit,
        max_works,
        include_fulltext_excerpt,
    )
    async with httpx.AsyncClient(follow_redirects=True) as client:
        tasks = [_materialize_work(client, work) for work in works]
        completed = 0
        for future in asyncio.as_completed(tasks):
            extraction, result = await future
            provenance.append(result)
            if extraction is not None:
                extractions.append(extraction)
            completed += 1
            if completed == len(works) or completed % 5 == 0:
                logger.info(
                    "Seed knowledge materialization progress: %s/%s works, %s successes, %s failures",
                    completed,
                    len(works),
                    len(extractions),
                    sum(1 for item in provenance if item.extraction_status != "success"),
                )
                _write_json(
                    progress_path,
                    {
                        "generated_at": datetime.now(UTC).isoformat(),
                        "accepted_work_count": len(works),
                        "completed_work_count": completed,
                        "failed_work_count": sum(1 for item in provenance if item.extraction_status != "success"),
                        "works": [item.model_dump() for item in provenance],
                    },
                )

    merged = merge_knowledge_extractions(extractions)
    _write_json(output_path, merged.model_dump())
    _write_json(
        provenance_path,
        {
            "generated_at": datetime.now(UTC).isoformat(),
            "accepted_work_count": len(works),
            "failed_work_count": sum(1 for item in provenance if item.extraction_status != "success"),
            "works": [item.model_dump() for item in provenance],
        },
    )
    if progress_path.exists():
        progress_path.unlink()
    return merged, provenance


async def build_post_build_health_report(
    *,
    output_path: Path = POST_BUILD_REPORT_PATH,
) -> dict[str, Any]:
    async with get_db_pool().acquire() as conn:
        node_count = await conn.fetchval("SELECT COUNT(*) FROM knowledge_nodes")
        edge_count = await conn.fetchval("SELECT COUNT(*) FROM knowledge_edges")
        community_count = await conn.fetchval("SELECT COUNT(*) FROM communities")
        nodes_with_embeddings = await conn.fetchval(
            "SELECT COUNT(*) FROM knowledge_nodes WHERE embedding IS NOT NULL"
        )
        communities_with_embeddings = await conn.fetchval(
            "SELECT COUNT(*) FROM communities WHERE embedding IS NOT NULL"
        )
        communities_with_summaries = await conn.fetchval(
            "SELECT COUNT(*) FROM communities WHERE summary IS NOT NULL AND summary <> ''"
        )
        top_communities = await conn.fetch(
            """
            SELECT c.community_id, c.title, COUNT(n.id) AS node_count
            FROM communities c
            LEFT JOIN knowledge_nodes n ON n.community_id = c.community_id
            GROUP BY c.community_id, c.title
            ORDER BY node_count DESC, c.community_id ASC
            LIMIT 10
            """
        )
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "nodes": {
            "count": node_count,
            "with_embeddings": nodes_with_embeddings,
            "percent_with_embeddings": round((nodes_with_embeddings / node_count) * 100, 2) if node_count else 0.0,
        },
        "edges": {"count": edge_count},
        "communities": {
            "count": community_count,
            "with_embeddings": communities_with_embeddings,
            "with_summaries": communities_with_summaries,
            "percent_with_embeddings": round((communities_with_embeddings / community_count) * 100, 2) if community_count else 0.0,
            "percent_with_summaries": round((communities_with_summaries / community_count) * 100, 2) if community_count else 0.0,
            "top_titles": [dict(row) for row in top_communities],
        },
    }
    _write_json(output_path, report)
    return report


async def load_seed_knowledge_and_rebuild(
    *,
    seed_path: Path = SEED_KNOWLEDGE_PATH,
    report_path: Path = POST_BUILD_REPORT_PATH,
) -> dict[str, Any]:
    payload = _load_artifact(seed_path)
    extraction = KnowledgeExtractionResponse.model_validate(payload)
    await init_db_pool()
    if not db_connected():
        raise RuntimeError("GRAPH_DATABASE_URL is required to load seed knowledge.")
    try:
        await upsert_knowledge(extraction)
        await run_leiden_clustering()
        await generate_all_community_summaries()
        return await build_post_build_health_report(output_path=report_path)
    finally:
        await close_db_pool()


def _pack_matching_terms(pack: QueryPack) -> list[str]:
    return [
        *pack.include_keywords,
        *pack.benchmark_signals,
        *pack.primary_queries,
        *pack.expansion_queries,
    ]


QUERY_PACK_ROUTING_HINTS: dict[str, list[str]] = {
    "lightweight_structures": [
        "lightweight structural",
        "high-strength lightweight",
        "structural composite",
        "specific stiffness",
        "specific strength",
        "buckling resistance",
        "load-bearing lattice",
        "load bearing lattice",
        "stiffness-to-weight",
        "stiffness to weight",
        "energy-storing compliant structure",
        "energy storing compliant structure",
        "deployable structure",
        "change its shape and stiffness",
        "acoustic metamaterial",
        "poro",
        "breathable acoustic",
        "aeroelastic",
        "turbine blade",
        "foundation system",
        "compression-resistant",
        "hydrostatic pressures",
        "rigid state",
        "wide-field-of-view imaging system",
        "prosthetic or robotic joint",
        "store and release elastic energy",
        "self-regulating network embedded within a porous substrate",
        "branching network",
        "large 3d volume",
        "柔性到刚性",
        "轻量",
        "高强",
        "结构材料",
        "外骨骼",
    ],
    "water_harvesting_desalination": [
        "collecting water from airborne fog",
        "capturing and collecting water from airborne fog",
        "harvests water vapor",
        "water vapor directly from unsaturated air",
        "passive phase separation",
        "membrane selectivity",
        "capillary transport",
        "wettability gradient",
        "condensation",
        "droplet nucleation",
        "osmotic selectivity",
        "fog",
        "desalination",
        "离子",
        "溶解氧",
        "extract dissolved oxygen from water",
        "separation of specific ions",
        "separating microplastics from large volumes of water",
        "distributes nutrients and water",
        "split water into h2 and o2",
        "aqueous solution",
        "bioreactor",
        "depolymerize common waste plastics",
        "集水",
        "空气取水",
        "雾气",
    ],
    "reversible_adhesion": [
        "reversible strong adhesive",
        "adhesive",
        "adhesion",
        "detachable attachment",
        "temporary attachment",
        "rapid release attachment",
        "interfacial bonding",
        "wet adhesion",
        "dry adhesion",
        "switchable friction",
        "contact splitting",
        "medical sutures",
        "mechanical interlocking",
        "bond between diverse materials",
        "underwater construction or repair",
        "climbing robots",
        "rapidly cure in flowing seawater",
        "polymer composite",
        "chemical trigger",
        "soft robotic gripper",
        "anisotropic friction",
        "high static friction",
        "low kinetic friction",
        "缝合",
        "粘附",
        "黏附",
        "可逆",
        "胶",
    ],
    "self_cleaning_antifouling": [
        "self-cleaning",
        "anti-fouling",
        "biofouling",
        "anti-clogging",
        "low adhesion surface",
        "contaminant shedding",
        "surface wetting control",
        "superhydrophobic",
        "slippery surface",
        "anti-soiling",
        "particle shedding",
        "micro-texture for marine applications",
        "deters the settlement of microorganisms",
        "anti-reflective coating for optical lenses or solar cells",
        "surface micro-texture",
        "reflective display surface",
        "altering its nanostructure",
        "active camouflage",
        "patterns of light",
        "capture the degree and angle of linear polarization",
        "wide-field-of-view imaging system",
        "optical lenses",
        "自清洁",
        "抗污",
        "防污",
        "防生物附着",
    ],
    "thermal_regulation_passive_cooling": [
        "passively regulates internal temperature",
        "heating and cooling",
        "thermal",
        "cooling system",
        "insulation",
        "heat rejection",
        "heat exchange",
        "temperature regulation",
        "thermal shielding",
        "passive ventilation",
        "radiative cooling",
        "ice shedding",
        "emissivity control",
        "fire resistance",
        "anti-icing",
        "thermal emissivity",
        "infrared signature",
        "freezing and thawing",
        "heat source",
        "evaporative cooling",
        "ice crystals",
        "thermal conductivity",
        "温度",
        "热",
        "隔热",
        "散热",
        "制冷",
        "防冰",
        "红外",
    ],
    "drag_reduction_flow_control": [
        "reduce noise and improve aerodynamic efficiency",
        "reduce drag",
        "flow control",
        "boundary layer",
        "shear stress",
        "vortex suppression",
        "wake control",
        "pressure recovery",
        "friction reduction",
        "fluid transport efficiency",
        "underwater vehicles",
        "turbulent wind flows",
        "low reynolds numbers",
        "low reynolds",
        "microfluidic",
        "pulsatile pump",
        "pumping system",
        "lubrication layer",
        "flow patterns",
        "pressure gradients",
        "vortices",
        "aerodynamic",
        "hydrodynamic",
        "fluid-based manipulation",
        "flow-through reactor",
        "burrowing probe",
        "granular substrates",
        "granular substrate",
        "hovering flight",
        "soft robotics",
        "internal fluid pressure changes",
        "transport and distribute water and solutes",
        "drag",
        "流体",
        "减阻",
        "气动",
        "水下航行",
    ],
    "impact_protection_energy_dissipation": [
        "impact-resistant",
        "automotive safety",
        "damp low-frequency vibrations",
        "vibrations",
        "energy dissipation",
        "impact attenuation",
        "crashworthiness",
        "shock isolation",
        "fracture deflection",
        "progressive crushing",
        "resonance suppression",
        "percussive drilling",
        "fractures hard, brittle materials",
        "impending impact",
        "energy absorption",
        "liquefaction-prone",
        "seismic event",
        "protect sensitive biological or electronic components",
        "crash",
        "impact",
        "vibration",
        "damping",
        "地震",
        "冲击",
        "能量吸收",
        "减振",
        "阻尼",
    ],
    "swarm_distributed_optimization": [
        "distributed, low-power sensor network",
        "autonomously map an unknown environment",
        "sensor network",
        "large swarm of simple robots",
        "without a central controller",
        "without direct robot-to-robot communication",
        "stigmergic coordination",
        "distributed allocation",
        "decentralized coordination",
        "collective decision making",
        "local rule coordination",
        "emergent routing",
        "resource allocation",
        "task allocation",
        "multi-robot system",
        "cooperatively transport",
        "allocate tasks",
        "distributed array of micro-sensors",
        "autonomous underwater vehicle",
        "local force and torque feedback",
        "navigation system",
        "earth's magnetic field",
        "active sensing system",
        "event-based sensor data",
        "volatile organic compound",
        "chemical signature",
        "self-generated electric field",
        "breath",
        "classify",
        "classification decisions",
        "acoustic sensor array",
        "localize a sound source",
        "unknown environment",
        "distributed",
        "swarm",
        "multi-robot",
        "decentralized",
        "autonomous exploration",
        "群体",
        "分布式",
        "多机器人",
        "协同",
    ],
}


def _routing_hint_score(text: str, pack_id: str) -> int:
    return _keyword_hits(text, QUERY_PACK_ROUTING_HINTS.get(pack_id, []))


def classify_query_to_pack(query: str, packs: list[QueryPack]) -> str:
    text = query.lower()
    best_pack = "unmapped"
    best_score = 0.0
    for pack in packs:
        hint_score = _routing_hint_score(text, pack.id)
        pack_score = _keyword_hits(text, _pack_matching_terms(pack))
        score = hint_score * 10.0 + pack_score
        if score > best_score:
            best_pack = pack.id
            best_score = score
    return best_pack


def _pack_keyword_coverage(pack: QueryPack, works: list[NormalizedOpenAlexWork]) -> dict[str, Any]:
    matched = 0
    total_hits = 0
    for work in works:
        hits = _keyword_hits(_text_blob(work), pack.include_keywords)
        total_hits += hits
        if hits > 0:
            matched += 1
    return {
        "accepted_work_count": len(works),
        "works_with_keyword_hits": matched,
        "keyword_hit_density": round(total_hits / len(works), 2) if works else 0.0,
    }


def _pack_materialization_stats(provenance_payload: dict[str, Any], packs: list[QueryPack]) -> dict[str, dict[str, int]]:
    stats = {
        pack.id: {
            "materialized_work_count": 0,
            "successful_materialized_work_count": 0,
            "extracted_entity_count": 0,
            "extracted_relationship_count": 0,
        }
        for pack in packs
    }
    for item in provenance_payload.get("works", []):
        result = WorkExtractionResult.model_validate(item)
        for pack_id in result.source_packs:
            if pack_id not in stats:
                continue
            stats[pack_id]["materialized_work_count"] += 1
            if result.extraction_status == "success":
                stats[pack_id]["successful_materialized_work_count"] += 1
            stats[pack_id]["extracted_entity_count"] += result.entity_count
            stats[pack_id]["extracted_relationship_count"] += result.relationship_count
    return stats


async def _fetch_pack_community_matches(packs: list[QueryPack]) -> dict[str, int]:
    matches = {pack.id: 0 for pack in packs}
    if not db_connected():
        return matches
    async with get_db_pool().acquire() as conn:
        rows = await conn.fetch("SELECT title, summary FROM communities")
    for row in rows:
        text = f"{row['title'] or ''} {row['summary'] or ''}".lower()
        for pack in packs:
            if _keyword_hits(text, pack.include_keywords + pack.benchmark_signals):
                matches[pack.id] += 1
    return matches


async def analyze_benchmark_coverage(
    *,
    config_path: Path = OPENALEX_QUERY_PACKS_PATH,
    accepted_path: Path = REVIEWED_ARTIFACT_PATH,
    provenance_path: Path = SEED_PROVENANCE_PATH,
    benchmark_query_path: Path = BENCHMARK_QUERY_PATH,
    output_json_path: Path = BENCHMARK_COVERAGE_JSON,
    output_csv_path: Path = BENCHMARK_COVERAGE_CSV,
) -> dict[str, Any]:
    ensure_openalex_dirs()
    packs = load_query_packs(config_path)
    selected_path = accepted_path
    if not selected_path.exists() and accepted_path == REVIEWED_ARTIFACT_PATH:
        selected_path = ACCEPTED_ARTIFACT_PATH
    accepted_artifact = _load_artifact(selected_path)
    pack_works = {
        pack_id: [NormalizedOpenAlexWork.model_validate(item) for item in payload.get("works", [])]
        for pack_id, payload in accepted_artifact.get("packs", {}).items()
    }
    with benchmark_query_path.open("r", encoding="utf-8") as handle:
        benchmark_queries = json.load(handle)

    provenance_payload = _load_artifact(provenance_path) if provenance_path.exists() else {"works": [], "accepted_work_count": 0}
    failed_work_count = provenance_payload.get("failed_work_count", 0)
    accepted_work_count = provenance_payload.get("accepted_work_count", 0)
    materialization_stats = _pack_materialization_stats(provenance_payload, packs)

    query_results: list[dict[str, Any]] = []
    await init_db_pool()
    try:
        pack_community_matches = await _fetch_pack_community_matches(packs)
        for item in benchmark_queries:
            query = item["engineering_query"]
            pack_id = classify_query_to_pack(query, packs)
            vector_hits = 0
            hybrid_hits = 0
            vector_error = ""
            hybrid_error = ""
            try:
                embedding = await get_embedding(query)
                vector_hits = len(await search.fetch_vector_nodes(embedding, limit=5))
            except Exception as exc:
                vector_error = str(exc)
            try:
                communities = await search.retrieve_hybrid_communities(query)
                communities = await search.prune_relevant_communities(query, communities)
                hybrid_hits = len(communities)
            except Exception as exc:
                hybrid_error = str(exc)

            query_results.append(
                {
                    "id": item["id"],
                    "query": query,
                    "assigned_pack": pack_id,
                    "vector_hits": vector_hits,
                    "hybrid_hits": hybrid_hits,
                    "vector_error": vector_error,
                    "hybrid_error": hybrid_error,
                }
            )

        pack_summaries: list[dict[str, Any]] = []
        for pack in packs:
            assigned = [row for row in query_results if row["assigned_pack"] == pack.id]
            coverage = _pack_keyword_coverage(pack, pack_works.get(pack.id, []))
            hybrid_nonempty = sum(1 for row in assigned if row["hybrid_hits"] > 0)
            vector_nonempty = sum(1 for row in assigned if row["vector_hits"] > 0)
            assigned_query_count = len(assigned)
            hybrid_nonempty_rate = round(hybrid_nonempty / assigned_query_count, 4) if assigned_query_count else 0.0
            pack_summaries.append(
                {
                    "pack_id": pack.id,
                    "display_name": pack.display_name,
                    "assigned_query_count": assigned_query_count,
                    "vector_nonempty_queries": vector_nonempty,
                    "hybrid_nonempty_queries": hybrid_nonempty,
                    "hybrid_nonempty_rate": hybrid_nonempty_rate,
                    "community_matches": pack_community_matches.get(pack.id, 0),
                    **coverage,
                    **materialization_stats.get(pack.id, {}),
                }
            )

        no_relevant_ratio = 1.0
        if query_results:
            no_relevant_ratio = sum(1 for row in query_results if row["hybrid_hits"] == 0) / len(query_results)
        extraction_failure_rate = (failed_work_count / accepted_work_count) if accepted_work_count else 0.0
        readiness_checks = {
            "community_per_pack": all(item["community_matches"] > 0 for item in pack_summaries),
            "community_summaries_present": False,
            "community_embeddings_present": False,
            "extraction_failure_rate_under_20_percent": extraction_failure_rate < 0.2,
            "benchmark_queries_not_predominantly_empty": no_relevant_ratio < 0.5,
        }
        if db_connected():
            async with get_db_pool().acquire() as conn:
                community_count = await conn.fetchval("SELECT COUNT(*) FROM communities")
                summary_count = await conn.fetchval("SELECT COUNT(*) FROM communities WHERE summary IS NOT NULL AND summary <> ''")
                embedding_count = await conn.fetchval("SELECT COUNT(*) FROM communities WHERE embedding IS NOT NULL")
            readiness_checks["community_summaries_present"] = community_count > 0 and summary_count == community_count
            readiness_checks["community_embeddings_present"] = community_count > 0 and embedding_count == community_count

        missing_themes = [item["pack_id"] for item in pack_summaries if item["community_matches"] == 0]
        weak_areas = [
            item["pack_id"]
            for item in pack_summaries
            if item["assigned_query_count"] > 0 and item["hybrid_nonempty_queries"] == 0
        ]
        report = {
            "generated_at": datetime.now(UTC).isoformat(),
            "accepted_path": str(selected_path),
            "pack_summaries": pack_summaries,
            "query_results": query_results,
            "readiness_checks": readiness_checks,
            "missing_themes": missing_themes,
            "weak_areas": weak_areas,
            "extraction_failure_rate": round(extraction_failure_rate, 4),
            "hybrid_empty_ratio": round(no_relevant_ratio, 4),
        }
    finally:
        await close_db_pool()

    _write_json(output_json_path, report)
    csv_lines = [
        "pack_id,display_name,assigned_query_count,vector_nonempty_queries,hybrid_nonempty_queries,hybrid_nonempty_rate,community_matches,accepted_work_count,materialized_work_count,successful_materialized_work_count,extracted_entity_count,extracted_relationship_count,works_with_keyword_hits,keyword_hit_density"
    ]
    for item in report["pack_summaries"]:
        csv_lines.append(
            ",".join(
                [
                    item["pack_id"],
                    item["display_name"],
                    str(item["assigned_query_count"]),
                    str(item["vector_nonempty_queries"]),
                    str(item["hybrid_nonempty_queries"]),
                    str(item["hybrid_nonempty_rate"]),
                    str(item["community_matches"]),
                    str(item["accepted_work_count"]),
                    str(item["materialized_work_count"]),
                    str(item["successful_materialized_work_count"]),
                    str(item["extracted_entity_count"]),
                    str(item["extracted_relationship_count"]),
                    str(item["works_with_keyword_hits"]),
                    str(item["keyword_hit_density"]),
                ]
            )
        )
    output_csv_path.write_text("\n".join(csv_lines) + "\n", encoding="utf-8")
    return report
