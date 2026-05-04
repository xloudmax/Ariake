from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from contextlib import suppress
from urllib.parse import urlparse, urlunparse
from unittest import mock

import asyncpg
from fastapi.testclient import TestClient

from ai_service.app import create_app
from ai_service.script_support import load_service_env

VECTOR = [0.1] * 768
VECTOR_LITERAL = "[" + ",".join(map(str, VECTOR)) + "]"


def _database_urls() -> tuple[str, str, str]:
    base_url = os.getenv("GRAPH_DATABASE_URL")
    if not base_url:
        raise RuntimeError("GRAPH_DATABASE_URL is required for PostgreSQL smoke tests.")

    parsed = urlparse(base_url)
    admin_db = (parsed.path or "/postgres").lstrip("/") or "postgres"
    admin_url = urlunparse(parsed._replace(path=f"/{admin_db}"))
    db_name = f"codex_ai_service_smoke_{uuid.uuid4().hex[:8]}"
    temp_url = urlunparse(parsed._replace(path=f"/{db_name}"))
    return admin_url, temp_url, db_name


async def _create_temp_db(admin_url: str, db_name: str) -> None:
    admin = await asyncpg.connect(admin_url)
    try:
        await admin.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await admin.close()


async def _drop_temp_db(admin_url: str, db_name: str) -> None:
    admin = await asyncpg.connect(admin_url)
    try:
        await admin.execute(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
            """,
            db_name,
        )
        await admin.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    finally:
        await admin.close()


async def _seed_temp_db(
    temp_url: str,
    node_names: tuple[str, str, str],
    uuids: tuple[str, str, str],
    community_id: int,
    community_title: str,
) -> None:
    schema_sql = [
        "CREATE EXTENSION IF NOT EXISTS vector",
        """
        CREATE TABLE knowledge_nodes (
            id uuid PRIMARY KEY,
            name text NOT NULL UNIQUE,
            type text,
            description text,
            embedding vector(768),
            community_id integer,
            created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE knowledge_edges (
            source_id uuid NOT NULL,
            target_id uuid NOT NULL,
            relation_type text,
            description text,
            created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (source_id, target_id, relation_type, description)
        )
        """,
        """
        CREATE TABLE communities (
            community_id integer PRIMARY KEY,
            level integer NOT NULL DEFAULT 0,
            title text,
            summary text,
            findings jsonb,
            embedding vector(768),
            created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]

    node_a, node_b, node_c = node_names
    uuid_a, uuid_b, uuid_c = uuids
    conn = await asyncpg.connect(temp_url)
    try:
        for stmt in schema_sql:
            await conn.execute(stmt)

        await conn.execute(
            """
            INSERT INTO knowledge_nodes (id, name, type, description, embedding)
            VALUES ($1, $2, 'test', 'Cluster node A', $4::vector),
                   ($3, $5, 'test', 'Cluster node B', $4::vector),
                   ($6, $7, 'test', 'Cluster node C', $4::vector)
            """,
            uuid_a,
            node_a,
            uuid_b,
            VECTOR_LITERAL,
            node_b,
            uuid_c,
            node_c,
        )
        await conn.execute(
            """
            INSERT INTO knowledge_edges (source_id, target_id, relation_type, description)
            VALUES ($1, $2, 'smoke_link', 'A linked to B'),
                   ($2, $3, 'smoke_link', 'B linked to C')
            """,
            uuid_a,
            uuid_b,
            uuid_c,
        )
        await conn.execute(
            """
            INSERT INTO communities (community_id, level, title, summary, findings, embedding)
            VALUES ($1, 0, $2, 'Streaming smoke summary', $3, $4::vector)
            ON CONFLICT (community_id) DO UPDATE SET
                title = EXCLUDED.title,
                summary = EXCLUDED.summary,
                findings = EXCLUDED.findings,
                embedding = EXCLUDED.embedding,
                updated_at = CURRENT_TIMESTAMP
            """,
            community_id,
            community_title,
            json.dumps({"sparks": ["Stream spark"], "trade_offs": "Stream trade-off"}),
            VECTOR_LITERAL,
        )
    finally:
        await conn.close()


async def _inspect_cluster_state(
    temp_url: str, node_names: tuple[str, str, str]
) -> tuple[list[dict[str, object]], int, list[dict[str, object]]]:
    conn = await asyncpg.connect(temp_url)
    try:
        node_rows = await conn.fetch(
            "SELECT name, community_id FROM knowledge_nodes WHERE name = ANY($1::text[]) ORDER BY name",
            list(node_names),
        )
        community_count = await conn.fetchval("SELECT COUNT(*) FROM communities")
        community_rows = await conn.fetch(
            "SELECT community_id, title, summary FROM communities ORDER BY community_id"
        )
        return (
            [
                {"name": row["name"], "community_id": row["community_id"]}
                for row in node_rows
            ],
            community_count,
            [
                {
                    "community_id": row["community_id"],
                    "title": row["title"],
                    "summary": row["summary"],
                }
                for row in community_rows
            ],
        )
    finally:
        await conn.close()


def run_smoke() -> None:
    load_service_env()
    admin_url, temp_url, db_name = asyncio.run(_bootstrap_temp_db())

    try:
        _run_http_smoke(temp_url)
    finally:
        asyncio.run(_drop_temp_db(admin_url, db_name))


async def _bootstrap_temp_db() -> tuple[str, str, str]:
    admin_url, temp_url, db_name = _database_urls()
    node_names = tuple(
        f"smoke-node-{uuid.uuid4().hex[:6]}-{suffix}" for suffix in ("a", "b", "c")
    )
    uuids = tuple(str(uuid.uuid4()) for _ in range(3))
    community_id = 950000 + int(uuid.uuid4().hex[:4], 16)
    community_title = f"codex-stream-community-{uuid.uuid4().hex[:8]}"

    await _create_temp_db(admin_url, db_name)
    try:
        await _seed_temp_db(temp_url, node_names, uuids, community_id, community_title)
    except Exception:
        with suppress(Exception):
            await _drop_temp_db(admin_url, db_name)
        raise

    os.environ["AI_SERVICE_SMOKE_DB_URL"] = temp_url
    os.environ["AI_SERVICE_SMOKE_NODE_NAMES"] = json.dumps(node_names)
    os.environ["AI_SERVICE_SMOKE_COMMUNITY_ID"] = str(community_id)
    os.environ["AI_SERVICE_SMOKE_COMMUNITY_TITLE"] = community_title
    return admin_url, temp_url, db_name


def _run_http_smoke(temp_url: str) -> None:
    node_names = tuple(json.loads(os.environ["AI_SERVICE_SMOKE_NODE_NAMES"]))
    community_title = os.environ["AI_SERVICE_SMOKE_COMMUNITY_TITLE"]

    with (
        mock.patch("ai_service.api.load_caches", return_value=None),
        mock.patch("ai_service.api.save_caches", return_value=None),
        mock.patch("ai_service.app.AI_SERVICE_API_KEY", None),
        mock.patch("ai_service.config.GRAPH_DATABASE_URL", temp_url),
        mock.patch("ai_service.db.GRAPH_DATABASE_URL", temp_url),
        mock.patch(
            "ai_service.knowledge_graph.get_gemini_response",
            new=mock.AsyncMock(
                return_value=json.dumps(
                    {
                        "title": "Smoke Community",
                        "summary": "Temporary summary",
                        "sparks": ["One"],
                        "trade_offs": "Low",
                    }
                )
            ),
        ),
        mock.patch(
            "ai_service.knowledge_graph.get_embedding",
            new=mock.AsyncMock(return_value=VECTOR),
        ),
        mock.patch(
            "ai_service.search.get_embedding", new=mock.AsyncMock(return_value=VECTOR)
        ),
        mock.patch(
            "ai_service.search.get_gemini_response",
            new=mock.AsyncMock(return_value="draft from postgres smoke"),
        ),
        mock.patch(
            "ai_service.search.get_intent_weights",
            new=mock.AsyncMock(return_value={"vector": 0.7, "fts": 0.3}),
        ),
        mock.patch(
            "ai_service.search.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ),
    ):
        with TestClient(create_app()) as client:
            build_response = client.post("/graph/build-communities")
            print("build_status=" + str(build_response.status_code))
            print("build_body=" + build_response.text)

            for _ in range(30):
                node_rows, community_count, community_rows = asyncio.run(
                    _inspect_cluster_state(temp_url, node_names)
                )
                if community_count >= 1 and all(
                    row["community_id"] is not None for row in node_rows
                ):
                    break
                time.sleep(0.1)

            print("cluster_nodes=" + json.dumps(node_rows))
            print("cluster_community_count=" + str(community_count))
            print("cluster_communities=" + json.dumps(community_rows))

            with client.stream(
                "POST",
                "/graph/global-search/stream",
                json={"query": community_title, "search_mode": "hybrid"},
            ) as stream_response:
                stream_body = "".join(stream_response.iter_text())
                print("stream_status=" + str(stream_response.status_code))
                print("stream_body=" + stream_body)


if __name__ == "__main__":
    run_smoke()
