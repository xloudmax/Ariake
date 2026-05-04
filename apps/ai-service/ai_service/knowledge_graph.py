from __future__ import annotations

import asyncio
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone

import asyncpg
import igraph as ig
import leidenalg

from .config import logger
from .db import db_connected, get_db_pool
from .llm import get_embedding, get_gemini_response
from .models import KnowledgeExtractionResponse
from .prompts import COMMUNITY_SUMMARY_PROMPT

COMMUNITY_SUMMARY_REPAIR_PROMPT = """
Repair malformed JSON for a knowledge-community summary.

Return ONLY valid JSON matching:
{
  "title": "...",
  "summary": "...",
  "transfer_insights": ["..."],
  "trade_offs": "...",
  "technical_details": "..."
}
"""

NODE_TYPE_ALIASES = {
    "framework": "framework",
    "frontend framework": "framework",
    "library": "tool",
    "tool": "tool",
    "language": "tool",
    "topic": "topic",
    "concept": "concept",
    "principle": "concept",
    "mechanism": "mechanism",
    "biological mechanism": "mechanism",
    "material strategy": "pattern",
    "pattern": "pattern",
    "architecture": "pattern",
    "case study": "case",
    "case": "case",
}

RELATION_TYPE_ALIASES = {
    "depends": "depends_on",
    "depends on": "depends_on",
    "dependency": "depends_on",
    "implements": "implements",
    "implementation": "implements",
    "uses": "uses",
    "inspires": "inspired_by",
    "inspired by": "inspired_by",
    "influences": "inspired_by",
    "optimizes": "optimizes",
    "improves": "optimizes",
    "contrasts with": "contrasts_with",
    "evolves to": "evolves_to",
    "supersedes": "evolves_to",
}


def _coerce_summary_json(content: str) -> dict:
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


async def _prepare_knowledge_payload(
    extraction: KnowledgeExtractionResponse,
    source_metadata: dict[str, object] | None = None,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]]]:
    source_metadata = source_metadata or {}
    source_post_id = str(source_metadata.get("post_id") or source_metadata.get("slug") or "").strip()
    source_span_prefix = str(source_metadata.get("title") or "").strip()
    canonical_entities: dict[str, dict[str, object]] = {}

    for entity in extraction.entities:
        normalized_key = _normalize_entity_key(entity.name)
        canonical = canonical_entities.get(normalized_key)
        if canonical is None:
            canonical_entities[normalized_key] = {
                "canonical_name": normalized_key,
                "display_name": _prefer_spaced_variant(entity.name),
                "name": _prefer_spaced_variant(entity.name),
                "type": _normalize_node_type(entity.type),
                "description": entity.description.strip(),
                "aliases": {_prefer_spaced_variant(entity.name)},
                "version": _extract_version(entity.name),
                "status": "active",
                "source_spans": [entity.description.strip()] if entity.description.strip() else [],
            }
        else:
            canonical["display_name"] = _choose_display_name(str(canonical["display_name"]), entity.name)
            canonical["name"] = canonical["display_name"]
            canonical["type"] = _choose_type(str(canonical["type"]), _normalize_node_type(entity.type))
            canonical["description"] = _choose_description(
                str(canonical["description"]), entity.description
            )
            canonical["version"] = canonical["version"] or _extract_version(entity.name)
            canonical["source_spans"] = [
                *list(canonical.get("source_spans", [])),
                *([entity.description.strip()] if entity.description.strip() else []),
            ]
        canonical_entities[normalized_key]["aliases"].add(_prefer_spaced_variant(entity.name))

    normalized_relationships: dict[tuple[str, str, str], dict[str, object]] = {}
    for rel in extraction.relationships:
        source_name = _resolve_canonical_name(rel.source, canonical_entities)
        target_name = _resolve_canonical_name(rel.target, canonical_entities)
        if not source_name or not target_name or source_name == target_name:
            continue
        relation_type = _normalize_relation_type(rel.relation_type)
        normalized_description = rel.description.strip() or (
            f"{source_name} {relation_type} {target_name}"
        )
        rel_key = (source_name.casefold(), target_name.casefold(), relation_type)
        existing = normalized_relationships.get(rel_key)
        if existing is None:
            normalized_relationships[rel_key] = {
                "source_name": source_name,
                "target_name": target_name,
                "relation_type": relation_type,
                "description": normalized_description,
                "confidence": _estimate_relationship_confidence(
                    relation_type, normalized_description
                ),
                "evidence_count": 1,
                "directionality": "directed",
                "source_post_ids": [],
                "source_spans": [normalized_description],
            }
        else:
            existing["description"] = _choose_description(
                str(existing["description"]), normalized_description
            )
            existing["confidence"] = max(
                float(existing["confidence"]),
                _estimate_relationship_confidence(relation_type, normalized_description),
            )
            existing["evidence_count"] = int(existing["evidence_count"]) + 1
            existing["source_spans"] = [
                *list(existing.get("source_spans", [])),
                normalized_description,
            ]

    sem = asyncio.Semaphore(10)

    async def _get_embedding_guarded(text: str) -> list[float]:
        async with sem:
            return await get_embedding(text)

    embedding_lists = await asyncio.gather(
        *[_get_embedding_guarded(str(entity["description"])) for entity in canonical_entities.values()]
    )

    nodes: list[dict[str, object]] = []
    evidence_rows: list[dict[str, object]] = []
    for entity, embedding_list in zip(canonical_entities.values(), embedding_lists):
        aliases = sorted(str(alias) for alias in entity["aliases"])
        metadata = {
            "aliases": aliases,
            "version": entity.get("version"),
            "status": entity.get("status", "active"),
            "source_count": len(aliases),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
            "source_post_ids": [source_post_id] if source_post_id else [],
            "source_spans": list(dict.fromkeys(entity.get("source_spans", []))),
        }
        nodes.append(
            {
                "name": entity["name"],
                "canonical_name": entity["canonical_name"],
                "display_name": entity["display_name"],
                "type": entity["type"],
                "description": entity["description"],
                "embedding": "[" + ",".join(map(str, embedding_list)) + "]",
                "metadata": json.dumps(metadata, ensure_ascii=False),
            }
        )
        for alias in aliases:
            evidence_rows.append(
                {
                    "entity_kind": "node",
                    "canonical_name": entity["canonical_name"],
                    "post_id": source_post_id,
                    "source_span": " / ".join(part for part in [source_span_prefix, alias] if part),
                    "signature": _make_signature(
                        "node",
                        str(entity["canonical_name"]),
                        source_post_id,
                        alias,
                    ),
                    "metadata": json.dumps({"alias": alias, **source_metadata}, ensure_ascii=False),
                }
            )

    relationships = list(normalized_relationships.values())
    if source_post_id:
        for relationship in relationships:
            relationship["source_post_ids"] = [source_post_id]
    for relationship in relationships:
        evidence_rows.append(
            {
                "entity_kind": "edge",
                "canonical_name": "",
                "source_name": relationship["source_name"],
                "target_name": relationship["target_name"],
                "relation_type": relationship["relation_type"],
                "post_id": source_post_id,
                "source_span": relationship["description"],
                "signature": _make_signature(
                    "edge",
                    str(relationship["source_name"]),
                    str(relationship["target_name"]),
                    str(relationship["relation_type"]),
                    source_post_id,
                    str(relationship["description"]),
                ),
                "metadata": json.dumps(
                    {
                        "relation_type": relationship["relation_type"],
                        "confidence": relationship["confidence"],
                        **source_metadata,
                    },
                    ensure_ascii=False,
                ),
            }
        )
    return nodes, relationships, evidence_rows


def _normalize_entity_key(name: str) -> str:
    normalized = unicodedata.normalize("NFKC", name).casefold()
    normalized = re.sub(r"[\-_/]+", " ", normalized)
    normalized = re.sub(r"[^0-9a-z\s]+", " ", normalized)
    tokens = [_singularize_token(token) for token in normalized.split()]
    return " ".join(token for token in tokens if token)


def _singularize_token(token: str) -> str:
    if len(token) <= 3:
        return token
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith(("ches", "shes", "xes", "zes")) and len(token) > 4:
        return token[:-2]
    if token.endswith("s") and not token.endswith(("ss", "us", "is")):
        return token[:-1]
    return token


def _prefer_spaced_variant(name: str) -> str:
    return re.sub(r"[\-_/]+", " ", name.strip())


def _choose_display_name(existing: str, candidate: str) -> str:
    existing_clean = _prefer_spaced_variant(existing)
    candidate_clean = _prefer_spaced_variant(candidate)
    if candidate_clean.istitle() and not existing_clean.istitle():
        return candidate_clean
    if len(candidate_clean) < len(existing_clean):
        return candidate_clean
    if candidate_clean.count(" ") > existing_clean.count(" "):
        return candidate_clean
    return existing_clean


def _choose_type(existing: str, candidate: str) -> str:
    candidate_clean = candidate.strip()
    if not existing.strip():
        return candidate_clean
    if len(candidate_clean) > len(existing.strip()):
        return candidate_clean
    return existing.strip()


def _normalize_node_type(candidate: str) -> str:
    lowered = candidate.strip().lower()
    if lowered in NODE_TYPE_ALIASES:
        return NODE_TYPE_ALIASES[lowered]
    normalized = re.sub(r"[^a-z0-9]+", "_", lowered).strip("_")
    return NODE_TYPE_ALIASES.get(normalized, normalized or "concept")


def _normalize_relation_type(candidate: str) -> str:
    lowered = candidate.strip().lower()
    if lowered in RELATION_TYPE_ALIASES:
        return RELATION_TYPE_ALIASES[lowered]
    normalized = re.sub(r"[^a-z0-9]+", "_", lowered).strip("_")
    return RELATION_TYPE_ALIASES.get(normalized, normalized or "uses")


def _choose_description(existing: str, candidate: str) -> str:
    existing_clean = existing.strip()
    candidate_clean = candidate.strip()
    if len(candidate_clean) > len(existing_clean):
        return candidate_clean
    return existing_clean


def _resolve_canonical_name(
    raw_name: str, canonical_entities: dict[str, dict[str, object]]
) -> str | None:
    normalized_key = _normalize_entity_key(raw_name)
    entity = canonical_entities.get(normalized_key)
    if entity is None:
        return None
    return str(entity["canonical_name"])


def _extract_version(name: str) -> str | None:
    match = re.search(r"\b\d+(?:\.\d+)+\b|\b\d+\b", name)
    return match.group(0) if match else None


def _estimate_relationship_confidence(relation_type: str, description: str) -> float:
    base = 0.65 if relation_type in {"implements", "depends_on", "optimizes"} else 0.58
    if len(description) > 80:
        base += 0.15
    elif len(description) > 30:
        base += 0.08
    return min(base, 0.95)


def _make_signature(*parts: str) -> str:
    return hashlib.sha1("::".join(parts).encode("utf-8")).hexdigest()


async def _persist_knowledge_payload(
    conn: asyncpg.Connection,
    nodes: list[dict[str, object]],
    relationships: list[dict[str, object]],
    evidence_rows: list[dict[str, object]],
) -> tuple[int, int]:
    entity_name_to_id: dict[str, str] = {}

    if nodes:
        rows = await conn.fetch(
            """
            WITH input_data AS (
                SELECT unnest($1::text[]) AS name,
                       unnest($2::text[]) AS canonical_name,
                       unnest($3::text[]) AS display_name,
                       unnest($4::text[]) AS type,
                       unnest($5::text[]) AS description,
                       unnest($6::text[]) AS embedding,
                       unnest($7::jsonb[]) AS metadata
            )
            INSERT INTO knowledge_nodes (name, canonical_name, display_name, type, description, embedding, metadata)
            SELECT name, canonical_name, display_name, type, description, embedding::vector, metadata FROM input_data
            ON CONFLICT (canonical_name) DO UPDATE
            SET name = EXCLUDED.name,
                display_name = EXCLUDED.display_name,
                type = COALESCE(EXCLUDED.type, knowledge_nodes.type),
                description = EXCLUDED.description,
                embedding = EXCLUDED.embedding,
                metadata = COALESCE(knowledge_nodes.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, canonical_name
            """,
            [str(node["name"]) for node in nodes],
            [str(node["canonical_name"]) for node in nodes],
            [str(node["display_name"]) for node in nodes],
            [str(node["type"]) for node in nodes],
            [str(node["description"]) for node in nodes],
            [str(node["embedding"]) for node in nodes],
            [str(node["metadata"]) for node in nodes],
        )
        for index, row in enumerate(rows):
            canonical_name = row.get("canonical_name") if hasattr(row, "get") else None
            if canonical_name is None and index < len(nodes):
                canonical_name = str(nodes[index]["canonical_name"])
            if canonical_name is None and hasattr(row, "get"):
                canonical_name = row.get("name")
            if canonical_name is None:
                continue
            entity_name_to_id[str(canonical_name)] = row["id"]

    edges_to_insert = []
    for relationship in relationships:
        source_id = entity_name_to_id.get(str(relationship["source_name"]))
        target_id = entity_name_to_id.get(str(relationship["target_name"]))
        if source_id and target_id and source_id != target_id:
            edges_to_insert.append(
                (
                    source_id,
                    target_id,
                    str(relationship["relation_type"]),
                    str(relationship["description"]),
                    float(relationship["confidence"]),
                    int(relationship["evidence_count"]),
                    str(relationship["directionality"]),
                    json.dumps(relationship.get("source_post_ids", []), ensure_ascii=False),
                    json.dumps(list(dict.fromkeys(relationship.get("source_spans", []))), ensure_ascii=False),
                )
            )

    if edges_to_insert:
        await conn.executemany(
            """
            INSERT INTO knowledge_edges (
                source_id,
                target_id,
                relation_type,
                description,
                confidence,
                evidence_count,
                directionality,
                source_post_ids,
                source_spans
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
            ON CONFLICT (source_id, target_id, relation_type) DO UPDATE
            SET description = EXCLUDED.description,
                confidence = GREATEST(knowledge_edges.confidence, EXCLUDED.confidence),
                evidence_count = knowledge_edges.evidence_count + EXCLUDED.evidence_count,
                directionality = EXCLUDED.directionality,
                source_post_ids = EXCLUDED.source_post_ids,
                source_spans = EXCLUDED.source_spans,
                metadata = COALESCE(knowledge_edges.metadata, '{}'::jsonb) || jsonb_build_object(
                    'last_upserted_at', CURRENT_TIMESTAMP
                )
            """,
            edges_to_insert,
        )

    if evidence_rows:
        node_evidence_rows = [
            (
                entity_name_to_id.get(str(row["canonical_name"])),
                str(row["entity_kind"]),
                str(row["post_id"]),
                str(row["source_span"]),
                str(row["signature"]),
                str(row["metadata"]),
            )
            for row in evidence_rows
            if row["entity_kind"] == "node" and entity_name_to_id.get(str(row["canonical_name"]))
        ]
        if node_evidence_rows:
            await conn.executemany(
                """
                INSERT INTO knowledge_evidence (node_id, entity_kind, post_id, source_span, signature, metadata)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                ON CONFLICT DO NOTHING
                """,
                node_evidence_rows,
            )

        edge_rows = await conn.fetch(
            """
            SELECT e.id, s.canonical_name AS source_name, t.canonical_name AS target_name, e.relation_type
            FROM knowledge_edges e
            JOIN knowledge_nodes s ON s.id = e.source_id
            JOIN knowledge_nodes t ON t.id = e.target_id
            WHERE (s.canonical_name, t.canonical_name, e.relation_type) IN (
                SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
            )
            """,
            [str(row["source_name"]) for row in evidence_rows if row["entity_kind"] == "edge"],
            [str(row["target_name"]) for row in evidence_rows if row["entity_kind"] == "edge"],
            [str(row["relation_type"]) for row in evidence_rows if row["entity_kind"] == "edge"],
        ) if any(row["entity_kind"] == "edge" for row in evidence_rows) else []

        edge_map = {
            (row["source_name"], row["target_name"], row["relation_type"]): row["id"]
            for row in edge_rows
            if "source_name" in row and "target_name" in row and "relation_type" in row
        }
        edge_evidence_rows = []
        for row in evidence_rows:
            if row["entity_kind"] != "edge":
                continue
            edge_id = edge_map.get((row["source_name"], row["target_name"], row["relation_type"]))
            if not edge_id:
                continue
            edge_evidence_rows.append(
                (
                    edge_id,
                    str(row["entity_kind"]),
                    str(row["post_id"]),
                    str(row["source_span"]),
                    str(row["signature"]),
                    str(row["metadata"]),
                )
            )
        if edge_evidence_rows:
            await conn.executemany(
                """
                INSERT INTO knowledge_evidence (edge_id, entity_kind, post_id, source_span, signature, metadata)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                ON CONFLICT DO NOTHING
                """,
                edge_evidence_rows,
            )

    return len(nodes), len(edges_to_insert)


async def upsert_knowledge_with_connection(
    conn: asyncpg.Connection,
    extraction: KnowledgeExtractionResponse,
    source_metadata: dict[str, object] | None = None,
) -> tuple[int, int]:
    nodes, relationships, evidence_rows = await _prepare_knowledge_payload(extraction, source_metadata)
    return await _persist_knowledge_payload(conn, nodes, relationships, evidence_rows)


async def upsert_knowledge(
    extraction: KnowledgeExtractionResponse,
    source_metadata: dict[str, object] | None = None,
) -> None:
    if not db_connected():
        logger.warning("No database pool available. Skipping upsert.")
        return
    nodes, relationships, evidence_rows = await _prepare_knowledge_payload(extraction, source_metadata)
    async with get_db_pool().acquire() as conn:
        await _persist_knowledge_payload(conn, nodes, relationships, evidence_rows)


async def run_clustering_with_connection(conn: asyncpg.Connection) -> int:
    rows = await conn.fetch(
        """
        SELECT source_id, target_id, confidence, evidence_count
        FROM knowledge_edges
        WHERE confidence >= 0.55 AND evidence_count >= 1
        """
    )
    if not rows:
        return 0

    graph = ig.Graph()
    nodes_set = set()
    edges = []
    for row in rows:
        source_id = str(row["source_id"])
        target_id = str(row["target_id"])
        nodes_set.add(source_id)
        nodes_set.add(target_id)
        edges.append((source_id, target_id))

    node_list = list(nodes_set)
    node_to_idx = {node_id: idx for idx, node_id in enumerate(node_list)}
    graph.add_vertices(len(node_list))
    graph.add_edges(
        [
            (node_to_idx[s], node_to_idx[t])
            for s, t in edges
            if s in node_to_idx and t in node_to_idx
        ]
    )

    loop = asyncio.get_running_loop()
    partition = await loop.run_in_executor(
        None,
        lambda: leidenalg.find_partition(graph, leidenalg.ModularityVertexPartition),
    )

    async with conn.transaction():
        for community_id, node_indices in enumerate(partition):
            node_uuids = [node_list[idx] for idx in node_indices]
            await conn.execute(
                "UPDATE knowledge_nodes SET community_id = $1 WHERE id = ANY($2::uuid[])",
                community_id,
                node_uuids,
            )
    logger.info(
        "Leiden clustering completed: %s communities identified.", len(partition)
    )
    return len(partition)


async def run_leiden_clustering() -> int:
    if not db_connected():
        return 0
    async with get_db_pool().acquire() as conn:
        return await run_clustering_with_connection(conn)


async def generate_all_community_summaries() -> None:
    if not db_connected():
        return

    async with get_db_pool().acquire() as conn:
        community_rows = await conn.fetch(
            "SELECT DISTINCT community_id FROM knowledge_nodes WHERE community_id IS NOT NULL"
        )
    community_ids = [row["community_id"] for row in community_rows]
    if not community_ids:
        return

    sem = asyncio.Semaphore(5)

    async def _summarize_one(community_id: int) -> None:
        async with sem:
            async with get_db_pool().acquire() as conn:
                nodes = await conn.fetch(
                    """
                    SELECT
                        COALESCE(NULLIF(display_name, ''), name) AS display_name,
                        canonical_name,
                        description,
                        metadata
                    FROM knowledge_nodes
                    WHERE community_id = $1
                    ORDER BY jsonb_array_length(COALESCE(metadata->'aliases', '[]'::jsonb)) DESC, updated_at DESC
                    LIMIT 20
                    """,
                    community_id,
                )
                edges = await conn.fetch(
                    """
                    SELECT e.relation_type, e.description, e.confidence, e.evidence_count
                    FROM knowledge_edges e
                    JOIN knowledge_nodes n1 ON e.source_id = n1.id
                    JOIN knowledge_nodes n2 ON e.target_id = n2.id
                    WHERE n1.community_id = $1 AND n2.community_id = $1
                    AND e.confidence >= 0.55
                    LIMIT 20
                    """,
                    community_id,
                )

            entities_str = "\n".join(
                f"- {node['display_name']}: {node['description']}" for node in nodes
            )
            rels_str = "\n".join(
                f"- {edge['relation_type']} (confidence={edge['confidence']:.2f}, evidence={edge['evidence_count']}): {edge['description']}"
                for edge in edges
            )
            top_terms = [node["display_name"] for node in nodes[:5]]
            representative_posts: list[str] = []
            source_spans: list[str] = []
            for node in nodes:
                metadata = node.get("metadata") or {}
                if isinstance(metadata, str):
                    try:
                        metadata = json.loads(metadata)
                    except json.JSONDecodeError:
                        metadata = {}
                representative_posts.extend(metadata.get("source_post_ids", []))
                source_spans.extend(metadata.get("source_spans", []))
            representative_posts = list(dict.fromkeys(representative_posts))[:5]
            summary_confidence = round(
                sum(float(edge["confidence"]) for edge in edges) / max(len(edges), 1), 3
            )

            try:
                content = await get_gemini_response(
                    prompt=COMMUNITY_SUMMARY_PROMPT.format(
                        entities=entities_str, relationships=rels_str
                    ),
                    json_mode=True,
                    task="community_summary",
                )
                try:
                    data = _coerce_summary_json(content)
                except json.JSONDecodeError:
                    repaired = await get_gemini_response(
                        prompt=(
                            "Repair the malformed JSON below and return valid JSON only.\n\n"
                            f"{content}"
                        ),
                        system_instruction=COMMUNITY_SUMMARY_REPAIR_PROMPT,
                        json_mode=True,
                        task="community_summary",
                    )
                    data = _coerce_summary_json(repaired)
                findings_data = {
                    # Legacy payloads may still emit `sparks`; normalize them on write.
                    "transfer_insights": data.get(
                        "transfer_insights", data.get("sparks", [])
                    ),
                    "trade_offs": data.get("trade_offs", ""),
                    "technical_details": data.get("technical_details", ""),
                }
                embedding = await get_embedding(
                    f"{data['title']} {data['summary']} {' '.join(top_terms)}"
                )
                metadata = {
                    "node_count": len(nodes),
                    "edge_count": len(edges),
                    "top_terms": top_terms,
                    "representative_posts": representative_posts,
                    "summary_confidence": summary_confidence,
                    "source_spans": source_spans[:8],
                }
                async with get_db_pool().acquire() as conn:
                    await conn.execute(
                        """
                        INSERT INTO communities (community_id, level, title, summary, findings, embedding, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb)
                        ON CONFLICT (community_id) DO UPDATE SET
                            title = EXCLUDED.title,
                            summary = EXCLUDED.summary,
                            findings = EXCLUDED.findings,
                            embedding = EXCLUDED.embedding,
                            metadata = COALESCE(communities.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                            updated_at = CURRENT_TIMESTAMP
                        """,
                        community_id,
                        0,
                        data["title"],
                        data["summary"],
                        json.dumps(findings_data),
                        "[" + ",".join(map(str, embedding)) + "]",
                        json.dumps(metadata),
                    )
            except Exception as exc:
                logger.error(
                    "Failed to generate summary for community %s: %s", community_id, exc
                )

    await asyncio.gather(
        *[_summarize_one(community_id) for community_id in community_ids],
        return_exceptions=True,
    )
