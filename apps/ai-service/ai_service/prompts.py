from __future__ import annotations

from .config import PROMPTS_DIR, logger


def load_prompt_template(filename: str) -> str:
    try:
        path = PROMPTS_DIR / filename
        if path.exists():
            return path.read_text(encoding="utf-8")
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to load prompt template %s: %s", filename, exc)
    return ""


MECHANISM_TREE_PROMPT = load_prompt_template("mechanism_tree.md")
KNOWLEDGE_EXTRACTION_PROMPT = load_prompt_template("knowledge_extraction.md")
COMMUNITY_SUMMARY_PROMPT = load_prompt_template("community_summary.md")

# Evaluation / Benchmark Prompts
EVAL_STANDARD_PROMPT = load_prompt_template("evaluation_standard.md")
EVAL_PAPER_CORE_V2_PROMPT = load_prompt_template("evaluation_paper_core_v2.md")
EVAL_PROMPT = load_prompt_template("evaluation_ablation.md")
OPENALEX_EXTRACTION_PROMPT = load_prompt_template("openalex_extraction.md")
OPENALEX_JSON_REPAIR_PROMPT = load_prompt_template("openalex_repair.md")
EXPERT_ASSESSOR_PROMPT = load_prompt_template("evaluation_researcherbench.md")
EXPERT_BASELINE_PROMPT = load_prompt_template("expert_baseline.md")
