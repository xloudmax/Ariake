# Implement Academic Benchmark Improvements

## Objective

Develop rigorous evaluation scripts to address potential academic vulnerabilities (LLM-as-a-judge bias and parametric memory leakage) in the AI service benchmark suite, utilizing Gemini for the blind A/B testing judge.

## Implementation Plan

- [ ] Task 1. Create `prompts/evaluation_blind_ab.md`
  - Rationale: A specialized prompt template for the independent judge (Gemini) in the blind A/B test. It must explicitly instruct the judge to ignore formatting, verbosity, and structural differences, focusing solely on factual correctness, logical coherence, and adherence to provided context.
- [ ] Task 2. Create `scripts/run_blind_ab_testing.py`
  - Rationale: Addresses the "Self-Preference & Verbosity Bias" vulnerability. This script will take existing benchmark results, strip formatting (markdown, bolding, structured sections) to anonymize the source (e.g., Baseline vs. GraphRAG), randomize the presentation order (A/B), and use Gemini as a strict, impartial judge to score strictly on logic and accuracy, outputting Win/Tie/Lose metrics. It will also generate a CSV for optional human evaluation.
- [ ] Task 3. Update `package.json` with the new benchmark command
  - Rationale: Expose the new script via a standard `pnpm run` command for easy execution in the project workflow (e.g., `pnpm run benchmark:blind-test`).

## Verification Criteria

- [Criterion 1: Blind A/B Test Execution] `scripts/run_blind_ab_testing.py` successfully reads a benchmark result JSON, anonymizes outputs, calls the Gemini judge, and produces a summary report (Win/Tie/Lose counts) without errors.
- [Criterion 2: Formatting Neutrality] The anonymization function successfully strips Markdown formatting, XML tags, and structural headers from the answers before evaluation.
- [Criterion 3: Randomization] The script correctly randomizes whether the Baseline or the Proposed System is presented as "Answer A" or "Answer B" to cancel out positional bias.

## Potential Risks and Mitigations

1. **Risk: Gemini Judge still exhibits bias despite anonymization.**
   Mitigation: The script will randomize the presentation order (A/B) to cancel out positional bias. The prompt will explicitly instruct Gemini to penalize verbosity and reward conciseness if both are factually correct.
2. **Risk: The benchmark result format varies, causing parsing errors.**
   Mitigation: The script will robustly handle the expected JSON structure of the benchmark results, extracting the query, context, baseline answer, and proposed system answer.

## Alternative Approaches

1. **Crowdsourced Human Evaluation**: Instead of relying solely on the Gemini judge, the script will generate a formatted CSV file optimized for distribution to human annotators (e.g., domain experts). This provides a gold standard for evaluation.