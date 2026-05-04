import argparse
import asyncio
import json
import os
import re
import csv
import random
import sys
import time
from pathlib import Path

from ai_service.llm import get_gemini_response
from ai_service.script_support import (
    benchmark_eval_model,
    resolve_from_service,
    load_service_env,
    resolve_experiment_identity,
    resolve_experiment_paths,
    resolve_latest_run_result,
    build_run_manifest,
    ROOT_DIR,
)

load_service_env()

PROMPT_FILES = {
    "neutral": "evaluation_blind_ab.md",
    "transfer_aware": "evaluation_blind_ab_transfer_aware.md",
}


def default_judge_profile() -> str:
    profile = os.getenv("BLIND_AB_JUDGE_PROFILE", "neutral").strip().lower()
    if profile not in PROMPT_FILES:
        raise ValueError(
            f"Unsupported BLIND_AB_JUDGE_PROFILE: {profile}. "
            f"Expected one of: {', '.join(sorted(PROMPT_FILES))}"
        )
    return profile


def load_judge_prompt(profile: str | None = None) -> str:
    resolved_profile = (profile or default_judge_profile()).strip().lower()
    prompt_name = PROMPT_FILES.get(resolved_profile)
    if not prompt_name:
        raise ValueError(
            f"Unsupported blind A/B judge profile: {resolved_profile}. "
            f"Expected one of: {', '.join(sorted(PROMPT_FILES))}"
        )
    prompt_path = resolve_from_service("prompts", prompt_name)
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Prompt file not found at {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


JUDGE_MODEL = benchmark_eval_model(dataset_name="blind_test")


def strip_formatting(text: str) -> str:
    if not text:
        return ""
    # Remove XML thinking blocks entirely
    text = re.sub(r'<thinking>.*?</thinking>', '', text, flags=re.DOTALL)
    # Remove other XML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove Markdown bold/italic
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Remove Markdown headers
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    # Remove bullet points
    text = re.sub(r'^\s*[-*]\s+', '', text, flags=re.MULTILINE)
    # Compress multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


async def evaluate_ab(query: str, answer_a: str, answer_b: str, system_prompt: str) -> dict:
    prompt = f"""
# Query
{query}

# Answer A
{answer_a}

# Answer B
{answer_b}
"""
    for attempt in range(3):
        try:
            result_str = await get_gemini_response(
                prompt=prompt,
                system_instruction=system_prompt,
                json_mode=True,
                model_id=JUDGE_MODEL,
                task="benchmark_judge",
                use_cache=False,
            )
            if result_str.startswith("```json"):
                result_str = result_str[7:-3]
            elif result_str.startswith("```"):
                result_str = result_str[3:-3]

            return json.loads(result_str.strip())
        except Exception as e:
            print(f"Error evaluating A/B (attempt {attempt + 1}): {e}")
            time.sleep(2)

    return {"reasoning": "Failed to evaluate", "winner": "Tie"}


async def main():
    parser = argparse.ArgumentParser(description="Evaluate Blind A/B Test Answers")
    parser.add_argument(
        "--answers-file",
        type=str,
        default="",
        help="Path to the blind test answers JSON file. Defaults to latest generation run.",
    )
    parser.add_argument(
        "--judge-profile",
        type=str,
        default=default_judge_profile(),
        choices=sorted(PROMPT_FILES),
        help="Blind A/B prompt profile. 'neutral' preserves standard engineering judging; "
             "'transfer_aware' also rewards defensible cross-domain transfer value.",
    )
    args = parser.parse_args()

    answers_path = args.answers_file
    if not answers_path:
        base_dir = ROOT_DIR / "benchmarks" / "runs" / "blind_test" / "v2" / "corpus_v3_scale" / "generation" / "human_or_llm"
        latest = resolve_latest_run_result(base_dir, result_filename="blind_test_answers.json")
        if not latest:
            print(f"❌ Error: No blind test answers found in {base_dir}")
            sys.exit(1)
        answers_path = str(latest)

    if not os.path.exists(answers_path):
        print(f"❌ Error: Answers file not found at {answers_path}")
        sys.exit(1)

    print(f"Loading answers from: {answers_path}")
    with open(answers_path, "r", encoding="utf-8") as f:
        answers_data = json.load(f)

    try:
        system_prompt = load_judge_prompt(args.judge_profile)
    except (ValueError, FileNotFoundError) as exc:
        print(f"❌ Error: {exc}")
        sys.exit(1)

    identity = resolve_experiment_identity(
        benchmark_name="blind_test",
        default_version="v2",
        default_corpus="corpus_v3_scale",
        default_pipeline="evaluation",
        default_judge=args.judge_profile,
    )
    paths = resolve_experiment_paths(
        identity=identity,
        result_filename="blind_ab_results.csv",
    )
    paths.run_dir.mkdir(parents=True, exist_ok=True)
    
    RESULTS_CSV_PATH = str(paths.results_csv)
    HUMAN_EVAL_CSV_PATH = str(paths.run_dir / "human_blind_ab_evaluation.csv")

    results = []
    drr_wins = 0
    zero_shot_wins = 0
    ties = 0
    
    print(f"🚀 Starting Blind A/B Evaluation for {len(answers_data)} queries...")
    
    for i, (query_id, ans_dict) in enumerate(answers_data.items(), 1):
        query = ans_dict.get("query", f"Missing query text for {query_id}")
        
        zero_shot_raw = ans_dict.get("Zero_Shot", "")
        drr_final_raw = ans_dict.get("DRR_Final", "")
        
        # Anonymize
        zero_shot_clean = strip_formatting(zero_shot_raw)
        drr_final_clean = strip_formatting(drr_final_raw)
        
        # Randomize A and B
        is_drr_a = random.choice([True, False])
        if is_drr_a:
            answer_a = drr_final_clean
            answer_b = zero_shot_clean
        else:
            answer_a = zero_shot_clean
            answer_b = drr_final_clean
            
        print(f"\nEvaluating [{i}/{len(answers_data)}] {query_id}...")
        
        eval_result = await evaluate_ab(query, answer_a, answer_b, system_prompt)
        
        winner_label = eval_result.get("winner", "Tie")
        reasoning = eval_result.get("reasoning", "")
        
        # Resolve true winner
        true_winner = "Tie"
        if winner_label == "A":
            true_winner = "DRR_Final" if is_drr_a else "Zero_Shot"
        elif winner_label == "B":
            true_winner = "Zero_Shot" if is_drr_a else "DRR_Final"
            
        if true_winner == "DRR_Final":
            drr_wins += 1
        elif true_winner == "Zero_Shot":
            zero_shot_wins += 1
        else:
            ties += 1
            
        print(f"  Result: {true_winner} (Judge chose {winner_label})")
        print(f"  Reasoning: {reasoning}")
        
        results.append({
            "query_id": query_id,
            "query": query,
            "is_drr_a": is_drr_a,
            "judge_choice": winner_label,
            "true_winner": true_winner,
            "reasoning": reasoning,
            "answer_a_snippet": answer_a[:100] + "...",
            "answer_b_snippet": answer_b[:100] + "...",
            "answer_a_full": answer_a,
            "answer_b_full": answer_b
        })
        
    # Write to CSV
    with open(RESULTS_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "query_id", "query", "is_drr_a", "judge_choice", 
            "true_winner", "reasoning", "answer_a_snippet", "answer_b_snippet",
            "answer_a_full", "answer_b_full"
        ])
        writer.writeheader()
        writer.writerows(results)
        
    # Write Human Eval CSV
    with open(HUMAN_EVAL_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "query_id", "query", "answer_a", "answer_b", "human_winner_a_b_tie", "human_reasoning"
        ])
        writer.writeheader()
        for r in results:
            writer.writerow({
                "query_id": r["query_id"],
                "query": r["query"],
                "answer_a": r["answer_a_full"],
                "answer_b": r["answer_b_full"],
                "human_winner_a_b_tie": "",
                "human_reasoning": ""
            })

    manifest = build_run_manifest(
        paths=paths,
        query_path=Path(answers_path),
        eval_model=JUDGE_MODEL,
        command="python -m scripts.run_blind_ab_testing",
        metadata={
            "judge_prompt_id": PROMPT_FILES[args.judge_profile],
            "judge_profile": args.judge_profile,
            "drr_wins": drr_wins,
            "zero_shot_wins": zero_shot_wins,
            "ties": ties,
            "total_queries": len(answers_data)
        }
    )
    from ai_service.script_support import write_json_file
    write_json_file(paths.manifest_json, manifest)
        
    print("\n" + "="*40)
    print("🏆 Blind A/B Evaluation Complete")
    print("="*40)
    print(f"Total Queries: {len(answers_data)}")
    print(f"DRR_Final Wins: {drr_wins} ({(drr_wins/len(answers_data))*100:.1f}%)")
    print(f"Zero_Shot Wins: {zero_shot_wins} ({(zero_shot_wins/len(answers_data))*100:.1f}%)")
    print(f"Ties: {ties} ({(ties/len(answers_data))*100:.1f}%)")
    print(f"Results saved to: {RESULTS_CSV_PATH}")
    print(f"Human evaluation sheet saved to: {HUMAN_EVAL_CSV_PATH}")
    print(f"Run ID: {identity.run_id}")


if __name__ == "__main__":
    asyncio.run(main())
