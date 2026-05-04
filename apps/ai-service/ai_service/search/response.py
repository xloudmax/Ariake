"""GlobalSearchResponse construction and supporting data builders."""

from __future__ import annotations

import json
from typing import Any

from ..models import (
    GlobalSearchResponse,
    RetrievalDiagnostics,
    SupportingCommunity,
    SupportingPost,
)
from .parsing import (
    _coerce_sections_from_json,
    _coerce_sections_from_text,
    _normalize_sections,
    _render_legacy_answer_from_sections,
)

DB_MISSING_ANSWER = "AI Service not fully configured (Database missing)."


def _infer_public_language(query: str | None) -> str:
    if not query:
        return "zh"
    latin = sum(1 for ch in query if ("a" <= ch.lower() <= "z"))
    cjk = sum(1 for ch in query if "\u4e00" <= ch <= "\u9fff")
    return "en" if latin > cjk * 2 and latin > 20 else "zh"


def coerce_global_search_response(
    answer: str,
    *,
    query: str | None = None,
    public_language: str | None = None,
    is_draft: bool = False,
    supporting_communities: list[SupportingCommunity] | None = None,
    supporting_posts: list[SupportingPost] | None = None,
    retrieval_diagnostics: RetrievalDiagnostics | None = None,
) -> GlobalSearchResponse:
    sections = _coerce_sections_from_json(answer)
    sanitized = False
    format_kind = "legacy_text"

    if sections is None:
        sections = _coerce_sections_from_text(answer)
        sanitized = sections is not None
    else:
        sanitized = True

    if sections is not None:
        sections = _normalize_sections(sections)
        format_kind = "structured_json"
        answer = _render_legacy_answer_from_sections(
            sections,
            public_language=public_language or _infer_public_language(query),
        )

    return GlobalSearchResponse(
        answer=answer,
        sections=sections,
        format_kind=format_kind,
        sanitized=sanitized,
        is_draft=is_draft,
        supporting_communities=supporting_communities or [],
        supporting_posts=supporting_posts or [],
        retrieval_diagnostics=retrieval_diagnostics,
    )


def _community_metadata(community: dict[str, Any]) -> dict[str, Any]:
    metadata = community.get("metadata") or {}
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}
    return metadata if isinstance(metadata, dict) else {}


def build_supporting_communities(
    communities: list[dict[str, Any]],
) -> list[SupportingCommunity]:
    items: list[SupportingCommunity] = []
    for community in communities[:4]:
        metadata = _community_metadata(community)
        items.append(
            SupportingCommunity(
                community_id=int(community.get("community_id", 0) or 0),
                title=str(community.get("title", "")),
                summary=str(community.get("summary", "")),
                score=float(community.get("score", 0.0) or 0.0),
                representative_posts=list(metadata.get("representative_posts", []))[:4],
                top_terms=list(metadata.get("top_terms", []))[:5],
                summary_confidence=float(metadata.get("summary_confidence", 0.0) or 0.0),
            )
        )
    return items


def build_supporting_posts(communities: list[dict[str, Any]]) -> list[SupportingPost]:
    posts: list[SupportingPost] = []
    seen: set[str] = set()
    for community in communities:
        metadata = _community_metadata(community)
        source_spans = list(metadata.get("source_spans", []))
        for title in list(metadata.get("representative_posts", []))[:3]:
            key = f"{community.get('community_id')}::{title}"
            if key in seen:
                continue
            seen.add(key)
            posts.append(
                SupportingPost(
                    title=str(title),
                    excerpt=str(source_spans[0]) if source_spans else str(community.get("summary", ""))[:180],
                    community_id=int(community.get("community_id", 0) or 0),
                    source="community_summary",
                )
            )
        if len(posts) >= 6:
            break
    return posts[:6]


def build_retrieval_diagnostics(
    communities_considered: int,
    communities_retained: int,
    *,
    search_mode: str,
    bridge_strength: str,
    vector_weight: float,
    fts_weight: float,
) -> RetrievalDiagnostics:
    return RetrievalDiagnostics(
        search_mode="vector" if search_mode == "vector" else "hybrid",
        communities_considered=communities_considered,
        communities_retained=communities_retained,
        bridge_strength="weak" if bridge_strength == "weak" else "strong",
        ranking_formula=(
            f"score = semantic_similarity*{vector_weight:.2f} + exact_alias_match*{fts_weight:.2f} + "
            "type_prior + edge_confidence + community_density + centrality +/- recency"
        ),
    )


def _build_empty_structured_response(message: str) -> str:
    return json.dumps({
        "thinking_summary": [message],
        "mechanism_check": {
            "body": "No mechanisms found to check.",
            "verdict": "fail"
        },
        "feasibility_check": {
            "body": "No data available for feasibility assessment.",
            "verdict": "low"
        },
        "global_insight": {
            "summary": message,
            "details": ["The knowledge graph does not contain sufficient information to answer this query."]
        },
        "primary_recommendation": "Insufficient Data",
        "why_this_path": "No relevant communities or nodes were found in the database.",
        "action_summary": []
    })
