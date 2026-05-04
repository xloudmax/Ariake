# Implement Academic Benchmark Improvements

## Objective

Develop rigorous evaluation scripts to address potential academic vulnerabilities (LLM-as-a-judge bias and parametric memory leakage) in the AI service benchmark suite.

## Implementation Plan

- [ ] Task 1. Create `scripts/run_blind_ab_testing.py`
  - Rationale: Addresses the "Self-Preference & Verbosity Bias" vulnerability. This script will take existing benchmark results, strip formatting (markdown, bolding, structured sections) to anonymize the source (e.g., Baseline vs. GraphRAG), randomize the presentation order (A/B), and use a strong independent LLM (like Claude 3.5 Sonnet or o1) or prepare a CSV for human evaluation to score strictly on logic and accuracy, outputting Win/Tie/Lose metrics.
- [ ] Task 2. Create `prompts/evaluation_blind_ab.md`
  - Rationale: A specialized prompt template for the independent judge in the blind A/B test. It must explicitly instruct the judge to ignore formatting, verbosity, and structural differences, focusing solely on factual correctness, logical coherence, and adherence to provided context.
- [ ] Task 3. Create `scripts/generate_counterfactual_dataset.py`
  - Rationale: Addresses the "Parametric Memory Leak" vulnerability. This script will take a subset of factual queries and context documents, and systematically alter key facts (e.g., invert a physical relationship, change an author, alter a critical parameter). It will then evaluate if the system answers based on the *retrieved counterfactual evidence* (proving the RAG mechanism works) or its *pre-trained parametric memory* (proving a hallucination/memorization flaw).
- [ ] Task 4. Update `package.json` with new benchmark commands
  - Rationale: Expose the new scripts via standard `pnpm run` commands for easy execution in the project workflow (e.g., `pnpm run benchmark:blind-test`, `pnpm run benchmark:counterfactual`).

## Verification Criteria

- [Criterion 1: Blind A/B Test Execution] `scripts/run_blind_ab_testing.py` successfully reads a benchmark result JSON, anonymizes outputs, calls the LLM judge, and produces a summary report (Win/Tie/Lose counts) without errors.
- [Criterion 2: Formatting Neutrality] The anonymization function successfully strips Markdown formatting, XML tags, and structural headers from the answers before evaluation.
- [Criterion 3: Counterfactual Generation] `scripts/generate_counterfactual_dataset.py` successfully generates a modified context where at least one key fact is inverted or altered.

## Potential Risks and Mitigations

1. **Risk: LLM Judge still exhibits bias despite anonymization.**
   Mitigation: The script will randomize whether the Baseline or the Proposed System is presented as "Answer A" or "Answer B" to cancel out positional bias.
2. **Risk: Counterfactual generation creates nonsensical contexts.**
   Mitigation: Start with a highly constrained subset of deterministic facts (e.g., simple physical properties or specific numeric parameters) rather than complex abstract concepts for the initial counterfactual dataset.

## Alternative Approaches

1. **Crowdsourced Human Evaluation**: Instead of using an LLM judge for the blind A/B test, the script could purely generate a formatted CSV/Excel file optimized for distribution to human annotators (e.g., via Amazon Mechanical Turk or domain experts). The script will include an option to output this CSV format.