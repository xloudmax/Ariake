# OpenAlex Mid-Scale Corpus Validation Plan

## Objective

Conduct a controlled, mid-scale expansion of the OpenAlex corpus to validate whether increasing the knowledge graph size resolves the `actionability` deficit in `DRR_Final` compared to `Zero_Shot`. This approach avoids the high costs and noise risks of a massive scale-up while providing enough data to test the "graph size bottleneck" hypothesis. 

## Implementation Plan

- [x] **Task 1. Adjust Query Packs for Mid-Scale Expansion**
  **Rationale**: We need a moderate increase in the candidate pool across all 8 query packs to enrich the graph without overwhelming the extraction pipeline with noise.
  **Action**: Modify `benchmarks/openalex/query_packs.yaml` for all 8 packs with the following mid-scale parameters:
  *   `target_paper_count`: **80**
  *   `seed_count`: **15**
  *   `max_neighbor_count`: **20**

- [x] **Task 2. Execute Discovery and Citation Expansion**
  **Rationale**: Fetch the new candidate pool from the OpenAlex API using the adjusted parameters. We will use a specific version tag (`corpus_v3_scale_mid`) to isolate this experiment.
  **Action**: Run the discovery and expansion scripts sequentially:
  *   `uv run scripts/discover_openalex.py --version corpus_v3_scale_mid`
  *   `uv run scripts/expand_openalex_neighbors.py --version corpus_v3_scale_mid`

- [x] **Task 3. Run Automated Review and Curation**
  **Rationale**: Clean the expanded candidate pool using existing review rules to filter out irrelevant papers before expensive LLM processing.
  **Action**: Execute the review script:
  *   `uv run scripts/review_openalex_corpus.py --version corpus_v3_scale_mid`

- [x] **Task 4. Execute Full-Corpus Materialization (Standard)**
  **Rationale**: Process all curated papers through the LLM extraction pipeline. Crucially, we use `--full-corpus` to bypass testing limits but **do not** use full-text excerpts, keeping the extraction methodology consistent with the baseline.
  **Action**: Execute the materialization script:
  *   `uv run scripts/build_seed_knowledge.py --version corpus_v3_scale_mid --full-corpus`

- [x] **Task 5. Load Knowledge into PostgreSQL and Rebuild Graph**
  **Rationale**: Upsert the extracted entities and relationships into the PostgreSQL/pgvector database, run Leiden clustering, and generate community summaries for the RAG pipeline.
  **Action**: Execute the load script:
  *   `uv run scripts/load_seed_knowledge.py --version corpus_v3_scale_mid`

- [x] **Task 6. Run Benchmarks to Evaluate Actionability**
  **Rationale**: The ultimate test of this expansion is whether it improves `DRR_Final` performance on complex engineering queries.
  **Action**: Run both the core and advanced benchmarks against the new `corpus_v3_scale_mid` graph:
  *   `uv run scripts/run_benchmark.py` (ensure it points to the new graph)
  *   `uv run scripts/run_advanced_ablation.py`

## Verification Criteria

- [x] The `post_build_health_corpus_v3_scale_mid.json` report shows a moderate increase in graph size (e.g., nodes > 1500, compared to the cold-start 780).
- [x] Benchmark results (`advanced_ablation_v2_results_*.csv`) are generated and ready for comparison.
- [x] **Decision Gate**: Compare the new `DRR_Final` actionability score against the cold-start baseline. If the score improves significantly, graph size was the primary bottleneck. If it remains stagnant or drops, the bottleneck is confirmed to be in the generation/critic prompt layer.

## Potential Risks and Mitigations

1. **Increased Noise Diluting Quality**
   *Risk*: Even at a mid-scale, the LLM might extract irrelevant entities that degrade community coherence.
   *Mitigation*: If the benchmark scores drop, we immediately halt further scaling and pivot to refining the extraction prompts and output generation constraints.
2. **PostgreSQL Connection Limits**
   *Risk*: High concurrency during the load phase might strain the database pool.
   *Mitigation*: The `db.py` connection pool handles standard loads well, but monitor for any `TooManyConnections` errors during Task 5.

## Alternative Approaches

1. **Direct Prompt Optimization**: If this mid-scale test proves that graph size does not fix the actionability issue, the immediate next step will be to rewrite the `DRR_Final` output generation and critic prompts to strictly enforce an "engineering specification" format rather than a "mechanism synthesis" format.