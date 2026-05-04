"""Query intent routing and community relevance checking."""

from __future__ import annotations

from ..config import logger
from ..llm import get_gemini_response


async def check_community_relevance(query: str, title: str, summary: str) -> bool:
    prompt = (
        f"Query: {query}\n\nCommunity Title: {title}\nCommunity Summary: {summary}\n\n"
        "Is this community even remotely relevant or useful as a stepping stone to answering the query? Answer strictly with YES or NO."
    )
    try:
        answer = await get_gemini_response(
            prompt=prompt,
            system_instruction="You are a lenient relevance judge. If there is ANY thematic overlap, output YES. Output ONLY 'YES' or 'NO'.",
            task="relevance_check",
        )
        return "YES" in answer.upper()
    except Exception as exc:
        logger.warning(
            "Relevance check failed for '%s': %s. Defaulting to relevant.", title, exc
        )
        return True


async def get_intent_weights(query: str) -> dict[str, float]:
    prompt = (
        f"Query: {query}\n\n"
        "Analyze if this query is seeking Analogies/Novelty (DIVERGENT) or Factual/Engineering details (CONVERGENT). "
        "Briefly explain your reasoning and then output EXACTLY [DIVERGENT] or [CONVERGENT] at the end."
    )
    try:
        classification = await get_gemini_response(
            prompt=prompt,
            system_instruction="Analyze query intent. Always include [DIVERGENT] or [CONVERGENT] in your output.",
            task="intent_router",
        )
        if "[DIVERGENT]" in classification.upper():
            return {"vector": 0.9, "fts": 0.1}
        return {"vector": 0.4, "fts": 0.6}
    except Exception as exc:
        logger.warning("Intent routing failed: %s. Using default weights.", exc)
        return {"vector": 0.7, "fts": 0.3}
