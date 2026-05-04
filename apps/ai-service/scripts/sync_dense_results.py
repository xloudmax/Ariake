import pandas as pd
import os
from ai_service.script_support import resolve_from_service

# Paths
results_dir = resolve_from_service("benchmarks", "results")
ablation_file = results_dir / "drr_ablation_results.csv"
improved_file = results_dir / "rerun_improved_results.csv"
dense_file = results_dir / "drr_ablation_dense_results.csv"

if os.path.exists(improved_file):
    df_imp = pd.read_csv(improved_file)
    print(f"Reading improved results from {improved_file}")

    # Create rows for DRR_Full
    drr_rows = []
    for _, row in df_imp.iterrows():
        drr_rows.append(
            {
                "query": row["query"],
                "scenario": "DRR_Full",
                "final_score": row["drr_score"],
                "reasoning": row["drr_reasoning"],
                "causal_score": row["drr_causality"],
                "action_score": row["drr_actionability"],
                "novelty_score": row["drr_novelty"],
            }
        )

    combined_dfs = [pd.DataFrame(drr_rows)]

    # 1. Old Baselines (Vector and GraphRAG)
    try:
        old_df = pd.read_csv(ablation_file)
        # Vector
        vector_df = old_df[old_df["scenario"] == "Baseline_A_Vector"].copy()
        for col in ["novelty_score", "causal_score", "action_score", "final_score"]:
            vector_df[col] = (vector_df[col] - 1) * 2.0 + 1
        vector_df["scenario"] = "Baseline_A_Vector"

        # GraphRAG
        graphrag_df = old_df[old_df["scenario"] == "Baseline_B_Graph"].copy()
        for col in ["novelty_score", "causal_score", "action_score", "final_score"]:
            graphrag_df[col] = (graphrag_df[col] - 1) * 2.0 + 1
        graphrag_df["scenario"] = "Baseline_B_Graph"

        combined_dfs.append(vector_df)
        combined_dfs.append(graphrag_df)
        print(
            f"✅ Added {len(vector_df)} Vector and {len(graphrag_df)} GraphRAG baseline points."
        )
    except Exception as e:
        print(f"⚠️ Could not load old baselines: {e}")

    # 2. New DRR Breakthrough Results (rerun_improved_results.csv)
    df_new = pd.concat(combined_dfs, ignore_index=True)
    df_new.to_csv(dense_file, index=False)
    print(f"✅ Created: {dense_file} with {len(df_new)} rows.")
else:
    print(f"❌ Error: {improved_file} not found.")
