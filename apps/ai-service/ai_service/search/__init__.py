"""search package — public API re-exports for backward compatibility.

All consumers that previously did ``from ai_service.search import ...`` or
``from ai_service import search`` continue to work without changes.
"""

# --- response layer ---
from .response import (  # noqa: F401
    DB_MISSING_ANSWER,
    build_retrieval_diagnostics,
    build_supporting_communities,
    build_supporting_posts,
    coerce_global_search_response,
)

# --- parsing layer ---
from .parsing import (  # noqa: F401
    _coerce_sections_from_json,
    _coerce_sections_from_text,
    _normalize_sections,
    _render_legacy_answer_from_sections,
)

# --- rules layer ---
from .rules import (  # noqa: F401
    ENGINEERING_BACKBONE_HINTS,
    _community_matches_query_focus,
    _infer_engineering_backbone,
    _prefer_query_first_generation,
    _should_use_query_first_fallback,
)

# --- intent layer ---
from .intent import (  # noqa: F401
    check_community_relevance,
    get_intent_weights,
)

# --- retrieval layer ---
from .retrieval import (  # noqa: F401
    build_hybrid_search_sql,
    extract_query_constraints,
    fetch_hybrid_communities,
    fetch_vector_nodes,
    format_community_context,
    format_vector_context,
    prune_relevant_communities,
    retrieve_hybrid_communities,
)

# --- critic layer ---
from .critic import (  # noqa: F401
    evaluate_and_refine_answer,
)

# --- engineering delivery layer ---
from .delivery import (  # noqa: F401
    compress_delivery_answer,
    engineering_densify_answer,
    run_engineering_delivery_pass,
)

# --- pipeline layer (top-level orchestration) ---
from .pipeline import (  # noqa: F401
    perform_global_search,
    perform_hybrid_search,
    perform_vector_search,
    stream_global_search_events,
)
