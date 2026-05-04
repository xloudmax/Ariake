# AI Service - Agent Instructions

## Scope & Routing
These instructions apply only to the `apps/ai-service` Python module. For frontend or general project rules, see the root repository instructions.

## Non-discoverable Tooling & Commands
- **NPM Scripts for Python**: The service uses `package.json` as a task runner for Python scripts. Run tasks via `pnpm run <script>` (e.g., `pnpm run dev`, `pnpm test`, `pnpm run benchmark`), which will safely wrap `uv run`.
- **Package Manager**: Use `uv` for managing dependencies (`uv add <pkg>`), not `pip`.
- **Environment Context**: If running python scripts directly, always prefix with `uv run` to ensure the correct virtual environment context.

## Architectural Constraints & Landmines
- **No Hardcoded AI Models**: NEVER hardcode model IDs (e.g., `gemini-3.1-flash`), temperatures, or token limits in `.py` files. All AI configurations MUST be read from `model_config.yaml`.
- **Externalized Prompts**: Complex prompts must not be inlined as string literals. Store them as XML or Markdown files inside the `prompts/` directory.
- **Knowledge Upserts**: Always use the provided `upsert_knowledge` function/repository pattern for database writes to guarantee deduplication and proper vector generation. Do not bypass this with direct SQL inserts.
- **AI Call Caching**: Use the centralized wrappers (e.g., `get_gemini_response`, `get_embedding`) for any LLM calls to leverage built-in semantic caching. Do not make raw client calls unless strictly necessary for a new feature.
