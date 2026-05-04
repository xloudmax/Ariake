from __future__ import annotations

from typing import Any

import asyncpg

from .config import GRAPH_DATABASE_URL, logger

db_pool: asyncpg.Pool | None = None


async def setup_database_indexes(conn: asyncpg.Connection) -> None:
    try:
        # Create HNSW indexes for fast vector cosine similarity search
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_kn_embedding ON knowledge_nodes USING hnsw (embedding vector_cosine_ops)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_comm_embedding ON communities USING hnsw (embedding vector_cosine_ops)")
        # Create GIN index for fast full-text search
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_comm_fts ON communities USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '')))")
        logger.info("Database vector and FTS indexes verified/created successfully.")
    except asyncpg.exceptions.UndefinedTableError:
        logger.warning("Tables not found during index creation. Skipping index setup for now.")
    except Exception as exc:
        logger.error("Failed to setup database indexes: %s", exc)


async def init_db_pool() -> None:
    global db_pool
    if db_pool is not None:
        return

    if not GRAPH_DATABASE_URL:
        logger.warning("GRAPH_DATABASE_URL not set. Knowledge storage will be skipped.")
        return

    try:
        db_pool = await asyncpg.create_pool(
            GRAPH_DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=30.0,
            max_inactive_connection_lifetime=300.0,
        )
        async with db_pool.acquire() as conn:
            await conn.execute("SELECT 1")
            await setup_database_indexes(conn)
        logger.info(
            "Database pool created and verified successfully (PostgreSQL/pgvector)."
        )
    except Exception as exc:
        logger.error(
            "Failed to connect to PostgreSQL at %s: %s", GRAPH_DATABASE_URL, exc
        )
        db_pool = None


async def close_db_pool() -> None:
    global db_pool
    if db_pool is not None:
        await db_pool.close()
        logger.info("Database pool closed.")
        db_pool = None


def get_db_pool() -> asyncpg.Pool:
    if db_pool is None:
        raise RuntimeError("Database pool not initialized. Check GRAPH_DATABASE_URL.")
    return db_pool


def db_connected() -> bool:
    return db_pool is not None


def get_db_pool_info() -> dict[str, Any]:
    if db_pool is None:
        return {}
    return {
        "pool_size": db_pool.get_size(),
        "pool_idle": db_pool.get_idle_size(),
        "pool_max": db_pool.get_max_size(),
    }
