"""Database retrieval layer — vector search, hybrid search, community context formatting."""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from ..config import logger
from ..db import get_db_pool
from ..llm import embedding_to_vector_literal, get_embedding, get_gemini_response
from .intent import check_community_relevance, get_intent_weights
from .rules import _community_matches_query_focus


async def fetch_vector_nodes(
    embedding: list[float], limit: int = 15
) -> list[dict[str, Any]]:
    async with get_db_pool().acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT name, description
            FROM knowledge_nodes
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            embedding_to_vector_literal(embedding),
            limit,
        )
    return [dict(row) for row in rows]


def build_hybrid_search_sql(
    vector_weight: float,
    fts_weight: float,
    candidate_limit: int = 50,
    result_limit: int = 5,
) -> str:
    return f"""
        WITH vector_search AS (
            SELECT community_id, title, summary, findings, metadata,
                   ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
            FROM communities
            WHERE embedding IS NOT NULL
            LIMIT {candidate_limit}
        ),
        fts_search AS (
            SELECT community_id, title, summary, findings, metadata,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank_cd(
                           to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '')),
                           plainto_tsquery('simple', $2)
                       ) DESC
                   ) AS rank
            FROM communities
            WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '')) @@ plainto_tsquery('simple', $2)
            LIMIT {candidate_limit}
        )
        SELECT
            COALESCE(v.community_id, f.community_id) AS community_id,
            COALESCE(v.title, f.title) AS title,
            COALESCE(v.summary, f.summary) AS summary,
            COALESCE(v.findings, f.findings) AS findings,
            COALESCE(v.metadata, f.metadata) AS metadata,
            ({vector_weight} * (1.0 / (60 + COALESCE(v.rank, 100))) + {fts_weight} * (1.0 / (60 + COALESCE(f.rank, 100)))) AS score
        FROM vector_search v
        FULL OUTER JOIN fts_search f ON v.community_id = f.community_id
        ORDER BY score DESC
        LIMIT {result_limit}
    """


async def fetch_hybrid_communities(
    query: str, embedding: list[float], vector_weight: float, fts_weight: float
) -> list[dict[str, Any]]:
    sql = build_hybrid_search_sql(vector_weight, fts_weight)
    async with get_db_pool().acquire() as conn:
        rows = await conn.fetch(sql, embedding_to_vector_literal(embedding), query)
    return [dict(row) for row in rows]


async def extract_query_constraints(query: str) -> str:
    """Extract the hardest physical / engineering constraints from *query*.

    Used to augment the retrieval embedding so that constraint-aligned
    communities rank higher than surface-keyword matches.
    """
    try:
        return await get_gemini_response(
            prompt=(
                f"Engineering query: {query}\n\n"
                "Extract ONLY the hardest physical/engineering constraints "
                "that make this problem difficult. Output a comma-separated "
                "list of constraint keywords (e.g. 'thermal runaway propagation, "
                "cell-to-cell isolation, >800°C tolerance'). Focus on what "
                "makes this problem HARD, not what domain it belongs to."
            ),
            system_instruction=(
                "You are a constraint extractor for engineering queries. "
                "Output only technical constraint keywords, no sentences."
            ),
            task="constraint_extraction",
        )
    except Exception as exc:
        logger.warning("Constraint extraction failed: %s. Using raw query.", exc)
        return ""


def _merge_communities(
    primary: list[dict[str, Any]],
    augmented: list[dict[str, Any]],
    max_total: int = 5,
) -> list[dict[str, Any]]:
    """Merge two community lists, deduplicating by community_id.

    *augmented* results appear first (constraint-anchored), followed by any
    *primary* results not already present.
    """
    seen: set[int] = set()
    merged: list[dict[str, Any]] = []
    for community in augmented + primary:
        cid = community.get("community_id")
        if cid in seen:
            continue
        seen.add(cid)
        merged.append(community)
        if len(merged) >= max_total:
            break
    return merged


async def retrieve_hybrid_communities(query: str) -> list[dict[str, Any]]:
    # Launch constraint extraction, intent routing, and embedding in parallel
    constraints_task = asyncio.create_task(extract_query_constraints(query))
    weights_task = asyncio.create_task(get_intent_weights(query))
    embedding_task = asyncio.create_task(get_embedding(query))
    constraints, weights, embedding = await asyncio.gather(
        constraints_task, weights_task, embedding_task
    )

    # Dual-path retrieval: raw query + constraint-augmented query
    primary_task = asyncio.create_task(
        fetch_hybrid_communities(query, embedding, weights["vector"], weights["fts"])
    )

    augmented_communities: list[dict[str, Any]] = []
    if constraints.strip():
        augmented_query = f"{query} [CONSTRAINTS: {constraints}]"
        constraint_embedding = await get_embedding(augmented_query)
        augmented_communities = await fetch_hybrid_communities(
            augmented_query, constraint_embedding, weights["vector"], weights["fts"]
        )

    primary_communities = await primary_task
    communities = _merge_communities(primary_communities, augmented_communities)

    if communities:
        for community in communities:
            community["bridge_strength"] = "strong"
            community["vector_weight"] = weights["vector"]
            community["fts_weight"] = weights["fts"]
        return communities

    logger.warning(
        "Hit Ultra-Divergence Barrier for query: %s. Engaging Stepping-Stone Fallback.",
        query,
    )
    bridge_query = await get_gemini_response(
        prompt=f"Extract only the underlying source-domain mechanisms, physical principles, structural strategies, or control logic from this query: '{query}'. Output a comma-separated list of technical keywords, no conversational text.",
        system_instruction="You are a mechanism and principles extractor. Output only technical keywords.",
        task="stepping_stone",
    )
    bridge_embedding = await get_embedding(bridge_query)
    communities = await fetch_hybrid_communities(
        query, bridge_embedding, weights["vector"], weights["fts"]
    )
    for community in communities:
        community["bridge_strength"] = "weak"
        community["vector_weight"] = weights["vector"]
        community["fts_weight"] = weights["fts"]
    return communities



async def prune_relevant_communities(
    query: str, communities: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    tasks = [
        check_community_relevance(query, community["title"], community["summary"])
        for community in communities
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    relevant = []
    for community, result in zip(communities, results):
        if isinstance(result, Exception):
            logger.warning(
                "Exception during relevance check for '%s': %s",
                community["title"],
                result,
            )
            relevant.append(community)
            continue
        if result is not True:
            logger.info("Pruning irrelevant community: %s", community["title"])
            continue
        if not _community_matches_query_focus(
            query, str(community.get("title", "")), str(community.get("summary", ""))
        ):
            logger.info("Pruning off-axis community for query focus: %s", community["title"])
            continue
        relevant.append(community)
    return relevant


# ---------------------------------------------------------------------------
# Context formatting helpers
# ---------------------------------------------------------------------------


def format_vector_context(nodes: list[dict[str, Any]]) -> str:
    return "\n\n".join(
        f"### Node: {node['name']}\n**Content**: {node['description']}"
        for node in nodes
    )


def _community_transfer_insights(findings: dict[str, Any]) -> list[str]:
    primary = findings.get("transfer_insights")
    if isinstance(primary, list) and primary:
        return primary
    # Legacy communities may still store the pre-migration `sparks` field.
    legacy = findings.get("sparks")
    if isinstance(legacy, list):
        return legacy
    return []


def _community_mechanism_line(community: dict[str, Any], findings: dict[str, Any]) -> str:
    transfer_insights = _community_transfer_insights(findings)
    if isinstance(transfer_insights, list) and transfer_insights:
        return str(transfer_insights[0]).strip()
    return str(community.get("summary", "")).strip()


def _community_use_case_fit(query: str, community: dict[str, Any]) -> str:
    summary = str(community.get("summary", "")).strip()
    if not summary:
        return f"Provides adjacent cross-domain evidence relevant to: {query}"
    return summary


def _community_hard_detail(findings: dict[str, Any]) -> str:
    technical_details = str(findings.get("technical_details", "")).strip()
    if technical_details:
        lines = [line.strip(" -•\t") for line in re.split(r"[\n;]+", technical_details) if line.strip()]
        return lines[0] if lines else technical_details
    return "Not specified"


def _community_tradeoff(findings: dict[str, Any]) -> str:
    trade_offs = findings.get("trade_offs", "Not specified")
    if isinstance(trade_offs, list):
        return str(trade_offs[0]) if trade_offs else "Not specified"
    return str(trade_offs).strip() or "Not specified"


def format_community_context(communities: list[dict[str, Any]], query: str = "") -> str:
    parts = []
    for community in communities[:3]:
        findings = {}
        try:
            findings = json.loads(community.get("findings") or "{}")
        except Exception:
            findings = {}
        mechanism = _community_mechanism_line(community, findings)
        use_case_fit = _community_use_case_fit(query, community)
        hard_detail = _community_hard_detail(findings)
        trade_offs = _community_tradeoff(findings)
        parts.append(
            f"### Community: {community['title']}\n"
            f"**Mechanism**: {mechanism}\n"
            f"**Use-case Fit**: {use_case_fit}\n"
            f"**Hard Detail**: {hard_detail}\n"
            f"**Main Trade-off**: {trade_offs}"
        )
    return "\n\n".join(parts)
