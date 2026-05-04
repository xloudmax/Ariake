import json
import asyncio
import numpy as np
import pandas as pd
import argparse
import re
from typing import List, Dict
import httpx
from ai_service.config import get_model_setting
from ai_service.llm import client_configured, get_embedding, get_gemini_response
from ai_service.script_support import (
    benchmark_eval_model,
    default_service_url,
    load_service_env,
    resolve_from_service,
    service_request_headers,
)

load_service_env()
SERVICE_HEADERS = service_request_headers()
EVAL_MODEL = benchmark_eval_model(
    default=get_model_setting("default", "model_id")
)
AI_SERVICE_URL = default_service_url()

# ==========================================
# 1. Dataset Configuration
# ==========================================
with open(
    resolve_from_service("benchmarks", "results", "paper_core_benchmark_queries.json"), "r"
) as f:
    EVAL_DATASET = json.load(f)

# ==========================================
# 2. Automated Metrics Functions
# ==========================================


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Batch fetch embeddings using GenAI."""
    if not client_configured():
        return [[0.0] * 768 for _ in texts]
    embeddings = []
    for text in texts:
        try:
            vec = await get_embedding(text)
            embeddings.append(vec)
        except Exception as e:
            print(f"Embedding error: {e}")
            embeddings.append([0.0] * 768)
    return embeddings


def cosine_distance(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine distance (1 - cosine_similarity)."""
    v1, v2 = np.array(vec1), np.array(vec2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    if norm == 0:
        return 1.0
    return 1.0 - np.dot(v1, v2) / norm


async def calculate_mechanism_divergence(nodes: List[Dict]) -> float:
    """Calculate Average Pairwise Cosine Distance of active ingredients."""
    active_ingredients = [
        n.get("active_ingredient", "") for n in nodes if n.get("active_ingredient")
    ]
    if len(active_ingredients) < 2:
        return 0.0

    embs = await get_embeddings(active_ingredients)
    distances = []
    for i in range(len(embs)):
        for j in range(i + 1, len(embs)):
            distances.append(cosine_distance(embs[i], embs[j]))
    return float(np.mean(distances))


def calculate_final_score(eval_result: dict) -> float:
    # 1. Physical Veto Check (Error Cascading / Hallucination check)
    if eval_result.get("physics_violation", False):
        return 0.0  # Violation of physical laws gets 0 score

    # 2. Extract specific scores
    novelty = eval_result.get("novelty_score", 1)
    clarity = eval_result.get("causal_score", 1)
    actionability = eval_result.get("action_score", 1)

    # 3. Geometric mean computation
    final_score = np.cbrt(novelty * clarity * actionability)
    return round(final_score, 2)


# ==========================================
# 3. G-Eval (LLM-as-a-Judge) Prompts
# ==========================================

G_EVAL_PROMPT = """
<system_instruction>
You are an expert evaluator for a cross-domain engineering reasoning benchmark. Your task is to evaluate an AI-generated solution that transfers mechanisms from one domain into a target engineering problem.
You MUST strictly follow the 1-5 grading rubrics below. Do NOT hallucinate scores.

<rubric_causal_clarity>
  <score value="1">Surface Analogy: Mentions a source-domain phenomenon without explaining how it works or why it transfers.</score>
  <score value="3">Mechanism Stated: Explains the basic mechanism but lacks physical, mathematical, or architectural grounding.</score>
  <score value="5">Physics Grounded: Provides a complete causal chain from source-domain mechanism to engineering effect, including boundary conditions or governing parameters.</score>
</rubric_causal_clarity>

<rubric_actionability>
  <score value="1">Trivia: The output is descriptive trivia. An engineer cannot build anything from it.</score>
  <score value="3">Conceptual Direction: Suggests a general engineering approach, but lacks specific parameters or manufacturing methods.</score>
  <score value="5">Actionable Blueprint: Provides concrete design parameters (e.g., "500μm spacing", "laser-etched polymer") and addresses manufacturability or trade-offs.</score>
</rubric_actionability>

<rubric_novelty>
  <score value="1">Common Knowledge: Uses standard, well-known industry solutions (e.g., using a fan for cooling).</score>
  <score value="3">Distant Analogy: Draws from a non-obvious source domain, but the transfer remains relatively straightforward or already well studied.</score>
  <score value="5">Ultra-Divergent Leap: Successfully bridges highly distant domains while remaining scientifically valid and technically defensible.</score>
</rubric_novelty>

<rubric_physics_veto>
  <instruction>FATAL ERROR CHECK: If the proposed solution violates fundamental laws of physics (e.g., Thermodynamics, Conservation of Mass/Energy), you MUST trigger the veto.</instruction>
  <output>Set "physics_violation": true if violated, else false.</output>
</rubric_physics_veto>

Evaluate the provided solution and output strictly in JSON format.
Output format:
{{
    "novelty_score": int,
    "causal_score": int,
    "action_score": int,
    "physics_violation": bool,
    "reasoning": "string"
}}
</system_instruction>

--- User Problem Context ---
Engineering Problem: {query}
Expected Biological Hints: {expected_hints}
Ground Truth Required Mechanisms: {expected_mechanisms}
Ground Truth Physical Constraints: {expected_constraints}

--- System Generated Solution ---
{system_output}
"""


async def run_g_eval(query: str, system_output: str, item: Dict) -> Dict:
    """Run LLM-as-a-judge to evaluate the quality of the generated output."""
    if not client_configured():
        return {
            "novelty_score": 1,
            "causal_score": 1,
            "action_score": 1,
            "physics_violation": False,
            "reasoning": "Missing Vertex AI benchmark API key",
        }
    prompt = G_EVAL_PROMPT.format(
        query=query,
        expected_hints=", ".join(item.get("biological_hints", [])),
        expected_mechanisms=", ".join(
            item["ground_truth"].get("required_mechanisms", [])
        ),
        expected_constraints=", ".join(
            item["ground_truth"].get("physics_constraints", [])
        ),
        system_output=system_output,
    )

    try:
        response_text = await get_gemini_response(
            prompt=prompt,
            json_mode=True,
            model_id=EVAL_MODEL,
            task="benchmark_judge",
            use_cache=False,
        )
        return json.loads(response_text)
    except Exception as e:
        print(f"G-Eval Error: {e}")
        return {
            "novelty_score": 1,
            "causal_score": 1,
            "action_score": 1,
            "physics_violation": False,
            "reasoning": str(e),
        }


# ==========================================
# 4. Main Evaluation Execution Pipeline
# ==========================================


async def evaluate_query(item: Dict, http_client: httpx.AsyncClient) -> List[Dict]:
    """Run the pipeline for a single query across all 3 baselines."""
    query = item["engineering_query"]
    print(f"\nEvaluating: {item['id']} - {query[:50]}...")

    results = []

    # ---------------------------------------------------------
    # Scenario 1: Baseline A (Pure Vector Retrieval)
    # ---------------------------------------------------------
    print("  -> Running Baseline A (Vector Search)...")
    base_a_metrics = {
        "id": item["id"],
        "difficulty": item["difficulty"],
        "scenario": "Baseline_A_Vector",
        "query": query,
        "error": None,
    }
    try:
        res = await http_client.post(
            f"{AI_SERVICE_URL}/graph/global-search",
            json={"query": query, "search_mode": "vector"},
            headers=SERVICE_HEADERS,
        )
        res.raise_for_status()
        output = res.json().get("answer", "")
        if output:
            scores = await run_g_eval(query, output, item)
            base_a_metrics.update(scores)
            base_a_metrics["final_score"] = calculate_final_score(scores)
        else:
            base_a_metrics["error"] = "Empty output"
    except Exception as e:
        base_a_metrics["error"] = str(e)
    results.append(base_a_metrics)

    # ---------------------------------------------------------
    # Scenario 2: Baseline B (Pure GraphRAG)
    # ---------------------------------------------------------
    print("  -> Running Baseline B (GraphRAG)...")
    base_b_metrics = {
        "id": item["id"],
        "difficulty": item["difficulty"],
        "scenario": "Baseline_B_Graph",
        "query": query,
        "error": None,
    }
    try:
        # Pass active_ingredients="NONE" to prevent fallback to draft
        res = await http_client.post(
            f"{AI_SERVICE_URL}/graph/global-search",
            json={
                "query": query,
                "search_mode": "hybrid",
                "active_ingredients": "NONE",
            },
            headers=SERVICE_HEADERS,
        )
        res.raise_for_status()
        output = res.json().get("answer", "")
        if output:
            scores = await run_g_eval(query, output, item)
            base_b_metrics.update(scores)
            base_b_metrics["final_score"] = calculate_final_score(scores)
        else:
            base_b_metrics["error"] = "Empty output"
    except Exception as e:
        base_b_metrics["error"] = str(e)
    results.append(base_b_metrics)

    # ---------------------------------------------------------
    # Scenario 3: DRR (Mechanism Tree + GraphRAG)
    # ---------------------------------------------------------
    print("  -> Running DRR (Tree + Graph)...")
    drr_metrics = {
        "id": item["id"],
        "difficulty": item["difficulty"],
        "scenario": "DRR_Full",
        "query": query,
        "mechanism_divergence": 0.0,
        "error": None,
    }
    try:
        tree_res = await http_client.post(
            f"{AI_SERVICE_URL}/generate/mechanism-tree",
            json={"query": query},
            headers=SERVICE_HEADERS,
        )
        tree_res.raise_for_status()
        nodes = tree_res.json().get("nodes", [])
        drr_metrics["mechanism_divergence"] = await calculate_mechanism_divergence(
            nodes
        )

        search_query = query
        ingredients = []
        if nodes:
            ingredients = [
                n.get("active_ingredient")
                for n in nodes[:3]
                if n.get("active_ingredient")
            ]
            if ingredients:
                search_query = (
                    f"{query}. Consider mechanisms like: {', '.join(ingredients)}"
                )

        graph_res = await http_client.post(
            f"{AI_SERVICE_URL}/graph/global-search",
            json={
                "query": search_query,
                "search_mode": "hybrid",
                "active_ingredients": ", ".join(ingredients) if ingredients else "",
            },
            headers=SERVICE_HEADERS,
        )
        graph_res.raise_for_status()
        output = graph_res.json().get("answer", "")

        if output:
            scores = await run_g_eval(query, output, item)
            drr_metrics.update(scores)
            drr_metrics["final_score"] = calculate_final_score(scores)
        else:
            drr_metrics["error"] = "Empty output"
    except Exception as e:
        drr_metrics["error"] = str(e)
    results.append(drr_metrics)

    return results


async def run_benchmark():
    """Run the entire automated benchmark and save results."""
    print(f"Starting DRR Ablation Benchmark on {len(EVAL_DATASET)} queries...")
    all_results = []

    async with httpx.AsyncClient(timeout=300.0) as http_client:
        for i, item in enumerate(EVAL_DATASET):
            res_list = await evaluate_query(item, http_client)
            all_results.extend(res_list)

            # Incremental save
            df = pd.DataFrame(all_results)
            df.to_csv(
                resolve_from_service(
                    "benchmarks", "results", "drr_ablation_results.csv"
                ),
                index=False,
            )
            print(f"Progress: {i + 1}/{len(EVAL_DATASET)} saved.")

    df = pd.DataFrame(all_results)

    # Calculate Averages
    print("\n--- Benchmark Complete ---")
    for scenario in ["Baseline_A_Vector", "Baseline_B_Graph", "DRR_Full"]:
        subset = df[df["scenario"] == scenario]
        print(f"\n[{scenario}] Averages:")
        print(f"  Final Score (GeoMean): {subset['final_score'].mean():.2f}")
        print(f"  Novelty: {subset['novelty_score'].mean():.2f}")
        print(f"  Causality: {subset['causal_score'].mean():.2f}")
        print(f"  Actionability: {subset['action_score'].mean():.2f}")
        print(f"  Vetos Triggered: {subset['physics_violation'].sum()}")

    print(
        f"\nResults saved to {resolve_from_service('benchmarks', 'results', 'drr_ablation_results.csv')}"
    )


# ==========================================
# 5. Null Query Benchmark (Barrier Defense)
# ==========================================


def evaluate_null_query_response(llm_response: str) -> Dict:
    """Parse LLM output to extract Ultra-Divergence Barrier status."""
    result = {
        "barrier_triggered": False,
        "is_successful_defense": False,
        "global_insight_safe": False,
    }

    # 0. Check for explicit API-level pruning rejection
    if "No relevant knowledge communities found" in llm_response:
        result["barrier_triggered"] = True
        result["global_insight_safe"] = True
        result["is_successful_defense"] = True
        return result

    # 1. Extract JSON from <search_diagnostics>
    diagnostics_match = re.search(
        r"<search_diagnostics>\s*({.*?})\s*</search_diagnostics>",
        llm_response,
        re.DOTALL,
    )
    if diagnostics_match:
        try:
            diagnostics = json.loads(diagnostics_match.group(1))
            result["barrier_triggered"] = diagnostics.get("barrier_triggered", False)
        except json.JSONDecodeError:
            pass

    # 2. Check if <global_insight> safely rejected the association
    insight_match = re.search(
        r"<global_insight>(.*?)</global_insight>", llm_response, re.DOTALL
    )
    if insight_match:
        insight_text = insight_match.group(1).strip()
        if any(
            phrase in insight_text.lower()
            for phrase in [
                "未能跨越",
                "未能找到",
                "不足以",
                "没找到",
                "没有找到",
                "缺乏",
                "not found",
                "insufficient",
                "lack of",
                "no direct connection",
            ]
        ):
            result["global_insight_safe"] = True

    # 3. Vector Baseline support: Check <final_response> for rejection phrases
    final_match = re.search(
        r"<final_response>(.*?)</final_response>", llm_response, re.DOTALL
    )
    if final_match:
        final_text = final_match.group(1).strip()
        if any(
            phrase in final_text.lower()
            for phrase in [
                "no direct connection",
                "insufficient data",
                "lack of evidence",
                "not feasible",
                "未能找到",
                "无法建立",
            ]
        ):
            result["global_insight_safe"] = True

    # 4. Check for Action Summary presence/vague-ness
    action_match = re.search(
        r"<action_summary>(.*?)</action_summary>", llm_response, re.DOTALL
    )
    action_content = action_match.group(1).strip() if action_match else ""
    has_real_action = len(action_content) > 20 and not any(
        phrase in action_content.lower()
        for phrase in ["none", "n/a", "no action", "未提供"]
    )

    # 5. Final Defense Status
    # A successful defense means barrier triggered OR insight is safe, AND there is no substantial action summary
    if (
        result["barrier_triggered"] or result["global_insight_safe"]
    ) and not has_real_action:
        result["is_successful_defense"] = True
    elif result["barrier_triggered"] and result["global_insight_safe"]:
        result["is_successful_defense"] = True

    return result


async def evaluate_null_query(item: Dict, http_client: httpx.AsyncClient) -> List[Dict]:
    """Run a Null Query against all 3 baselines."""
    query = item["engineering_query"]
    ingredients = item["active_ingredients"]
    print(f"\nEvaluating Null Query: {item['id']} - {query[:50]}...")

    results = []
    compound_query = f"{query}. Consider mechanisms like: {', '.join(ingredients)}"

    # Baseline A
    print("  -> Running Baseline A (Vector Search)...")
    base_a = {
        "id": item["id"],
        "scenario": "Baseline_A_Vector",
        "is_successful_defense": False,
    }
    try:
        res = await http_client.post(
            f"{AI_SERVICE_URL}/graph/global-search",
            json={"query": compound_query, "search_mode": "vector"},
            headers=SERVICE_HEADERS,
        )
        res.raise_for_status()
        base_a.update(evaluate_null_query_response(res.json().get("answer", "")))
    except Exception as e:
        print(f"Baseline A Error: {e}")
    results.append(base_a)

    # Baseline B
    print("  -> Running Baseline B (GraphRAG)...")
    base_b = {
        "id": item["id"],
        "scenario": "Baseline_B_Graph",
        "is_successful_defense": False,
    }
    try:
        res = await http_client.post(
            f"{AI_SERVICE_URL}/graph/global-search",
            json={
                "query": compound_query,
                "search_mode": "hybrid",
                "active_ingredients": "NONE",
            },
            headers=SERVICE_HEADERS,
        )
        res.raise_for_status()
        base_b.update(evaluate_null_query_response(res.json().get("answer", "")))
    except Exception as e:
        print(f"Baseline B Error: {e}")
    results.append(base_b)

    # DRR
    print("  -> Running DRR (Tree + Graph)...")
    drr = {"id": item["id"], "scenario": "DRR_Full", "is_successful_defense": False}
    try:
        # Note: We skip the Tree generation since ingredients are already provided in the Null Query
        res = await http_client.post(
            f"{AI_SERVICE_URL}/graph/global-search",
            json={
                "query": compound_query,
                "search_mode": "hybrid",
                "active_ingredients": ", ".join(ingredients),
            },
            headers=SERVICE_HEADERS,
        )
        res.raise_for_status()
        drr.update(evaluate_null_query_response(res.json().get("answer", "")))
    except Exception as e:
        print(f"DRR Error: {e}")
    results.append(drr)

    return results


async def run_barrier_benchmark(subset_n=None):
    """Run the Null Query benchmark and save results."""
    with open(
        resolve_from_service("benchmarks", "results", "benchmark_queries_null.json"),
        "r",
    ) as f:
        null_dataset = json.load(f)

    if subset_n:
        null_dataset = null_dataset[:subset_n]

    print(f"\nStarting Null Query Benchmark on {len(null_dataset)} queries...")
    all_results = []

    async with httpx.AsyncClient(timeout=300.0) as http_client:
        for i, item in enumerate(null_dataset):
            res_list = await evaluate_null_query(item, http_client)
            all_results.extend(res_list)
            df = pd.DataFrame(all_results)
            df.to_csv(
                resolve_from_service("benchmarks", "results", "drr_null_results.csv"),
                index=False,
            )
            print(f"Progress: {i + 1}/{len(null_dataset)} saved.")

    df = pd.DataFrame(all_results)
    print("\n--- Barrier Benchmark Complete ---")
    for scenario in ["Baseline_A_Vector", "Baseline_B_Graph", "DRR_Full"]:
        subset = df[df["scenario"] == scenario]
        if len(subset) > 0:
            bdr = (subset["is_successful_defense"].sum() / len(subset)) * 100
            print(
                f"\n[{scenario}] Barrier Defense Rate (BDR): {bdr:.2f}% ({subset['is_successful_defense'].sum()}/{len(subset)})"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DRR Automated Benchmark")
    parser.add_argument(
        "--eval-mode",
        choices=["standard", "null"],
        default="standard",
        help="Which benchmark to run",
    )
    parser.add_argument(
        "--subset", type=int, default=None, help="Only run on first N queries"
    )
    args = parser.parse_args()

    if args.eval_mode == "standard":
        asyncio.run(run_benchmark())
    elif args.eval_mode == "null":
        asyncio.run(run_barrier_benchmark(args.subset))
