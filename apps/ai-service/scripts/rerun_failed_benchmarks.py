import asyncio
import json
import os

import pandas as pd
import requests
from tqdm import tqdm

from ai_service.config import get_model_setting
from ai_service.llm import client_configured, get_gemini_response
from ai_service.script_support import (
    benchmark_eval_model,
    default_service_url,
    load_service_env,
    resolve_from_service,
    service_request_headers,
)

load_service_env()

AI_SERVICE_URL = f"{default_service_url()}/graph/global-search"
RESULTS_DIR = resolve_from_service("benchmarks", "results")
INPUT_FILE = RESULTS_DIR / "drr_ablation_results.csv"
OUTPUT_FILE = RESULTS_DIR / "rerun_improved_results.csv"
SERVICE_HEADERS = service_request_headers()
EVAL_MODEL = benchmark_eval_model(
    default=get_model_setting("default", "model_id")
)

EVAL_PROMPT = """
You are a highly rigorous, expert scientific reviewer (G-Eval).
Evaluate the provided "AI Output" based on the user's "Query".

Evaluate on three dimensions (1-10):
1. Causality (1-10): Mechanistic clarity.
2. Actionability (1-10): Engineering blueprint.
3. Novelty (1-10): Cross-domain synthesis.

Output strictly in JSON format:
{
    "causality": <int>,
    "actionability": <int>,
    "novelty": <int>,
    "reasoning": "..."
}
"""


async def evaluate_output(query, ai_output):
    if not client_configured():
        return {"final_score": 1.0}
    prompt = (
        f"Query: {query}\n\nAI Output:\n{ai_output}\n\nEvaluate in JSON (1-10 scale)."
    )
    try:
        response_text = await get_gemini_response(
            prompt=prompt,
            system_instruction=EVAL_PROMPT,
            json_mode=True,
            model_id=EVAL_MODEL,
            task="benchmark_judge",
            use_cache=False,
        )
        res = json.loads(response_text)
        # Geometric mean
        c, a, n = (
            res.get("causality", 1),
            res.get("actionability", 1),
            res.get("novelty", 1),
        )
        final = (c * a * n) ** (1 / 3)
        res["final_score"] = round(final, 2)
        return res
    except Exception as e:
        return {"final_score": 1.0, "reasoning": f"Eval Error: {e}"}


async def run_test(query, mode):
    search_mode = "hybrid" if mode == "drr" else "vector"
    bypass_critic = False if mode == "drr" else True

    try:
        resp = requests.post(
            AI_SERVICE_URL,
            json={
                "query": query,
                "search_mode": search_mode,
                "bypass_critic": bypass_critic,
            },
            headers=SERVICE_HEADERS,
            timeout=150,
        )
        data = resp.json()
        answer = data.get("answer", "")
        if "No relevant knowledge" in answer or not answer:
            return {"final_score": 1.0, "answer": answer}

        eval_res = await evaluate_output(query, answer)
        eval_res["answer"] = answer
        return eval_res
    except Exception as e:
        return {"final_score": 1.0, "reasoning": str(e)}


async def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Input file {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    # Filter for queries that failed (score ~1.0)
    failed_df = df[df["final_score"] <= 1.1]
    all_queries = failed_df["query"].unique().tolist()

    # Pick 10 representing different categories if possible
    queries = all_queries[:10]

    print(f"Rerunning {len(queries)} sample failed queries with model {EVAL_MODEL}...")
    results = []

    for q in tqdm(queries):
        print(f"\nEvaluating: {q[:60]}...")
        drr = await run_test(q, "drr")
        base = await run_test(q, "baseline")

        results.append(
            {
                "query": q,
                "drr_score": drr["final_score"],
                "base_score": base["final_score"],
                "improvement": drr["final_score"] - base["final_score"],
                "drr_causality": drr.get("causality", 1),
                "drr_actionability": drr.get("actionability", 1),
                "drr_novelty": drr.get("novelty", 1),
                "drr_reasoning": drr.get("reasoning", ""),
            }
        )
        # Immediate save
        pd.DataFrame(results).to_csv(OUTPUT_FILE, index=False)


if __name__ == "__main__":
    asyncio.run(main())
