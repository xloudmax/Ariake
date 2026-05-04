# Paper-Core DRR Optimization Plan

> For Hermes: use systematic-debugging + test-driven-development. Prioritize retrieval correctness before stylistic prompt tuning.

Goal: lift DRR_Final on paper-core v2 toward or beyond Zero_Shot by removing retrieval pollution on system-architecture queries and reducing prompt/critic over-compression.

Architecture:
- Stage 1 fixes incorrect context selection for life-support / resource-loop queries.
- Stage 2 adds query-first fallback when the graph is off-axis instead of forcing bad communities into the answer.
- Stage 3 reruns smoke benchmarks and compares DRR against Zero_Shot before broader changes.

Tech stack: Python 3.12, FastAPI, asyncpg, Gemini via `uv`, pytest.

---

## Task 1: Add query-type handling for closed-loop life-support queries
Files:
- Modify: `apps/ai-service/ai_service/search.py`
- Test: `apps/ai-service/tests/test_services.py`

Steps:
1. Add a query detector for closed-loop life-support / ECLSS-style prompts.
2. Add a specific engineering backbone hint for that query family.
3. Keep policy balanced rather than strict one-enhancement mode.
4. Verify with targeted tests.

## Task 2: Prune off-axis thermal/reliability communities for life-support queries
Files:
- Modify: `apps/ai-service/ai_service/search.py`
- Test: `apps/ai-service/tests/test_services.py`

Steps:
1. Add query-focus matching heuristic for resource-loop queries.
2. Retain communities only when they mention relevant closure/resource terms.
3. Verify thermal-only communities are dropped while carbon/water/ISRU communities remain.

## Task 3: Add query-first fallback when relevant graph communities vanish
Files:
- Modify: `apps/ai-service/ai_service/search.py`
- Test: `apps/ai-service/tests/test_services.py`

Steps:
1. When life-support queries lose all communities after pruning, do not return empty response.
2. Draft from query constraints + engineering backbone, explicitly warning that graph context was pruned.
3. Continue through critic/refine chain.
4. Verify via unit test.

## Task 4: Rerun Q28 and smoke benchmark
Files:
- Outputs under `apps/ai-service/benchmarks/results/`

Steps:
1. Re-run targeted Q28 with `bypass_critic=true/false`.
2. Re-run 6-query smoke DRR benchmark.
3. Compare against existing Zero_Shot smoke results.
4. Decide whether next change should target critic leakage, retrieval weighting, or corpus expansion.

## Task 5: If still below target, continue with second-wave optimizations
Candidate follow-ups:
- tighten relevance model beyond lenient YES/NO overlap
- add system-architecture prompt for ECLSS / multi-loop closure problems
- revise critic to strip internal self-editing traces
- add corpus support for life-support / ISRU communities if DB remains sparse
