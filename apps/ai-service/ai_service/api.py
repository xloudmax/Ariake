from __future__ import annotations

import asyncio
import json
import re
from contextlib import asynccontextmanager

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse

from . import db
from .cache import load_caches, save_caches, periodic_cache_sync
from .config import logger
from .exceptions import DatabaseError, ExtractionError, GraphNotReadyError, SearchError
from .knowledge_graph import (
    generate_all_community_summaries,
    run_leiden_clustering,
    upsert_knowledge,
)
from .llm import (
    EmbeddingGenerationError,
    ModelUnavailableError,
    client_configured,
    get_embedding,
    get_gemini_response,
)
from .mechanism_tree import (
    generate_mechanism_tree_response,
    stream_mechanism_tree_events,
    export_tree_to_dot,
)
from .models import (
    EmbeddingRequest,
    EmbeddingResponse,
    FlattenedMechanismResponse,
    GenerateTreeRequest,
    GlobalSearchRequest,
    KnowledgeExtractionRequest,
    KnowledgeExtractionResponse,
)
from .prompts import KNOWLEDGE_EXTRACTION_PROMPT
from .search import (
    DB_MISSING_ANSWER,
    perform_global_search,
    stream_global_search_events,
)


@asynccontextmanager
async def lifespan(_app):
    load_caches()
    await db.init_db_pool()
    sync_task = asyncio.create_task(periodic_cache_sync())
    try:
        yield
    finally:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass
        await db.close_db_pool()
        save_caches()


def _log_task_error(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception() is not None:
        exc = task.exception()
        logger.error("Background task failed: %s", exc, exc_info=exc)


def _model_unavailable_http_exception() -> HTTPException:
    return HTTPException(status_code=503, detail="AI model client is not configured.")


def _stream_done_response(payload: str | dict[str, object]) -> StreamingResponse:
    async def event_generator():
        if isinstance(payload, str):
            body: dict[str, object] = {"type": "done", "answer": payload}
        else:
            body = {"type": "done", **payload}
        yield f"data: {json.dumps(body, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _stream_error_response(
    message: str, *, status_code: int = 503
) -> StreamingResponse:
    async def event_generator():
        yield f"data: {json.dumps({'type': 'error', 'error': message})}\n\n"

    return StreamingResponse(
        event_generator(), media_type="text/event-stream", status_code=status_code
    )


router = APIRouter()


def _coerce_knowledge_extraction_payload(raw_content: str) -> KnowledgeExtractionResponse:
    text = raw_content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise
        payload = json.loads(match.group(0), strict=False)

    entities = []
    for entity in payload.get("entities", []):
        if not isinstance(entity, dict):
            continue
        name = (
            entity.get("name")
            or entity.get("label")
            or entity.get("title")
            or ""
        ).strip()
        if not name:
            continue
        entities.append(
            {
                "name": name,
                "type": (entity.get("type") or entity.get("category") or "concept").strip(),
                "description": (entity.get("description") or entity.get("content") or name).strip(),
            }
        )

    relationships = []
    for relationship in payload.get("relationships", []):
        if not isinstance(relationship, dict):
            continue
        source = (relationship.get("source") or relationship.get("from") or "").strip()
        target = (relationship.get("target") or relationship.get("to") or "").strip()
        if not source or not target or source == target:
            continue
        relationships.append(
            {
                "source": source,
                "target": target,
                "relation_type": (
                    relationship.get("relation_type")
                    or relationship.get("type")
                    or "uses"
                ).strip(),
                "description": (
                    relationship.get("description")
                    or f"{source} uses {target}"
                ).strip(),
            }
        )

    return KnowledgeExtractionResponse(
        entities=entities,
        relationships=relationships,
    )


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "C404 Insight AI"}


@router.get("/db-health")
async def db_health_check():
    if not db.db_connected():
        return JSONResponse(
            status_code=503,
            content={"status": "disconnected", "reason": "Pool not initialized"},
        )
    try:
        async with db.get_db_pool().acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "connected", "details": "PostgreSQL is reachable"}
    except Exception as exc:
        return JSONResponse(
            status_code=503, content={"status": "error", "message": str(exc)}
        )


@router.post("/generate/mechanism-tree", response_model=FlattenedMechanismResponse)
async def generate_mechanism_tree(request: GenerateTreeRequest):
    try:
        return await generate_mechanism_tree_response(request.query)
    except Exception as exc:
        logger.error("Error generating tree: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/generate/mechanism-tree/stream")
async def generate_mechanism_tree_stream(request: GenerateTreeRequest):
    async def event_generator():
        try:
            async for item in stream_mechanism_tree_events(request.query):
                yield item
        except Exception as exc:
            logger.error("Error in streaming generator: %s", exc)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/generate/mechanism-tree/export")
async def export_mechanism_tree(request: GenerateTreeRequest, format: str = "json"):
    try:
        response = await generate_mechanism_tree_response(request.query)
        if format.lower() == "dot":
            dot_content = export_tree_to_dot(response.nodes, response.edges)
            return PlainTextResponse(content=dot_content, media_type="text/vnd.graphviz")
        return response
    except Exception as exc:
        logger.error("Error exporting tree: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/extract/knowledge", response_model=KnowledgeExtractionResponse)
async def extract_knowledge_endpoint(request: KnowledgeExtractionRequest):
    """Extract entities and relationships from text."""
    logger.info("Knowledge extraction requested", extra={"text_length": len(request.text) if request.text else 0})
    
    if request.manual_data:
        data_to_use = (
            request.manual_data if isinstance(request.manual_data, dict) else {}
        )
        extraction = KnowledgeExtractionResponse(**data_to_use)
        task = asyncio.create_task(
            upsert_knowledge(extraction, request.source_metadata)
        )
        task.add_done_callback(_log_task_error)
        logger.info("Manual knowledge data processed", extra={"entities": len(extraction.entities)})
        return extraction

    try:
        if not client_configured():
            raise ModelUnavailableError("AI model client is not configured")
        
        content = await get_gemini_response(
            prompt=f"Text: {request.text}",
            system_instruction=KNOWLEDGE_EXTRACTION_PROMPT,
            json_mode=True,
            task="knowledge_extraction",
        )
        extraction = _coerce_knowledge_extraction_payload(content)
        
        task = asyncio.create_task(
            upsert_knowledge(extraction, request.source_metadata)
        )
        task.add_done_callback(_log_task_error)
        
        logger.info(
            "Knowledge extracted successfully",
            extra={
                "entities": len(extraction.entities),
                "relationships": len(extraction.relationships),
            },
        )
        return extraction
    except ModelUnavailableError:
        raise
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse extraction response", extra={"error": str(exc)})
        raise ExtractionError("Failed to parse AI response") from exc
    except Exception as exc:
        logger.error("Knowledge extraction failed", extra={"error": str(exc)}, exc_info=True)
        raise ExtractionError(f"Extraction failed: {str(exc)}") from exc


@router.post("/embedding", response_model=EmbeddingResponse)
async def embedding_endpoint(request: EmbeddingRequest):
    """Generate vector embedding for text."""
    logger.info("Embedding requested", extra={"text_length": len(request.text)})
    
    try:
        if not client_configured():
            raise ModelUnavailableError("AI model client is not configured")
        
        embedding = await get_embedding(request.text)
        logger.info("Embedding generated", extra={"dimension": len(embedding)})
        return EmbeddingResponse(embedding=embedding)
    except ModelUnavailableError:
        raise
    except EmbeddingGenerationError as exc:
        logger.error("Embedding generation failed", extra={"error": str(exc)})
        raise ExtractionError(f"Embedding failed: {str(exc)}") from exc
    except Exception as exc:
        logger.error("Embedding endpoint failed", extra={"error": str(exc)}, exc_info=True)
        raise ExtractionError(f"Embedding failed: {str(exc)}") from exc


async def _build_and_summarize_communities() -> None:
    """Background task to build communities and generate summaries."""
    try:
        logger.info("Starting community building")
        count = await run_leiden_clustering()
        logger.info("Clustering completed", extra={"communities": count})
        
        logger.info("Starting community summarization")
        await generate_all_community_summaries()
        logger.info("Community summarization complete")
    except Exception as exc:
        logger.error("Community building failed", extra={"error": str(exc)}, exc_info=True)
        raise


@router.post("/graph/build-communities", status_code=202)
async def build_communities_endpoint():
    """Build graph communities using Leiden algorithm and generate summaries."""
    logger.info("Community building requested")
    
    try:
        if not db.db_connected():
            raise DatabaseError("Database not connected")
        
        task = asyncio.create_task(_build_and_summarize_communities())
        task.add_done_callback(_log_task_error)
        
        return {
            "status": "accepted",
            "message": "Community building and summarization started in background.",
        }
    except DatabaseError:
        raise
    except Exception as exc:
        logger.error("Community building initiation failed", extra={"error": str(exc)}, exc_info=True)
        raise DatabaseError(f"Failed to start community building: {str(exc)}") from exc


@router.post("/graph/global-search")
async def global_search_endpoint(request: GlobalSearchRequest):
    """Perform global GraphRAG search over community summaries."""
    logger.info(
        "Global search requested",
        extra={
            "query": request.query[:100],
            "search_mode": request.search_mode,
        },
    )
    
    try:
        if not db.db_connected():
            return {
                "answer": DB_MISSING_ANSWER,
                "format_version": "v2",
                "format_kind": "legacy_text",
                "sanitized": False,
            }
        
        result = await perform_global_search(
            query=request.query,
            search_mode=request.search_mode,
            active_ingredients=request.active_ingredients,
            bypass_critic=request.bypass_critic,
        )
        
        if result.get("answer") == DB_MISSING_ANSWER:
            logger.warning("Search returned no results - graph may not be ready")
            raise GraphNotReadyError("Knowledge graph not ready or empty")
        
        logger.info("Global search completed successfully")
        return result
    except (DatabaseError, GraphNotReadyError):
        raise
    except ModelUnavailableError:
        raise
    except EmbeddingGenerationError as exc:
        logger.error("Search embedding generation failed", extra={"error": str(exc)})
        raise SearchError(f"Failed to generate search embedding: {str(exc)}") from exc
    except Exception as exc:
        logger.error("Global search failed", extra={"error": str(exc)}, exc_info=True)
        raise SearchError(f"Search failed: {str(exc)}") from exc


@router.post("/graph/global-search/stream")
async def global_search_stream_endpoint(request: GlobalSearchRequest):
    if not client_configured():
        return _stream_error_response("AI model client is not configured.")
    if not db.db_connected():
        return _stream_done_response(
            {
                "answer": DB_MISSING_ANSWER,
                "format_version": "v2",
                "format_kind": "legacy_text",
                "sanitized": False,
            }
        )

    async def event_generator():
        try:
            async for item in stream_global_search_events(
                query=request.query,
                search_mode=request.search_mode,
                active_ingredients=request.active_ingredients,
            ):
                yield item
        except Exception as exc:
            logger.error("Error in LLM global search stream: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
