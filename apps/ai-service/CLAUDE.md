# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **`apps/ai-service`** module — a FastAPI sidecar that implements mechanism-tree generation (DRR), knowledge-graph extraction/ingestion, and GraphRAG global search for the C404 project. The root monorepo's `CLAUDE.md` covers the Go backend and React frontend; this file covers the Python service only.

## Toolchain Conventions (non-discoverable)

- **`package.json` is a task runner for Python.** Prefer `pnpm run <script>` over invoking `uv`/`pytest` directly — the scripts set the env vars the runtime expects (`BENCHMARK_*`, `ADVANCED_ABLATION_QUERY_SET`, `PAPER_CORE_ZERO_SHOT_*`, etc.). See `package.json` for the full catalog.
- **Dependencies: `uv add <pkg>`, never `pip install`.** `uv.lock` is authoritative; Docker builds use `uv sync --frozen --no-dev`.
- **Running Python directly requires `uv run`** so the project venv (`.venv/`) is used. Tests, scripts, and the server are all launched this way.
- **Python 3.12+** is required (`requires-python = ">=3.12"`, enforced by `.python-version`).

## Development Commands

```bash
pnpm dev                    # uvicorn main:app --reload on :8000 (main.py just imports ai_service.app)
pnpm test                   # pytest with coverage (configured in pyproject.toml)
pnpm test:cov               # pytest + HTML coverage → htmlcov/index.html
uv run pytest tests/test_app.py::test_health_check   # single test
uv run pytest -k "test_extract"                      # pattern match
uv run ruff format .        # format
uv run ruff check .         # lint
```

Tests auto-enable coverage via `addopts` in `pyproject.toml` (no need to pass `--cov` explicitly). `pytest-asyncio` is installed for `@pytest.mark.asyncio` tests. `tests/` mocks the Gemini client — no real LLM calls in the suite.

## Benchmark & Corpus Workflow

This service is benchmark-heavy. The research workflow revolves around two artifact types:

**Corpus builds** (`benchmarks/openalex/artifacts/versions/<corpus_version>/`). Seven-step pipeline per version:
```bash
pnpm corpus-v3:discover → expand → review → preview → build → load → analyze
```
`discover` pulls from OpenAlex, `review` applies manual curation from `benchmarks/openalex/reviews/<version>.yaml`, `build` extracts entities via LLM, `load` writes to PostgreSQL with pgvector embeddings, `analyze` produces the readiness report. Treat a corpus as benchmark-ready only when extraction failure <20%, community summary+embedding coverage >95%, and every query pack has ≥1 community match.

**Benchmark runs** (`benchmarks/runs/...`). Current entry points:
```bash
pnpm benchmark:paper-core:v2:drr        # DRR_Final pipeline, 6 paper-core queries
pnpm benchmark:paper-core:v2:zero-shot  # Zero_Shot baseline
pnpm benchmark:advanced                  # v2 ablation set (12 queries, higher difficulty)
pnpm benchmark:advanced:legacy           # legacy 3-query probe
pnpm benchmark:blind-test:generate / :eval
```
`pnpm benchmark` (bare) is intentionally `SystemExit` — always pick a specific variant.

Scripts in `scripts/` are invoked as modules (`uv run python -m scripts.<name>`) so they share the `ai_service.config.ROOT_DIR` resolution. `ai_service/script_support.py` provides the `ExperimentIdentity` + `ExperimentPaths` helpers that every runner uses for deterministic run-directory naming.

## Architecture

### Request lifecycle (FastAPI)

`main.py` is a 7-line shim that re-exports `ai_service.app.app`. The real wiring is in `ai_service/app.py::create_app()`:

1. **`lifespan` context** (`api.py`) runs on startup/shutdown:
   - loads on-disk caches (`.embedding_cache.json`, `.gemini_cache.json`) into LRU dicts,
   - initializes the asyncpg pool (creates pgvector HNSW + FTS indexes if missing),
   - starts a `periodic_cache_sync` task that flushes caches every 5 min,
   - on shutdown: cancels sync, closes pool, writes caches back to disk.
2. **Middleware chain** (outermost first): `logging_middleware` → `error_middleware` → `api_key_middleware`. The API-key middleware only enforces `X-API-Key` when `AI_SERVICE_API_KEY` is set; paths `/health`, `/db-health`, `/docs`, `/redoc`, `/openapi.json` are always public.
3. **Exception handler** maps `AIServiceError` subclasses (`GraphNotReadyError`, `DatabaseError`, `ExtractionError`, `SearchError`, `ModelUnavailableError`) to `{"error", "type"}` JSON with their `status_code`. Don't raise plain `HTTPException` for these — keep the typed hierarchy.

### Asymmetric compute routing

All LLM work goes through `ai_service.llm`:
- **`get_gemini_response(prompt, task=...)`** reads model id + temperature + max_tokens from `model_config.yaml` keyed by `task`. Do **not** hardcode model names in `.py` files — add a new entry to `model_config.yaml` instead. `task="knowledge_extraction"` uses flash; `task="critic_agent"` uses pro.
- **`get_embedding(text)`** uses `task=embeddings`. Dim auto-detected from model id (768 for `text-embedding-004`, 1536/3072 for OpenAI variants).
- Both wrap responses with SHA-256 cache keys against `gemini_cache` / `embedding_cache` (LRU, 5k/10k entries). **Always go through these wrappers** — raw `client.aio.models.generate_content` calls skip the cache and the tenacity retry policy.
- `_build_client()` uses **Vertex AI Express Mode** via `GOOGLE_CLOUD_API_KEY` (or falls back to `PROJECT_ID`+`LOCATION`). `LLM_API_KEY` is an alias that also populates `GOOGLE_CLOUD_API_KEY`.

### Knowledge graph writes

`knowledge_graph.upsert_knowledge(extraction, source_metadata)` is the **only** supported ingestion path. It:
- normalizes entity names (`NODE_TYPE_ALIASES`) and relation types (`RELATION_TYPE_ALIASES`),
- canonicalizes duplicates by `casefold`ed name,
- generates embeddings and writes via asyncpg into `knowledge_nodes`/`knowledge_edges`/`communities` (pgvector).

Never bypass this with raw SQL inserts — you'll break dedup, embeddings, and downstream community detection. Community building is a separate background step (`POST /graph/build-communities` → `run_leiden_clustering` + `generate_all_community_summaries`).

### Search pipeline (`ai_service/search/`)

Split into layers deliberately; each module has one job. `search/__init__.py` re-exports for backward compatibility, so imports like `from ai_service.search import perform_global_search` keep working:

| Layer | File | Responsibility |
|---|---|---|
| orchestration | `pipeline.py` | `perform_global_search`, `perform_vector_search`, `stream_global_search_events` — the top-level entry points |
| intent | `intent.py` | classify query → vector/fts weights via `intent_router` task |
| retrieval | `retrieval.py` | `retrieve_hybrid_communities`, `fetch_vector_nodes`, SQL builders |
| rules | `rules.py` + `rules.yaml` | query-first fallback heuristics, engineering-backbone hints, bio-term blacklist |
| critic | `critic.py` | G-Eval style refinement using `critic_agent` task |
| delivery | `delivery.py` | `run_engineering_delivery_pass` — densifies answers with engineering detail |
| parsing | `parsing.py` | normalize sections from JSON/text/legacy |
| response | `response.py` | `coerce_global_search_response`, `DB_MISSING_ANSWER` sentinel |

The pipeline escalates to query-first generation when retrieval alignment <0.5 (`_RETRIEVAL_ALIGNMENT_THRESHOLD` in `pipeline.py`).

### Mechanism Tree (DRR)

`ai_service/mechanism_tree.py` decomposes a query into a tree of `MechanismNode`s with `active_ingredient` (≤15 words) and cross-domain `applications` (Close/Somewhat Far/Distant). `get_fallback_mock_data` is the degraded-mode response when the LLM client isn't configured — preserve this behavior so the endpoint still returns a valid shape for frontend smoke tests.

### Prompts are files, not strings

Everything loaded by `ai_service/prompts.py` lives in `prompts/` as Markdown or XML (e.g. `graph_rag_global_search_balanced.xml`, `evaluation_paper_core_v2.md`). When adding a new prompt, add a file and a `load_prompt_template(...)` line — don't inline multi-paragraph prompts in `.py`.

### Legacy field compatibility

Older community summaries may store `sparks`. New writes use `transfer_insights`. Read paths should accept either; write paths should only emit `transfer_insights`.

## Environment

Loaded via `python-dotenv` from `.env` at the service root (`apps/ai-service/.env`):

| Var | Purpose |
|---|---|
| `LLM_API_KEY` / `GOOGLE_CLOUD_API_KEY` | Vertex AI Express Mode key (primary auth path) |
| `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_REGION` | Fallback when no API key (uses ADC) |
| `GRAPH_DATABASE_URL` | PostgreSQL DSN with pgvector. If unset, knowledge/search endpoints degrade gracefully |
| `AI_SERVICE_API_KEY` | Optional. If set, required as `X-API-Key` on non-public routes |
| `LOG_LEVEL` | Default `INFO`. Logs go to stderr and `logs/ai_service.log` |

## Docker

Multi-stage build (`Dockerfile`). Builder runs `uv sync --frozen --no-dev`; production image is `python:3.12-slim` + venv + `ai_service/` + `main.py` + `model_config.yaml`, runs as uid 1000. `Dockerfile.dev` mounts the source for hot reload. Use `pnpm docker:build` / `pnpm docker:run` — they pass `--env-file .env` correctly.
