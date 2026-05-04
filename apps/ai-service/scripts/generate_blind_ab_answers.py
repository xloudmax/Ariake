import argparse
import asyncio
import json
import time
import os
import sys
import random
import re
import requests
from pathlib import Path
from ai_service.config import get_model_setting
from ai_service.llm import get_gemini_response
from ai_service.script_support import (
    default_service_url,
    load_service_env,
    service_request_headers,
    resolve_experiment_identity,
    resolve_experiment_paths,
    resolve_from_service,
    build_run_manifest,
)

load_service_env()
SEARCH_URL = f"{default_service_url()}/graph/global-search"
SERVICE_HEADERS = service_request_headers()
ZERO_SHOT_MODEL = os.getenv(
    "ADVANCED_ABLATION_ZERO_SHOT_MODEL",
    get_model_setting("blind_ab_generation", "model_id"),
)
HTTP = requests.Session()
HTTP.trust_env = False

TARGET_PROFILES = {
    "legacy_stress_7": [
        "Q13-Level2",
        "Q21-Level2",
        "Q41-Level2",
        "Q31-Level2",
        "Q38-Level2",
        "Q42-Level2",
        "Q10-Level2",
    ],
    "transfer_core_7": [
        "Q7-Level2",
        "Q9-Level2",
        "Q14-Level2",
        "Q18-Level2",
        "Q23-Level2",
        "Q25-Level2",
        "Q10-Level2",
    ],
}


def resolve_target_ids(target_profile: str, target_ids: str | None) -> list[str]:
    if target_ids:
        return [qid.strip() for qid in target_ids.split(",") if qid.strip()]
    if target_profile not in TARGET_PROFILES:
        raise ValueError(
            f"Unsupported target profile: {target_profile}. "
            f"Supported profiles: {', '.join(sorted(TARGET_PROFILES))}"
        )
    return list(TARGET_PROFILES[target_profile])


def load_reused_zero_shot_answers(path: str, target_ids: list[str]) -> dict[str, str]:
    if not path:
        return {}
    answers_path = Path(path)
    if not answers_path.exists():
        raise FileNotFoundError(f"Reuse Zero_Shot file not found: {answers_path}")
    with answers_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Reuse Zero_Shot file must be an answers JSON object: {answers_path}")

    reused: dict[str, str] = {}
    missing: list[str] = []
    for qid in target_ids:
        row = data.get(qid)
        zero_shot = row.get("Zero_Shot", "") if isinstance(row, dict) else ""
        if not isinstance(zero_shot, str) or not zero_shot.strip():
            missing.append(qid)
            continue
        reused[qid] = zero_shot
    if missing:
        raise ValueError(
            "Reuse Zero_Shot file is missing non-empty Zero_Shot answers for: "
            + ", ".join(missing)
        )
    return reused


def clean_drr_output(text: str) -> str:
    if not isinstance(text, str):
        return ""

    def canonical_clause(value: str) -> str:
        return re.sub(r"\s+", " ", value or "").strip(" ;,").rstrip(".").lower()

    def dedupe_semicolon_line(value: str, *, sentence_mode: bool = False) -> str:
        parts = [part.strip(" ;,") for part in re.split(r"\s*;\s*", value or "") if part.strip(" ;,")]
        kept = []
        for part in parts:
            candidate = canonical_clause(part)
            if not candidate:
                continue
            if any(
                candidate == existing
                or candidate in existing
                or existing in candidate
                for existing in [canonical_clause(item) for item in kept]
            ):
                continue
            kept.append(part.rstrip(".") if sentence_mode else part)
        joined = (". " if sentence_mode else "; ").join(kept) if kept else re.sub(r"\s+", " ", value or "").strip()
        joined = re.sub(r"\.\s*\.", ".", joined)
        joined = joined.replace(".;", ".").replace(";.", ".")
        joined = joined.strip(" ;,")
        if sentence_mode and joined and joined[-1] not in ".!?":
            joined += "."
        return joined
    
    parts = re.split(r'(?m)^## ', text)
    if len(parts) == 1:
        text = re.sub(
            r"(?im)^\s*(Primary Recommendation|Why This Path|Engineering Blueprint|Action Summary|"
            r"Parameter direction|Manufacturing/integration path)\s*:?\s*$",
            "",
            text,
        )
        lines = []
        seen = set()
        for raw_line in text.splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if not line:
                if lines and lines[-1] != "":
                    lines.append("")
                continue
            key = canonical_clause(line)
            if key in seen:
                continue
            seen.add(key)
            lines.append(line)
        return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    keep_headers = [
        '主推荐方案',
        '为什么选择这一路径',
        '工程实施蓝图',
        '备选方案',
        '风险与约束',
        '行动摘要',
        'Primary Recommendation',
        'Why This Path',
        'Engineering Blueprint',
        'Alternative',
        'Risks and Boundaries',
        'Action Summary',
    ]
    
    cleaned_parts = []

    for part in parts[1:]:
        header = part.split('\n')[0].strip()
        if any(header.startswith(h) for h in keep_headers):
            lines = part.split('\n')
            new_lines = []
            for line in lines:
                stripped = line.strip()
                lower_line = stripped.lower()
                if any(x in lower_line for x in [
                    'draft',
                    'biological analogies',
                    'avoids biological metaphors',
                    'rule',
                    'pruned',
                    'translated into pure',
                    'parameterization',
                    'biological terms',
                    'hard parameters',
                    'extracted',
                    'directive',
                    'schema',
                    'mechanism fluff',
                    'internal reviewer summary',
                    'critic feedback',
                    'identified and corrected',
                    'validated the',
                    'no external cross-domain communities retrieved',
                    'translated biological concepts',
                    'retained critical thermodynamic parameters',
                ]):
                    continue
                if stripped.startswith('- ') and 'must ' in lower_line and 'you' in lower_line:
                    continue
                numbered = re.match(r"^(\d+)\.\s+([^:]+:\s*)(.*)$", stripped)
                if numbered:
                    prefix = numbered.group(2)
                    body = dedupe_semicolon_line(
                        numbered.group(3),
                        sentence_mode=header.startswith('Engineering Blueprint'),
                    )
                    line = f"{numbered.group(1)}. {prefix}{body}"
                new_lines.append(line)
            part = '\n'.join(new_lines).strip()
            body_lines = part.split('\n')[1:] if '\n' in part else []
            if (header.startswith('风险与约束') or header.startswith('Risks and Boundaries')) and body_lines:
                filtered_body = [line for line in body_lines if line.strip().startswith('- ')]
                part = '\n'.join([header] + filtered_body[:3]).strip()
            elif (header.startswith('备选方案') or header.startswith('Alternative')) and body_lines:
                filtered_body = [line for line in body_lines if line.strip().startswith('- ')]
                part = '\n'.join([header] + filtered_body[:1]).strip()
            elif (header.startswith('行动摘要') or header.startswith('Action Summary')) and body_lines:
                filtered_body = [
                    line for line in body_lines
                    if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('- '))
                ]
                renumbered = []
                for idx, line in enumerate(filtered_body[:3], start=1):
                    stripped = line.strip()
                    if re.match(r"^\d+\.\s+", stripped):
                        stripped = re.sub(r"^\d+\.\s+", f"{idx}. ", stripped)
                    renumbered.append(stripped)
                part = '\n'.join([header] + renumbered).strip()
            elif (header.startswith('工程实施蓝图') or header.startswith('Engineering Blueprint')) and body_lines:
                numbered_lines = [line.strip() for line in body_lines if re.match(r"^\d+\.\s+", line.strip())]
                renumbered = []
                for idx, line in enumerate(numbered_lines, start=1):
                    normalized = re.sub(r"^\d+\.\s+", f"{idx}. ", line)
                    renumbered.append(normalized)
                part = '\n'.join([header] + renumbered).strip()
            if not part:
                continue
            cleaned_parts.append('## ' + part)
            
    return "\n\n".join(cleaned_parts).strip()

async def get_zero_shot(query: str) -> str:
    prompt = f"As a senior engineering expert, answer the following design problem directly. Provide a clear, actionable engineering solution.\n\nProblem: {query}"
    for attempt in range(3):
        try:
            return await get_gemini_response(
                prompt=prompt,
                model_id=ZERO_SHOT_MODEL,
                task="blind_ab_generation",
                use_cache=False,
            )
        except Exception as e:
            print(f"Zero_Shot Error: {e}")
            time.sleep(2)
    return ""

def get_drr_final(query: str) -> str:
    for attempt in range(3):
        try:
            resp = HTTP.post(
                SEARCH_URL,
                json={"query": query, "search_mode": "hybrid", "bypass_critic": False},
                headers=SERVICE_HEADERS,
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
            sections = data.get("sections") if isinstance(data, dict) else None
            if isinstance(sections, dict):
                review_answer = str(sections.get("review_answer", "") or "").strip()
                if review_answer:
                    return review_answer
            return data.get("answer", "")
        except Exception as e:
            print(f"DRR_Final Error: {e}")
            time.sleep(2)
    return ""

async def main():
    parser = argparse.ArgumentParser(description="Generate Blind A/B Test Answers")
    parser.add_argument(
        "--query-file",
        type=str,
        default=resolve_from_service("benchmarks", "results", "paper_core_benchmark_queries.json"),
        help="Path to the query file",
    )
    parser.add_argument(
        "--target-profile",
        type=str,
        choices=sorted(TARGET_PROFILES),
        default="legacy_stress_7",
        help="Named blind-test target set. Ignored when --target-ids is provided.",
    )
    parser.add_argument(
        "--target-ids",
        type=str,
        default=None,
        help="Comma-separated list of target query IDs. Overrides --target-profile.",
    )
    parser.add_argument(
        "--reuse-zero-shot-from",
        type=str,
        default="",
        help="Path to a prior blind_test_answers.json. Reuses its Zero_Shot answers and only regenerates DRR_Final.",
    )
    args = parser.parse_args()

    if not os.path.exists(args.query_file):
        print(f"❌ Error: Query file not found at {args.query_file}")
        sys.exit(1)

    with open(args.query_file, 'r', encoding='utf-8') as f:
        queries_data = json.load(f)

    query_map = {q['id']: q.get('engineering_query', q.get('query')) for q in queries_data}
    target_qs = resolve_target_ids(args.target_profile, args.target_ids)
    reused_zero_shot = load_reused_zero_shot_answers(args.reuse_zero_shot_from, target_qs)

    answers = {}
    for qid in target_qs:
        query = query_map.get(qid)
        if not query:
            print(f"Warning: Query {qid} not found in {args.query_file}")
            continue

        print(f"Generating answers for {qid}...")
        zero_shot_ans = reused_zero_shot.get(qid)
        if zero_shot_ans is None:
            zero_shot_ans = await get_zero_shot(query)
        else:
            print(f"  Reusing fixed Zero_Shot for {qid}")
        drr_final_ans = get_drr_final(query)

        answers[qid] = {
            "query": query,
            "Zero_Shot": zero_shot_ans,
            "DRR_Final": clean_drr_output(drr_final_ans)
        }

    identity = resolve_experiment_identity(
        benchmark_name="blind_test",
        default_version="v2",
        default_corpus="corpus_v3_scale",
        default_pipeline="generation",
        default_judge="human_or_llm",
    )
    paths = resolve_experiment_paths(
        identity=identity,
        result_filename="blind_test_answers.json",
    )
    paths.run_dir.mkdir(parents=True, exist_ok=True)

    with open(paths.results_csv, 'w', encoding='utf-8') as f:
        json.dump(answers, f, indent=2, ensure_ascii=False)

    # Generate Human Evaluation Markdown
    md_content = "# Blind A/B Evaluation\n\n"
    md_content += "Please evaluate the following pairs of answers for each query. For each pair, indicate which answer is better (A, B, or Tie) and briefly explain why.\n\n"
    
    mapping_data = {}
    
    for qid, data in answers.items():
        is_drr_a = random.choice([True, False])
        ans_a = data["DRR_Final"] if is_drr_a else data["Zero_Shot"]
        ans_b = data["Zero_Shot"] if is_drr_a else data["DRR_Final"]
        
        mapping_data[qid] = {
            "A": "DRR_Final" if is_drr_a else "Zero_Shot",
            "B": "Zero_Shot" if is_drr_a else "DRR_Final"
        }
        
        md_content += f"## Query: {qid}\n"
        md_content += f"**Problem:** {data['query']}\n\n"
        
        md_content += f"### Answer A\n{ans_a}\n\n"
        md_content += f"### Answer B\n{ans_b}\n\n"
        md_content += "**Your Choice (A / B / Tie):** \n"
        md_content += "**Reasoning:** \n\n"
        md_content += "---\n\n"
        
    human_eval_path = paths.run_dir / 'human_blind_ab_evaluation.md'
    with open(human_eval_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
        
    mapping_path = paths.run_dir / 'blind_ab_mapping_secret.json'
    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, indent=2)

    manifest = build_run_manifest(
        paths=paths,
        query_path=Path(args.query_file),
        eval_model=ZERO_SHOT_MODEL,
        command="python -m scripts.generate_blind_ab_answers",
        metadata={
            "target_profile": args.target_profile,
            "target_ids": target_qs,
            "reuse_zero_shot_from": args.reuse_zero_shot_from,
            "reused_zero_shot_count": len(reused_zero_shot),
            "regenerated_zero_shot_count": len(target_qs) - len(reused_zero_shot),
        }
    )
    from ai_service.script_support import write_json_file
    write_json_file(paths.manifest_json, manifest)

    print("\n✅ Generation Complete!")
    print(f"Saved blind_test_answers.json to: {paths.results_csv}")
    print(f"Saved human_blind_ab_evaluation.md to: {human_eval_path}")
    print(f"Saved blind_ab_mapping_secret.json to: {mapping_path}")
    print(f"Run ID: {identity.run_id}")

if __name__ == '__main__':
    asyncio.run(main())
