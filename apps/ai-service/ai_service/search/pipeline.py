"""Top-level search orchestration — perform_global_search, streaming, vector/hybrid pipelines."""

from __future__ import annotations

import json
from typing import Any

from ..config import logger
from ..db import db_connected
from ..llm import get_embedding, get_gemini_response
from .critic import (
    _query_first_critic_context,
    _query_override_notes_block,
    evaluate_and_refine_answer,
)
from .delivery import run_engineering_delivery_pass
from .response import (
    DB_MISSING_ANSWER,
    _build_empty_structured_response,
    build_retrieval_diagnostics,
    build_supporting_communities,
    build_supporting_posts,
    coerce_global_search_response,
)
from .retrieval import (
    fetch_vector_nodes,
    format_community_context,
    format_vector_context,
    prune_relevant_communities,
    retrieve_hybrid_communities,
)
from .rules import (
    _infer_engineering_backbone,
    _prefer_query_first_generation,
)

# L3: Retrieval alignment threshold — when the average constraint-alignment
# score of surviving communities falls below this value (0–1 scale), the
# pipeline escalates to query-first generation instead of forcing the LLM
# to reason over off-axis graph context.
_RETRIEVAL_ALIGNMENT_THRESHOLD = 0.5


async def _assess_retrieval_alignment(
    query: str, communities: list[dict[str, Any]]
) -> float:
    """Score how well *communities* align with the hardest constraints in *query*.

    Returns a float in [0, 1].  A low score means the retrieved context is
    off-axis and the pipeline should prefer query-first generation.
    """
    if not communities:
        return 0.0
    titles_and_summaries = "\n".join(
        f"- {c.get('title', '?')}: {str(c.get('summary', ''))[:200]}"
        for c in communities[:3]
    )
    try:
        raw = await get_gemini_response(
            prompt=(
                f"Engineering Query: {query}\n\n"
                f"Retrieved communities:\n{titles_and_summaries}\n\n"
                "Rate how well these retrieved communities match the HARDEST "
                "physical constraint in the query. Output a single float from "
                "0.0 (completely off-axis, no useful constraint coverage) to "
                "1.0 (directly addresses the core constraint). "
                "Output ONLY the number."
            ),
            system_instruction=(
                "You are a retrieval quality auditor. Output a single float "
                "between 0.0 and 1.0. Nothing else."
            ),
            task="retrieval_alignment",
        )
        score = float(raw.strip())
        return max(0.0, min(1.0, score))
    except Exception as exc:
        logger.warning("Retrieval alignment assessment failed: %s. Assuming aligned.", exc)
        return 1.0


async def perform_vector_search(
    query: str, bypass_critic: bool = False
) -> dict[str, Any]:
    embedding = await get_embedding(query)
    nodes = await fetch_vector_nodes(embedding)
    retrieval_diagnostics = build_retrieval_diagnostics(
        len(nodes),
        len(nodes),
        search_mode="vector",
        bridge_strength="strong",
        vector_weight=1.0,
        fts_weight=0.0,
    )
    if not nodes:
        return coerce_global_search_response(
            _build_empty_structured_response("No relevant vector chunks found."),
            query=query,
            retrieval_diagnostics=retrieval_diagnostics,
        ).model_dump()

    context = format_vector_context(nodes)
    draft = await get_gemini_response(
        prompt=f"Query: {query}\n\nData Context:\n{context}",
        system_instruction="You are a technical assistant. Draft a comprehensive engineering response based ONLY on the provided local vector chunks context.",
        task="vector_search",
    )
    if bypass_critic:
        return coerce_global_search_response(
            draft,
            query=query,
            is_draft=True,
            retrieval_diagnostics=retrieval_diagnostics,
        ).model_dump()
    final_answer = await evaluate_and_refine_answer(
        query=query,
        context=context,
        draft=draft,
        active_ingredients="NONE",
        search_mode="vector",
    )
    final_answer = await run_engineering_delivery_pass(
        query=query,
        context=context,
        answer=final_answer,
        active_ingredients="NONE",
    )
    return coerce_global_search_response(
        final_answer,
        query=query,
        retrieval_diagnostics=retrieval_diagnostics,
    ).model_dump()


async def perform_hybrid_search(
    query: str, active_ingredients: str = "", bypass_critic: bool = False
) -> dict[str, Any]:
    if _prefer_query_first_generation(query):
        engineering_backbone, _delivery_policy = _infer_engineering_backbone(query)
        query_override_block = _query_override_notes_block(query)
        retrieval_diagnostics = build_retrieval_diagnostics(
            0,
            0,
            search_mode="hybrid",
            bridge_strength="weak",
            vector_weight=0.0,
            fts_weight=0.0,
        )
        draft = await get_gemini_response(
            prompt=(
                f"Query: {query}\n\n"
                f"{engineering_backbone}\n\n"
                f"{query_override_block}"
                "This query should be answered query-first, not by stitching weakly related graph communities. "
                "Directly address the user's hardest requirement, cover the full engineering architecture, and do not leave major subsystems implicit.\n\n"
                "CRITICAL: You MUST explicitly list out all hard physical and engineering constraints from the query, and then PROVE that your proposed architecture satisfies every single one of them without any omissions."
            ),
            system_instruction=(
                "You are a systems architect for hard engineering problems. "
                "Draft a decision-oriented response grounded in the explicit query constraints and the provided engineering backbone. "
                "Do not rely on adjacent but off-axis graph analogies. Prefer direct constraint satisfaction, subsystem completeness, and validation targets. "
                "Never drop secondary physical constraints to make the answer shorter."
            ),
            task="global_search",
        )
        if bypass_critic:
            return coerce_global_search_response(
                draft,
                query=query,
                is_draft=True,
                supporting_communities=[],
                supporting_posts=[],
                retrieval_diagnostics=retrieval_diagnostics,
            ).model_dump()
        final_answer = await evaluate_and_refine_answer(
            query=query,
            context=_query_first_critic_context(
                query,
                "Query-first drafting mode: graph context intentionally bypassed to avoid off-axis retrieval contamination.",
            ),
            draft=draft,
            active_ingredients=active_ingredients or draft,
        )
        final_answer = await run_engineering_delivery_pass(
            query=query,
            context=_query_first_critic_context(
                query,
                "Query-first drafting mode: graph context intentionally bypassed to avoid off-axis retrieval contamination.",
            ),
            answer=final_answer,
            active_ingredients=active_ingredients or draft,
        )
        return coerce_global_search_response(
            final_answer,
            query=query,
            supporting_communities=[],
            supporting_posts=[],
            retrieval_diagnostics=retrieval_diagnostics,
        ).model_dump()

    communities = await retrieve_hybrid_communities(query)
    communities_considered = len(communities)
    if not communities:
        return coerce_global_search_response(
            _build_empty_structured_response("No relevant knowledge communities found, even after stepping-stone fallback."),
            query=query,
            retrieval_diagnostics=build_retrieval_diagnostics(
                0,
                0,
                search_mode="hybrid",
                bridge_strength="weak",
                vector_weight=0.7,
                fts_weight=0.3,
            ),
        ).model_dump()

    communities = await prune_relevant_communities(query, communities)
    communities_retained = len(communities)
    engineering_backbone, _delivery_policy = _infer_engineering_backbone(query)

    # L3: Adaptive query-first escalation — check if surviving communities
    #     are actually aligned with the query's hardest constraints.
    use_query_first = False
    if not communities:
        use_query_first = True
    else:
        # Check alignment quality of surviving communities
        alignment = await _assess_retrieval_alignment(query, communities)
        if alignment < _RETRIEVAL_ALIGNMENT_THRESHOLD:
            logger.info(
                "Retrieval alignment %.2f below threshold %.2f — escalating to query-first.",
                alignment,
                _RETRIEVAL_ALIGNMENT_THRESHOLD,
            )
            use_query_first = True

    if use_query_first:
        query_override_block = _query_override_notes_block(query)
        retrieval_diagnostics = build_retrieval_diagnostics(
            communities_considered,
            0,
            search_mode="hybrid",
            bridge_strength="weak",
            vector_weight=0.7,
            fts_weight=0.3,
        )
        draft = await get_gemini_response(
            prompt=(
                f"Query: {query}\n\n"
                f"{engineering_backbone}\n\n"
                f"{query_override_block}"
                "Graph retrieval status: no directly relevant graph communities survived pruning. "
                "Do not force off-axis graph mechanisms into the answer. "
                "Use the query constraints and the engineering backbone to draft a subsystem-level architecture that directly addresses the user's hardest requirement.\n\n"
                "CRITICAL: You MUST explicitly list out all hard physical and engineering constraints from the query, and then PROVE that your proposed architecture satisfies every single one of them without any omissions."
            ),
            system_instruction=(
                "You are a systems architect for hard cross-domain engineering problems. "
                "When graph evidence is off-axis or absent, produce a query-first architecture grounded in the user constraints and established engineering practice. "
                "Favor direct constraint satisfaction, explicit feasibility boundaries, and validation targets over decorative cross-domain enhancements. "
                "Never drop secondary physical constraints to make the answer shorter."
            ),
            task="global_search",
        )
        if bypass_critic:
            return coerce_global_search_response(
                draft,
                query=query,
                is_draft=True,
                supporting_communities=[],
                supporting_posts=[],
                retrieval_diagnostics=retrieval_diagnostics,
            ).model_dump()
        final_answer = await evaluate_and_refine_answer(
            query=query,
            context=_query_first_critic_context(
                query,
                "No directly relevant graph communities survived pruning or alignment was too low.",
            ),
            draft=draft,
            active_ingredients=active_ingredients or draft,
        )
        final_answer = await run_engineering_delivery_pass(
            query=query,
            context=_query_first_critic_context(
                query,
                "No directly relevant graph communities survived pruning or alignment was too low.",
            ),
            answer=final_answer,
            active_ingredients=active_ingredients or draft,
        )
        return coerce_global_search_response(
            final_answer,
            query=query,
            supporting_communities=[],
            supporting_posts=[],
            retrieval_diagnostics=retrieval_diagnostics,
        ).model_dump()

    context = format_community_context(communities, query=query)
    supporting_communities = build_supporting_communities(communities)
    supporting_posts = build_supporting_posts(communities)
    bridge_strength = str(communities[0].get("bridge_strength", "strong"))
    vector_weight = float(communities[0].get("vector_weight", 0.7) or 0.7)
    fts_weight = float(communities[0].get("fts_weight", 0.3) or 0.3)
    retrieval_diagnostics = build_retrieval_diagnostics(
        communities_considered,
        communities_retained,
        search_mode="hybrid",
        bridge_strength=bridge_strength,
        vector_weight=vector_weight,
        fts_weight=fts_weight,
    )
    draft = await get_gemini_response(
        prompt=(
            f"Query: {query}\n\n"
            f"{engineering_backbone}\n\n"
            "Drafting rule: if the problem already has a mature engineering solution family, use that family as the primary recommendation and apply cross-domain mechanisms only to resolve the main bottlenecks.\n\n"
            f"Data Context:\n{context}"
        ),
        system_instruction=(
            "You are a cross-domain engineering analyst. "
            "Draft a decision-oriented response based ONLY on the provided data context. "
            "You must recommend ONE primary solution path, explain why it is the best fit, "
            "and provide a compact engineering blueprint with structure, materials/components, parameter direction, "
            "and manufacturing/integration path. Prefer an established engineering backbone with targeted cross-domain augmentation over a purely novel mechanism replacement when the query describes a mature engineering problem. "
            "Do not produce a mechanism collage or multiple equal candidates."
        ),
        task="global_search",
    )
    if bypass_critic:
        return coerce_global_search_response(
            draft,
            query=query,
            is_draft=True,
            supporting_communities=supporting_communities,
            supporting_posts=supporting_posts,
            retrieval_diagnostics=retrieval_diagnostics,
        ).model_dump()
    final_answer = await evaluate_and_refine_answer(
        query=query,
        context=context,
        draft=draft,
        active_ingredients=active_ingredients or draft,
    )
    final_answer = await run_engineering_delivery_pass(
        query=query,
        context=context,
        answer=final_answer,
        active_ingredients=active_ingredients or draft,
    )
    return coerce_global_search_response(
        final_answer,
        query=query,
        supporting_communities=supporting_communities,
        supporting_posts=supporting_posts,
        retrieval_diagnostics=retrieval_diagnostics,
    ).model_dump()


async def stream_global_search_events(
    query: str, search_mode: str, active_ingredients: str = ""
):
    def emit_progress(message: str) -> str:
        return f"data: {json.dumps({'type': 'progress', 'message': message})}\n\n"

    if search_mode == "vector":
        yield emit_progress("Running pure vector search on raw knowledge nodes...")
        result = await perform_vector_search(query, bypass_critic=False)
        yield f"data: {json.dumps({'type': 'done', **result}, ensure_ascii=False)}\n\n"
        return

    yield emit_progress("Analyzing query intent & generating search vectors...")
    communities = await retrieve_hybrid_communities(query)
    communities_considered = len(communities)
    if not communities:
        result = coerce_global_search_response(
            _build_empty_structured_response("No relevant knowledge communities found, even after Stepping-Stone fallback."),
            query=query,
            retrieval_diagnostics=build_retrieval_diagnostics(
                0, 0, search_mode="hybrid", bridge_strength="weak", vector_weight=0.7, fts_weight=0.3
            ),
        ).model_dump()
        yield f"data: {json.dumps({'type': 'done', **result}, ensure_ascii=False)}\n\n"
        return

    yield emit_progress(
        f"Ranking and pruning {len(communities)} related community nodes..."
    )
    communities = await prune_relevant_communities(query, communities)
    if not communities:
        result = coerce_global_search_response(
            _build_empty_structured_response("No relevant knowledge communities found after relevancy pruning."),
            query=query,
            retrieval_diagnostics=build_retrieval_diagnostics(
                communities_considered, 0, search_mode="hybrid", bridge_strength="weak", vector_weight=0.7, fts_weight=0.3
            ),
        ).model_dump()
        yield f"data: {json.dumps({'type': 'done', **result}, ensure_ascii=False)}\n\n"
        return

    yield emit_progress(f"Synthesizing draft from {len(communities)} filtered nodes...")
    context = format_community_context(communities, query=query)
    draft = await get_gemini_response(
        prompt=f"Query: {query}\n\nData Context:\n{context}",
        system_instruction=(
            "You are a cross-domain engineering analyst. "
            "Draft a decision-oriented response based ONLY on the provided data context. "
            "You must recommend ONE primary solution path, explain why it is the best fit, "
            "and provide a compact engineering blueprint with structure, materials/components, parameter direction, "
            "and manufacturing/integration path. Do not produce a mechanism collage or multiple equal candidates."
        ),
        task="global_search",
    )

    yield emit_progress("Critic evaluating and finalizing actionable summary...")
    final_answer = await evaluate_and_refine_answer(
        query=query,
        context=context,
        draft=draft,
        active_ingredients=active_ingredients or draft,
    )
    final_answer = await run_engineering_delivery_pass(
        query=query,
        context=context,
        answer=final_answer,
        active_ingredients=active_ingredients or draft,
    )
    result = coerce_global_search_response(
        final_answer,
        query=query,
        supporting_communities=build_supporting_communities(communities),
        supporting_posts=build_supporting_posts(communities),
        retrieval_diagnostics=build_retrieval_diagnostics(
            communities_considered,
            len(communities),
            search_mode="hybrid",
            bridge_strength=str(communities[0].get("bridge_strength", "strong")),
            vector_weight=float(communities[0].get("vector_weight", 0.7) or 0.7),
            fts_weight=float(communities[0].get("fts_weight", 0.3) or 0.3),
        ),
    ).model_dump()
    yield f"data: {json.dumps({'type': 'done', **result}, ensure_ascii=False)}\n\n"


async def perform_global_search(
    query: str,
    search_mode: str,
    active_ingredients: str = "",
    bypass_critic: bool = False,
) -> dict[str, Any]:
    if not db_connected():
        return coerce_global_search_response(DB_MISSING_ANSWER).model_dump()
    if search_mode == "vector":
        return await perform_vector_search(query, bypass_critic=bypass_critic)
    return await perform_hybrid_search(
        query, active_ingredients=active_ingredients, bypass_critic=bypass_critic
    )
