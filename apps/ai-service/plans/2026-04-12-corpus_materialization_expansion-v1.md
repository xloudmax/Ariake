# OpenAlex Corpus Materialization Expansion Plan

## Objective

Remove testing limitations on the knowledge extraction pipeline to fully materialize the existing OpenAlex corpus. By enabling full-corpus extraction and incorporating full-text excerpts from Open Access landing pages, the system will capture the necessary micro-engineering parameters, material formulations, and control laws required to improve the Actionability score of the DRR_Final pipeline.

## Implementation Plan

- [ ] **Task 1. Execute Full-Corpus Materialization with Excerpts**
  **Rationale**: The previous cold-start test artificially limited the number of papers processed per query pack (e.g., `per_pack_limit=8`), resulting in an anemic graph. By using the `--full-corpus` flag, we bypass these limits. Adding `--include-fulltext-excerpt` forces the system to fetch up to 2200 characters from the OA landing page, providing the LLM with the concrete engineering details (parameters, materials, formulas) that are often missing from abstracts alone.
  **Action**: Run the seed knowledge build script with the appropriate flags to process the entire reviewed corpus.
  *Command*: `uv run scripts/build_seed_knowledge.py --version corpus_paper_scale --full-corpus --include-fulltext-excerpt`

- [ ] **Task 2. Load Seed Knowledge and Rebuild Graph**
  **Rationale**: Once the massive extraction process completes, the resulting entities and relationships must be upserted into the graph database. This step also triggers the Leiden clustering algorithm and generates the crucial community summaries used by the RAG pipeline.
  **Action**: Run the load script to populate the database and generate the post-build health report.
  *Command*: `uv run scripts/load_seed_knowledge.py --version corpus_paper_scale`

## Verification Criteria

- [ ] The `seed_knowledge_corpus_paper_scale.json` file is successfully generated and significantly larger than the previous cold-start version (128 works).
- [ ] The `post_build_health_corpus_paper_scale.json` report shows a substantial increase in `nodes.count` (target: >2000) and `communities.count`.
- [ ] The `percent_with_summaries` metric in the health report is 100%.
- [ ] A manual review of the extracted entities confirms the presence of specific engineering parameters and material details, not just high-level mechanisms.

## Potential Risks and Mitigations

1. **LLM API Rate Limits and Timeouts**
   *Risk*: Processing the full corpus with excerpts will generate hundreds or thousands of concurrent requests to the Gemini API, potentially triggering 429 (Rate Limit) errors or long-tail timeouts.
   *Mitigation*: The `openalex_corpus.py` script already utilizes an `asyncio.Semaphore` to throttle concurrency and includes timeout handling. Failed extractions will be gracefully recorded in the provenance file without crashing the entire job.

2. **Landing Page Fetching Failures**
   *Risk*: Attempting to fetch HTML excerpts from various publisher websites may result in timeouts, 403 Forbidden errors, or parsing issues (e.g., encountering PDFs instead of HTML).
   *Mitigation*: The `fetch_open_access_excerpt` function includes a strict 30-second timeout and basic content-type checking. If a fetch fails, the system will automatically fall back to using only the title and abstract for extraction.

## Alternative Approaches

1. **Incremental Limit Increases**: Instead of jumping directly to `--full-corpus`, we could gradually increase `--per-pack-limit` (e.g., to 50, then 100) to monitor API stability and graph quality before committing to a full run. However, given the authorization to proceed without API cost concerns, the full-corpus approach is the most direct path to resolving the Actionability deficit.