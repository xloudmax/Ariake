# OpenAlex Corpus Expansion Plan (Standard Pipeline)

## Objective

Expand the size of the knowledge graph to a scale capable of supporting the paper's claims, without altering the underlying extraction model or introducing new data-fetching mechanisms like full-text excerpts. The goal is to simply scale up the existing, proven OpenAlex discovery and materialization pipeline to capture a much larger volume of papers (target: 1000+ works) and generate a correspondingly massive graph.

## Implementation Plan

- [ ] **Task 1. Scale Up Query Pack Thresholds**
  **Rationale**: The current `benchmarks/openalex/query_packs.yaml` restricts the initial discovery pool to a small number of papers per domain (e.g., `target_paper_count: 30`). To build a paper-scale corpus, these thresholds must be significantly increased.
  **Action**: Modify `benchmarks/openalex/query_packs.yaml` for all 7 query packs:
  - Increase `target_paper_count` to **150** (expands the primary discovery pool).
  - Increase `seed_count` to **25** (broadens the starting points for citation network expansion).
  - Increase `max_neighbor_count` to **40** (deepens the citation network crawl).

- [ ] **Task 2. Execute Large-Scale Discovery and Expansion**
  **Rationale**: With the increased thresholds, the system must query the OpenAlex API to build the new, massive candidate pool. A new version identifier (`corpus_v3_scale`) is used to prevent overwriting existing test data.
  **Action**: Run the discovery and neighbor expansion scripts sequentially.
  - `uv run scripts/discover_openalex.py --version corpus_v3_scale`
  - `uv run scripts/expand_openalex_neighbors.py --version corpus_v3_scale`

- [ ] **Task 3. Run Automated Review and Curation**
  **Rationale**: A larger candidate pool inevitably includes more noise. The automated review process must filter out irrelevant papers based on the rules defined in `reviews/default.yaml`.
  **Action**: Run the review script on the newly expanded corpus.
  - `uv run scripts/review_openalex_corpus.py --version corpus_v3_scale`

- [ ] **Task 4. Execute Uncapped Materialization (Standard Extraction)**
  **Rationale**: The core issue in the cold-start test was the artificial truncation (`per_pack_limit=8`) during the LLM extraction phase. By using `--full-corpus`, the system will process every paper that passed the review stage. Crucially, we **will not** use `--include-fulltext-excerpt`, maintaining the exact same extraction methodology (title + abstract + concepts) used previously, just at a massive scale.
  **Action**: Run the seed knowledge build script to extract entities and relationships from the entire curated corpus.
  - `uv run scripts/build_seed_knowledge.py --version corpus_v3_scale --full-corpus`

- [ ] **Task 5. Load Seed Knowledge and Rebuild Graph**
  **Rationale**: The massive JSON output from the materialization phase must be upserted into the Neo4j database, followed by Leiden clustering and community summary generation to prepare the graph for RAG operations.
  **Action**: Run the load script to populate the database and generate the post-build health report.
  - `uv run scripts/load_seed_knowledge.py --version corpus_v3_scale`

## Verification Criteria

- [ ] `post_build_health_corpus_v3_scale.json` shows a total `nodes.count` exceeding 2500.
- [ ] The `materialized_work_count` in the provenance file reflects the processing of hundreds of papers, not just 128.
- [ ] The extraction process completes successfully without attempting to fetch external HTML landing pages.

## Potential Risks and Mitigations

1. **LLM API Rate Limits (429 Errors)**
   *Risk*: Processing 1000+ abstracts in a single run will generate significant concurrent load on the Gemini API.
   *Mitigation*: The `asyncio.Semaphore(3)` in `openalex_corpus.py` will regulate concurrency. Failed extractions will be logged in the provenance file and will not crash the entire batch.

2. **Graph Database Memory Limits (OOM)**
   *Risk*: Upserting thousands of nodes and running Leiden clustering on a massive graph may exhaust the memory of the Neo4j instance or the Python process.
   *Mitigation*: Ensure the database environment has sufficient RAM allocated before executing Task 5.

## Alternative Approaches

1. **Phased Threshold Increases**: Instead of jumping directly to 150 papers per pack, we could scale up incrementally (e.g., 80 papers) to monitor graph density and LLM performance. However, to definitively address the "anemic graph" issue and match the scale of a full paper, the aggressive scale-up is recommended.