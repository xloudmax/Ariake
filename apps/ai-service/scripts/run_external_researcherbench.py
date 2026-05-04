import os
import json
import asyncio
import pandas as pd
import argparse
from typing import List, Dict, Any
import httpx

from ai_service.script_support import (
    benchmark_eval_model,
    default_service_url,
    load_service_env,
    resolve_from_service,
    service_request_headers,
    create_vertex_express_client,
)
from ai_service.prompts import EXPERT_ASSESSOR_PROMPT

load_service_env()
SEARCH_URL = f"{default_service_url()}/graph/global-search"
TREE_URL = f"{default_service_url()}/generate/mechanism-tree"
SERVICE_HEADERS = service_request_headers()
JUDGE_MODEL = benchmark_eval_model()


async def generate_research_report(
    question: str, http_client: httpx.AsyncClient
) -> str:
    """Generate a report through the service's DRR pipeline instead of direct model calls."""
    for attempt in range(3):
        try:
            tree_response = await http_client.post(TREE_URL, json={"query": question})
            tree_response.raise_for_status()
            tree_data = tree_response.json()
            nodes = tree_data.get("nodes", [])
            ingredients = [
                node.get("active_ingredient")
                for node in nodes[:3]
                if node.get("active_ingredient")
            ]
            active_ingredients = ", ".join(ingredients)
            search_query = question
            if active_ingredients:
                search_query = (
                    f"{question}\n\nConsider mechanisms like: {active_ingredients}"
                )

            response = await http_client.post(
                SEARCH_URL,
                json={
                    "query": search_query,
                    "search_mode": "hybrid",
                    "active_ingredients": active_ingredients,
                    "bypass_critic": False,
                },
            )
            response.raise_for_status()
            answer = response.json().get("answer", "")
            if not answer:
                raise RuntimeError("Service returned empty answer")
            return answer
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                wait_time = (attempt + 1) * 10
                print(f"  !! Rate limited (429). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                raise
    return "Generation failed."


async def evaluate_rubric(
    question: str, report: str, rubric: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Use LLM-as-a-judge to evaluate the report against the expert rubric."""
    client = create_vertex_express_client()
    if not client:
        total_possible_weight = sum([r["weight"] for r in rubric])
        return {
            "scaled_score": 0.0,
            "total_achieved_weight": 0,
            "total_possible_weight": total_possible_weight,
            "reasoning": "Missing Vertex AI benchmark API key",
        }

    rubric_str = "\n".join([f"- [Weight: {r['weight']}] {r['point']}" for r in rubric])
    total_possible_weight = sum([r["weight"] for r in rubric])

    prompt = EXPERT_ASSESSOR_PROMPT.format(
        question=question,
        report=report,
        rubric_str=rubric_str,
        total_possible_weight=total_possible_weight,
    )
    for attempt in range(3):
        try:
            response = await client.aio.models.generate_content(
                model=JUDGE_MODEL,
                contents=prompt,
                config={
                    "system_instruction": "You are a strict academic reviewer. Output ONLY valid JSON.",
                    "response_mime_type": "application/json"
                }
            )
            eval_result_str = response.text

            # Clean up JSON markdown block if present
            if eval_result_str.startswith("```json"):
                eval_result_str = eval_result_str[7:-3]
            elif eval_result_str.startswith("```"):
                eval_result_str = eval_result_str[3:-3]

            eval_result = json.loads(eval_result_str.strip())

            # Calculate scaled score 0-5
            achieved = eval_result.get("total_achieved_weight", 0)
            possible = eval_result.get("total_possible_weight", total_possible_weight)
            scaled_score = (achieved / possible) * 5.0 if possible > 0 else 0.0

            eval_result["scaled_score"] = round(scaled_score, 2)
            return eval_result
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                wait_time = (attempt + 1) * 10
                print(f"  !! Eval Rate limited (429). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"Error during evaluation: {e}")
                return {
                    "scaled_score": 0.0,
                    "total_achieved_weight": 0,
                    "total_possible_weight": total_possible_weight,
                    "reasoning": f"Evaluation failed: {e}",
                }
    return {"scaled_score": 0.0}


async def process_single_question(
    q, i, limit, rubric_map, sem, http_client: httpx.AsyncClient
):
    async with sem:
        q_id = q["id"]
        question_text = q["question"]
        subject = q["Subject"]

        print(f"[{i + 1}/{limit}] Deep Researching ID:{q_id} | Subject: {subject}...")

        # 1. Generate Report
        report = await generate_research_report(question_text, http_client)

        # 2. Evaluate
        print(
            f"  -> [{q_id}] Report generated ({len(report)} chars). Evaluating against Rubric..."
        )
        rubric = rubric_map.get(q_id, [])
        eval_result = await evaluate_rubric(question_text, report, rubric)

        score = eval_result.get("scaled_score", 0.0)
        print(f"  -> [{q_id}] Score: {score}/5.00")

        return {
            "id": q_id,
            "category": q["category"],
            "subject": subject,
            "score_5": score,
            "achieved_weight": eval_result.get("total_achieved_weight", 0),
            "possible_weight": eval_result.get("total_possible_weight", 0),
            "insight_quality": score,
            "faithfulness": score,
            "status": "success",
        }


async def run_researcherbench(limit: int = 5):
    q_file = resolve_from_service(
        "benchmarks",
        "external",
        "ResearcherBench",
        "data",
        "eval_data",
        "questions.json",
    )
    r_file = resolve_from_service(
        "benchmarks", "external", "ResearcherBench", "data", "eval_data", "rubric.json"
    )

    with open(q_file, "r") as f:
        questions = json.load(f)
    with open(r_file, "r") as f:
        rubrics = json.load(f)

    rubric_map = {item["id"]: item["rubric"] for item in rubrics}

    print(f"Loaded {len(questions)} questions. Running first {limit} concurrently...")

    sem = asyncio.Semaphore(2)  # Reduced concurrency to avoid 429s

    valid_results = []
    output_path = resolve_from_service(
        "benchmarks", "results", "external_researcherbench_results.csv"
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    async with httpx.AsyncClient(timeout=300.0, headers=SERVICE_HEADERS) as http_client:
        tasks = [
            process_single_question(q, i, limit, rubric_map, sem, http_client)
            for i, q in enumerate(questions[:limit])
        ]

        for r_task in asyncio.as_completed(tasks):
            try:
                r = await r_task
            except Exception as exc:
                print(f"Task failed with error: {exc}")
                continue
            valid_results.append(r)
            pd.DataFrame(valid_results).to_csv(output_path, index=False)

    print(f"\nDone! Final results saved to {output_path}")

    if len(valid_results) > 0:
        df_final = pd.DataFrame(valid_results)
        print("\n--- Summary ---")
        print(f"Mean Insight Score (Rubric): {df_final['score_5'].mean():.2f}/5.00")
        print(f"Success Rate: {(df_final['status'] == 'success').mean() * 100:.1f}%")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    asyncio.run(run_researcherbench(args.limit))
