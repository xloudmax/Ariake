from __future__ import annotations

import hashlib
from collections.abc import AsyncIterator
from typing import Any

from google import genai
from google.genai import types
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .cache import embedding_cache, gemini_cache
from .config import (
    GOOGLE_CLOUD_API_KEY,
    LOCATION,
    PROJECT_ID,
    get_model_setting,
    logger,
)
from .exceptions import AIServiceError


class ModelUnavailableError(AIServiceError):
    def __init__(self, message: str = "AI model client is not configured."):
        super().__init__(message, status_code=503)


class EmbeddingGenerationError(AIServiceError):
    def __init__(self, message: str = "Embedding generation failed."):
        super().__init__(message, status_code=500)


def _build_client():
    if GOOGLE_CLOUD_API_KEY:
        return genai.Client(vertexai=True, api_key=GOOGLE_CLOUD_API_KEY)
    if PROJECT_ID:
        return genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
    return None


client = _build_client()
if client is not None:
    logger.info("GenAI Client (v1) initialized for Express Mode")
else:
    logger.warning(
        "GenAI client not configured. AI endpoints will run in degraded mode."
    )


def client_configured() -> bool:
    return client is not None


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _call_gemini_aio(
    final_model: str, prompt: str | list[Any], gen_config: types.GenerateContentConfig
) -> str:
    if client is None:
        raise ModelUnavailableError("AI model client is not configured.")

    logger.info("Initiating SDK call to %s...", final_model)
    response = await client.aio.models.generate_content(
        model=final_model, contents=prompt, config=gen_config
    )
    logger.info("SDK call to %s returned successfully.", final_model)

    if not response or not response.candidates:
        raise RuntimeError(f"Empty candidates from Gemini API for {final_model}")

    try:
        res_text = response.text
    except Exception:
        res_text = None

    if not res_text:
        candidate = response.candidates[0]
        if candidate.content and candidate.content.parts is not None:
            for part in candidate.content.parts:
                if getattr(part, "text", None):
                    return part.text
                if getattr(part, "thought", None):
                    return part.thought
        if getattr(candidate, "thought", None):
            return candidate.thought

    if not res_text or not res_text.strip():
        try:
            logger.error("RAW CANDIDATE DUMP:\n%s", response.model_dump_json(indent=2))
        except Exception:
            logger.error(
                "No text part found in Gemini response candidate: %s", response
            )
        raise RuntimeError("No text part found in Gemini response candidate")

    return res_text


async def get_gemini_response(
    prompt: str | list[Any],
    system_instruction: str | None = None,
    json_mode: bool = False,
    model_id: str | None = None,
    task: str | None = None,
    use_cache: bool = True,
) -> str:
    if client is None:
        raise ModelUnavailableError("AI model client is not configured.")

    cache_payload = f"{system_instruction or ''}|{prompt}|{json_mode}"
    cache_key = hashlib.sha256(cache_payload.encode()).hexdigest()
    if use_cache and cache_key in gemini_cache:
        logger.info("Gemini cache hit for task: %s", task or "unspecified")
        return gemini_cache[cache_key]

    final_model = model_id
    temperature = 1.0
    max_tokens = 65535

    if task:
        final_model = final_model or get_model_setting(task, "model_id")
        temperature = get_model_setting(task, "temperature", temperature)
        max_tokens = get_model_setting(task, "max_tokens", max_tokens)

    if not final_model:
        raise ModelUnavailableError(
            f"No model_id configured for task {task!r}; set it in model_config.yaml."
        )

    thinking_level = get_model_setting(task, "thinking_level", None) if task else None
    thinking_cfg = (
        types.ThinkingConfig(thinking_level=thinking_level) if thinking_level else None
    )

    gen_config = types.GenerateContentConfig(
        thinking_config=thinking_cfg,
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_instruction,
        response_mime_type="application/json" if json_mode else "text/plain",
    )

    response_text = await _call_gemini_aio(final_model, prompt, gen_config)
    if use_cache:
        gemini_cache[cache_key] = response_text
    return response_text


async def stream_gemini_response(
    prompt: str | list[Any],
    system_instruction: str | None = None,
    json_mode: bool = False,
    model_id: str | None = None,
    task: str | None = None,
) -> AsyncIterator[str]:
    """Stream text chunks from Gemini, reading model settings from model_config.yaml.

    Mirrors get_gemini_response's task-based resolution but does not cache
    (streaming cache semantics are out of scope). Yields text deltas as they
    arrive.
    """
    if client is None:
        raise ModelUnavailableError("AI model client is not configured.")

    final_model = model_id
    temperature = 1.0
    max_tokens = 65535

    if task:
        final_model = final_model or get_model_setting(task, "model_id")
        temperature = get_model_setting(task, "temperature", temperature)
        max_tokens = get_model_setting(task, "max_tokens", max_tokens)

    if not final_model:
        raise ModelUnavailableError(
            f"No model_id configured for task {task!r}; set it in model_config.yaml."
        )

    thinking_level = get_model_setting(task, "thinking_level", None) if task else None
    thinking_cfg = (
        types.ThinkingConfig(thinking_level=thinking_level) if thinking_level else None
    )

    gen_config = types.GenerateContentConfig(
        thinking_config=thinking_cfg,
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_instruction,
        response_mime_type="application/json" if json_mode else "text/plain",
    )

    logger.info("Initiating streaming SDK call to %s...", final_model)
    stream = await client.aio.models.generate_content_stream(
        model=final_model, contents=prompt, config=gen_config
    )
    async for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield text
    logger.info("Streaming SDK call to %s completed.", final_model)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _call_embedding_aio(model: str, text: str) -> list[float]:
    if client is None:
        raise ModelUnavailableError("AI model client is not configured.")
        
    logger.info("Initiating embedding SDK call to %s...", model)
    response = await client.aio.models.embed_content(
        model=model,
        contents=text,
    )
    if hasattr(response, "embeddings") and response.embeddings:
        return list(response.embeddings[0].values)
    logger.warning("Embedding response missing 'embeddings' attribute or empty: %s", response)
    raise EmbeddingGenerationError("Embedding response did not contain usable vectors.")


async def get_embedding(text: str, *, allow_fallback: bool = False) -> list[float]:
    cache_key = hashlib.sha256(text.encode()).hexdigest()
    if cache_key in embedding_cache:
        return embedding_cache[cache_key]

    model_id = get_model_setting("embeddings", "model_id", "text-embedding-004")
    
    # Determine embedding dimension based on model
    dim = 768
    if "text-embedding-3-large" in model_id:
        dim = 3072
    elif "text-embedding-3-small" in model_id:
        dim = 1536
        
    fallback_vector = [0.0] * dim

    if client is None:
        if allow_fallback:
            return fallback_vector
        raise ModelUnavailableError("AI model client is not configured.")

    try:
        embedding = await _call_embedding_aio(model_id, text)
        embedding_cache[cache_key] = embedding
        return embedding
    except Exception as exc:
        logger.error("Embedding error: %s", exc)
        if allow_fallback:
            return fallback_vector
        raise EmbeddingGenerationError(f"Embedding generation failed: {exc}") from exc


def embedding_to_vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(map(str, embedding)) + "]"
