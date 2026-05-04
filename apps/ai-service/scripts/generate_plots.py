import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import os

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "../drr_benchmark_results.csv")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load Data
df = pd.read_csv(CSV_PATH)

# Clean Data: Fill 0s for failures if they are NaNs
df["causality"] = pd.to_numeric(df["causality"], errors="coerce").fillna(0)
df["actionability"] = pd.to_numeric(df["actionability"], errors="coerce").fillna(0)
df["novelty"] = pd.to_numeric(df["novelty"], errors="coerce").fillna(0)

# 1. Performance Bar Chart (Causal vs Actionability)
plt.figure(figsize=(10, 6))
x = np.arange(len(df["id"]))
width = 0.35

plt.bar(x - width / 2, df["causality"], width, label="Causal Clarity", color="#4A90E2")
plt.bar(
    x + width / 2, df["actionability"], width, label="Actionability", color="#50E3C2"
)

plt.ylabel("Score (1-5)")
plt.title("DRR Framework Performance Across 10 Engineering Domains")
plt.xticks(x, df["id"])
plt.ylim(0, 5.5)
plt.legend()
plt.grid(axis="y", linestyle="--", alpha=0.7)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "performance_comparison.png"), dpi=300)
plt.close()

# 2. Performance Degradation (The "Barrier")
# Determine failures based on score < 2
df["status"] = df.apply(
    lambda r: (
        "Successful Transfer" if r["causality"] > 2 else "Ultra-Divergence Barrier"
    ),
    axis=1,
)

plt.figure(figsize=(8, 5))
sns.countplot(data=df, x="status", palette=["#50E3C2", "#FF6B6B"])
plt.title("System Reliability & Divergence Barrier Frequency")
plt.ylabel("Count")
plt.xlabel("")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "barrier_stats.png"), dpi=300)
plt.close()

# 3. Correlation Scatter Plot
plt.figure(figsize=(8, 6))
sns.regplot(
    data=df[df["causality"] > 0],
    x="causality",
    y="actionability",
    scatter_kws={"alpha": 0.6, "s": 100},
    line_kws={"color": "#4A90E2"},
)
plt.title("Correlation: Causal Clarity vs. Engineering Actionability")
plt.grid(True, linestyle=":", alpha=0.6)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "correlation_analysis.png"), dpi=300)
plt.close()

print(f"Figures saved to {OUTPUT_DIR}/")
