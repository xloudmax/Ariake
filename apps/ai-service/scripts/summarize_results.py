import pandas as pd

df = pd.read_csv("benchmarks/results/external_researcherbench_results.csv")
print(f"Total Queries: {len(df)}")
print(f"Mean Score: {df['score_5'].mean():.2f}")
print("\nCategory Statistics:")
print(df.groupby("category")["score_5"].mean().to_string())
print("\nExample High Performers (Score=5.0):")
print(
    df[df["score_5"] >= 4.5][["id", "subject", "score_5"]]
    .head(10)
    .to_string(index=False)
)
