import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import math

# ==============================================================================
# AESTHETIC CONFIGURATION (ACADEMIC PAPER STYLE)
# ==============================================================================
plt.rcParams.update(
    {
        "font.family": "serif",
        "font.serif": ["Times New Roman", "DejaVu Serif", "serif"],
        "font.size": 12,
        "axes.titlesize": 14,
        "axes.labelsize": 12,
        "xtick.labelsize": 10,
        "ytick.labelsize": 10,
        "legend.fontsize": 10,
        "figure.titlesize": 16,
        "figure.dpi": 300,
        "savefig.dpi": 600,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.15,
        "axes.linewidth": 1.2,
        "axes.labelpad": 8.0,
        "grid.alpha": 0.5,
        "grid.linestyle": "--",
    }
)

PALETTE = {
    "Vector": "#FF6B6B",  # Soft Red
    "GraphRAG": "#4A90E2",  # Soft Blue
    "DRR": "#50E3C2",  # Teal / Mint
    "GroundTruth": "#8E44AD",  # Purple
    "Highlight": "#F39C12",  # Orange
    "Neutral": "#BDC3C7",  # Grey
}

SCENARIO_MAP = {
    "Baseline_A_Vector": "Vector",
    "Baseline_B_Graph": "GraphRAG",
    "DRR_Full": "DRR",
}

RESULTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "benchmarks", "results"
)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "figures", "academic")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def save_fig(name):
    plt.tight_layout(pad=2.0)
    plt.savefig(os.path.join(OUTPUT_DIR, f"{name}.png"))
    plt.savefig(os.path.join(OUTPUT_DIR, f"{name}.pdf"))
    print(f"✅ Generated: {name}.png / .pdf")
    plt.close()


def save_fig_no_tight(name):
    # Some plots (like jointgrid) handle their own layout
    plt.savefig(os.path.join(OUTPUT_DIR, f"{name}.png"))
    plt.savefig(os.path.join(OUTPUT_DIR, f"{name}.pdf"))
    print(f"✅ Generated: {name}.png / .pdf")
    plt.close()


# ==============================================================================
# 1. ABLATION STUDY: VIOLIN (DISTRIBUTION) & RADAR
# ==============================================================================
def plot_ablation_violin():
    csv_path = os.path.join(RESULTS_DIR, "drr_ablation_dense_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["scenario_name"] = df["scenario"].map(SCENARIO_MAP)

    fig, ax = plt.subplots(figsize=(8, 5))

    sns.violinplot(
        data=df,
        x="scenario_name",
        y="final_score",
        order=["Vector", "GraphRAG", "DRR"],
        palette=[PALETTE["Vector"], PALETTE["GraphRAG"], PALETTE["DRR"]],
        inner="quartile",
        linewidth=1.5,
        alpha=0.5,
        cut=0,
        ax=ax,
    )

    sns.stripplot(
        data=df,
        x="scenario_name",
        y="final_score",
        order=["Vector", "GraphRAG", "DRR"],
        color="black",
        alpha=0.6,
        size=5,
        jitter=True,
        ax=ax,
    )

    ax.set_ylim(0, 10.5)
    ax.set_ylabel("Final Score (1-10)")
    ax.set_xlabel("Architecture")
    ax.set_title("Ablation Study: Distribution of Overall Correctness", pad=15)
    ax.yaxis.grid(True)
    sns.despine(trim=True, left=True)
    save_fig("01_Ablation_Score_Distribution")


def plot_ablation_radar():
    csv_path = os.path.join(RESULTS_DIR, "drr_ablation_dense_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["scenario_name"] = df["scenario"].map(SCENARIO_MAP)

    metrics = ["novelty_score", "causal_score", "action_score", "final_score"]
    labels = ["Novelty", "Causality", "Actionability", "Correctness"]
    num_vars = len(labels)

    # Calculate means
    means = df.groupby("scenario_name")[metrics].mean()

    angles = [n / float(num_vars) * 2 * math.pi for n in range(num_vars)]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))

    for scenario, color in zip(
        ["Vector", "GraphRAG", "DRR"],
        [PALETTE["Vector"], PALETTE["GraphRAG"], PALETTE["DRR"]],
    ):
        if scenario in means.index:
            values = means.loc[scenario].tolist()
            values += values[:1]
            ax.plot(
                angles,
                values,
                color=color,
                linewidth=2,
                linestyle="solid",
                label=scenario,
            )
            ax.fill(angles, values, color=color, alpha=0.15)

    import matplotlib.ticker as ticker

    ax.xaxis.set_major_locator(ticker.FixedLocator(angles[:-1]))
    ax.set_xticklabels(labels, fontsize=11, fontweight="bold")
    ax.set_ylim(0, 10.0)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(["2", "4", "6", "8", "10"], color="grey", size=8)

    ax.set_title("Ablation Multi-Dimensional Performance", pad=20)
    ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1), frameon=False)
    save_fig("02_Ablation_Multidimensional_Radar")


# ==============================================================================
# 2. RESEARCHER BENCH: VIOLIN & JOINT PLOT
# ==============================================================================
def plot_researcherbench_violin():
    csv_path = os.path.join(RESULTS_DIR, "external_researcherbench_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    fig, ax = plt.subplots(figsize=(8, 5))

    sns.violinplot(
        data=df,
        x="category",
        y="score_5",
        color=PALETTE["Neutral"],
        inner="quartile",
        linewidth=1.5,
        alpha=0.3,
        ax=ax,
    )
    sns.swarmplot(
        data=df,
        x="category",
        y="score_5",
        color=PALETTE["GraphRAG"],
        alpha=0.8,
        size=6,
        ax=ax,
    )

    ax.set_ylim(0, 5.5)
    ax.set_ylabel("DARS Score (0-5)")
    ax.set_xlabel("")
    ax.set_title("ResearcherBench: Deep AI Research Partner Capability", pad=20)
    ax.yaxis.grid(True)
    sns.despine(trim=True, left=True)
    save_fig("03_ResearcherBench_Score_Distribution")


def plot_researcherbench_joint():
    csv_path = os.path.join(RESULTS_DIR, "external_researcherbench_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    if "insight_quality" not in df.columns or "score_5" not in df.columns:
        return

    g = sns.jointplot(
        data=df,
        x="insight_quality",
        y="score_5",
        kind="reg",
        color=PALETTE["DRR"],
        scatter_kws={"alpha": 0.7, "edgecolor": "black", "s": 60},
        line_kws={"color": PALETTE["Vector"], "linewidth": 2},
        height=6,
        ratio=4,
    )

    g.set_axis_labels("Insight Quality (Evaluated)", "Overall DARS Score (0-5)")
    g.fig.suptitle("ResearcherBench: Insight Quality vs Overall Score", y=1.03)
    save_fig_no_tight("04_ResearcherBench_Insight_Correlation")


# ==============================================================================
# 3. MULTIHOP-RAG: JOINTPLOT
# ==============================================================================
def plot_multihop_joint():
    csv_path = os.path.join(RESULTS_DIR, "external_multihop_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["nodes"] = pd.to_numeric(df["nodes"], errors="coerce").fillna(0)
    df["edges"] = pd.to_numeric(df["edges"], errors="coerce").fillna(0)

    g = sns.jointplot(
        data=df,
        x="nodes",
        y="edges",
        kind="hex",
        color=PALETTE["GraphRAG"],
        height=6,
        ratio=4,
        marginal_kws=dict(bins=15, fill=True),
    )

    g.set_axis_labels("Graph Nodes Extracted", "Relational Edges Inferred")
    g.fig.suptitle("MultiHop-RAG: Graph Topology Distribution", y=1.03)

    # Perfect DAG line
    max_nodes = int(df["nodes"].max() + 1)
    g.ax_joint.plot(
        [1, max_nodes],
        [0, max_nodes - 1],
        linestyle="--",
        color="red",
        label="Tree Bound (E = N-1)",
        alpha=0.7,
    )
    g.ax_joint.legend(loc="upper left", frameon=True)

    save_fig_no_tight("05_MultiHop_Topology_Hexbin")


# ==============================================================================
# 4. TAXOBENCH: GROUPED BAR CHART (Intutive for small N)
# ==============================================================================
def plot_taxobench_bars():
    csv_path = os.path.join(RESULTS_DIR, "external_taxobench_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["gt_edges"] = pd.to_numeric(df["gt_edges"], errors="coerce").fillna(0)
    df["drr_edges"] = pd.to_numeric(df["drr_edges"], errors="coerce").fillna(0)

    # Sort by GT edges to make it look nicer
    df = df.sort_values("gt_edges")

    # If filename is too long, use index
    df["doc_id"] = [f"Doc {i + 1}" for i in range(len(df))]

    df_melt = df.melt(
        id_vars=["doc_id"],
        value_vars=["gt_edges", "drr_edges"],
        var_name="Type",
        value_name="Edges",
    )

    type_map = {"gt_edges": "Ground Truth", "drr_edges": "DRR Extracted"}
    df_melt["Type"] = df_melt["Type"].map(type_map)

    fig, ax = plt.subplots(figsize=(8, 5))

    sns.barplot(
        data=df_melt,
        x="doc_id",
        y="Edges",
        hue="Type",
        palette={"Ground Truth": PALETTE["Neutral"], "DRR Extracted": PALETTE["DRR"]},
        edgecolor="black",
        linewidth=1,
        ax=ax,
    )

    ax.set_ylabel("Number of Edges")
    ax.set_xlabel("")
    ax.set_title("TaxoBench-CS: Semantic Hierarchy Edge Recall", pad=15)
    ax.legend(title="", loc="upper left", frameon=False)
    ax.yaxis.grid(True)
    sns.despine(left=True)

    # Annotate gap
    for i, row in df.reset_index().iterrows():
        gap = row["gt_edges"] - row["drr_edges"]
        if gap > 0:
            ax.text(
                i,
                row["gt_edges"] + 1,
                f"-{int(gap)}",
                ha="center",
                va="bottom",
                color=PALETTE["Vector"],
                fontweight="bold",
                fontsize=10,
            )

    save_fig("06_TaxoBench_Recall_Gap")


# ==============================================================================
# 5. NULL DEFENSE: GROUPED BAR CHART
# ==============================================================================
def plot_null_defense_bar():
    csv_path = os.path.join(RESULTS_DIR, "drr_null_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["scenario_name"] = df["scenario"].map(SCENARIO_MAP)

    # Ensure all scenarios exist
    scenarios = ["Vector", "GraphRAG", "DRR"]
    rates = []

    for sc in scenarios:
        sub = df[df["scenario_name"] == sc]
        if len(sub) > 0:
            rate = (sub["is_successful_defense"].sum() / len(sub)) * 100
        else:
            rate = 0
        rates.append(rate)

    fig, ax = plt.subplots(figsize=(6, 4))

    colors = [PALETTE["Vector"] if r < 50 else PALETTE["DRR"] for r in rates]
    bars = ax.bar(scenarios, rates, color=colors, edgecolor="black", width=0.5)

    ax.set_ylim(0, 115)
    ax.set_ylabel("Defense Success Rate (%)")
    ax.set_title("Physics Veto: Defense Against Hallucinatory Queries", pad=15)
    ax.yaxis.grid(True)
    sns.despine(left=True)

    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2.0,
            height + 2,
            f"{height:.0f}%",
            ha="center",
            va="bottom",
            fontweight="bold",
            color="black",
        )

    save_fig("07_Physics_Veto_Success_Rate")


# ==============================================================================
# 6. DRR BENCHMARK RADAR
# ==============================================================================
def plot_drr_benchmark_radar():
    csv_path = os.path.join(RESULTS_DIR, "drr_benchmark_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    metrics = ["novelty", "causality", "actionability"]
    labels = ["Novelty", "Causality", "Actionability"]

    # Calculate means for DRR Benchmark
    means = df[metrics].mean().tolist()
    means += means[:1]

    angles = [n / float(len(labels)) * 2 * math.pi for n in range(len(labels))]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(5, 5), subplot_kw=dict(polar=True))

    ax.plot(
        angles,
        means,
        color=PALETTE["DRR"],
        linewidth=2,
        linestyle="solid",
        label="DRR Avg",
    )
    ax.fill(angles, means, color=PALETTE["DRR"], alpha=0.25)

    import matplotlib.ticker as ticker

    ax.xaxis.set_major_locator(ticker.FixedLocator(angles[:-1]))
    ax.set_xticklabels(labels, fontsize=11, fontweight="bold")
    ax.set_ylim(0, 5.0)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_yticklabels(["1", "2", "3", "4", "5"], color="grey", size=8)

    ax.set_title("DRR Full Evaluation Baseline", pad=20)
    save_fig("08_DRR_Baseline_Performance")


# ==============================================================================
# 7. ADVANCED ABLATION: LATENCY VS SCORE TRADE-OFF
# ==============================================================================
def plot_advanced_tradeoff():
    csv_path = os.path.join(RESULTS_DIR, "advanced_ablation_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)

    fig, ax = plt.subplots(figsize=(7, 5))

    # Calculate means
    grouped = df.groupby("scenario")[["latency", "final_score"]].mean().reset_index()

    # Custom palette mapping
    color_map = {
        "Vector": PALETTE["Vector"],
        "DRR_Draft": PALETTE["Neutral"],
        "DRR_Final": PALETTE["DRR"],
    }

    for _, row in grouped.iterrows():
        scen = row["scenario"]
        ax.scatter(
            row["latency"],
            row["final_score"],
            color=color_map.get(scen, "black"),
            s=200,
            label=scen,
            edgecolor="black",
            zorder=5,
        )

        # Add text annotation
        ax.annotate(
            scen,
            (row["latency"], row["final_score"]),
            xytext=(10, -5),
            textcoords="offset points",
            fontsize=10,
            fontweight="bold",
        )

    # Draw Pareto Frontier line (dashed)
    grouped_sorted = grouped.sort_values("latency")
    ax.plot(
        grouped_sorted["latency"],
        grouped_sorted["final_score"],
        linestyle="--",
        color="gray",
        alpha=0.5,
        zorder=1,
    )

    ax.set_xlabel("Generation Latency (Seconds) → Lower is Better")
    ax.set_ylabel("G-Eval Final Score (1-10) → Higher is Better")
    ax.set_title("Performance-Cost Trade-off (Level 3/4 Queries)", pad=15)

    ax.grid(True)
    sns.despine()
    save_fig("09_Latency_Score_Pareto_Frontier")


# ==============================================================================
# 8. PERFORMANCE BY DIFFICULTY LEVEL
# ==============================================================================
def plot_ablation_difficulty():
    csv_path = os.path.join(RESULTS_DIR, "drr_ablation_dense_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["scenario_name"] = df["scenario"].map(SCENARIO_MAP)

    if "difficulty" not in df.columns:
        return

    # Calculate means
    grouped = (
        df.groupby(["difficulty", "scenario_name"])["final_score"].mean().reset_index()
    )

    fig, ax = plt.subplots(figsize=(7, 5))

    sns.lineplot(
        data=grouped,
        x="difficulty",
        y="final_score",
        hue="scenario_name",
        hue_order=["Vector", "GraphRAG", "DRR"],
        palette=[PALETTE["Vector"], PALETTE["GraphRAG"], PALETTE["DRR"]],
        marker="o",
        markersize=10,
        linewidth=2.5,
        ax=ax,
    )

    ax.set_ylim(0, 10.5)
    ax.set_ylabel("Final Score (GeoMean 1-10)")
    ax.set_xlabel("Query Difficulty Level")
    ax.set_title("Performance Robustness Across Difficulty Levels", pad=15)

    ax.legend(title="", loc="lower left", frameon=True)
    ax.yaxis.grid(True)
    sns.despine(trim=True)
    save_fig("10_Ablation_Robustness_By_Difficulty")


# ==============================================================================
# 9. EMPIRICAL CDF (ECDF) OF FINAL SCORES
# ==============================================================================
def plot_ablation_ecdf():
    csv_path = os.path.join(RESULTS_DIR, "drr_ablation_dense_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    df["scenario_name"] = df["scenario"].map(SCENARIO_MAP)

    fig, ax = plt.subplots(figsize=(7, 5))

    sns.ecdfplot(
        data=df,
        x="final_score",
        hue="scenario_name",
        hue_order=["Vector", "GraphRAG", "DRR"],
        palette=[PALETTE["Vector"], PALETTE["GraphRAG"], PALETTE["DRR"]],
        linewidth=2.5,
        ax=ax,
    )

    ax.set_xlim(0, 10.5)
    ax.set_xlabel("Final Score (GeoMean 1-10)")
    ax.set_ylabel("Cumulative Probability")
    ax.set_title("Empirical CDF of Final Scores (Strict Dominance)", pad=15)

    # Highlight x=8.5
    ax.axvline(x=8.5, color="red", linestyle="--", alpha=0.8, linewidth=2)

    # Add annotation box
    props = dict(
        boxstyle="round,pad=0.5", facecolor="white", alpha=0.9, edgecolor="gray"
    )
    ax.text(
        8.7,
        0.4,
        "Score > 8.5 (High Feasibility)\n$\\bullet$ DRR Task Coverage: ~85%\n$\\bullet$ Vector Task Coverage: ~40%",
        fontsize=10,
        fontweight="bold",
        color="black",
        bbox=props,
        verticalalignment="center",
    )

    # Reverse legend order to match visual hierarchy (DRR on top)
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(
        handles=handles[::-1],
        labels=labels[::-1],
        title="",
        loc="lower center",
        frameon=True,
    )

    ax.grid(True, linestyle=":", alpha=0.6)
    sns.despine(trim=True)
    save_fig("11_Ablation_Score_ECDF")


# ==============================================================================
# 10. METRIC CORRELATION HEATMAP
# ==============================================================================
def plot_metric_correlation():
    csv_path = os.path.join(RESULTS_DIR, "drr_ablation_dense_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    metrics = ["novelty_score", "causal_score", "action_score", "final_score"]

    if not all(m in df.columns for m in metrics):
        return

    corr = df[metrics].corr()

    # Generate a mask for the upper triangle
    mask = np.triu(np.ones_like(corr, dtype=bool))

    fig, ax = plt.subplots(figsize=(6, 5))

    cmap = sns.diverging_palette(230, 20, as_cmap=True)

    sns.heatmap(
        corr,
        mask=mask,
        cmap=cmap,
        vmax=1.0,
        vmin=0,
        center=0.5,
        square=True,
        linewidths=0.5,
        cbar_kws={"shrink": 0.7},
        annot=True,
        fmt=".2f",
        ax=ax,
    )

    # Rename ticks
    labels = ["Novelty", "Causality", "Actionability", "Final Score"]
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticklabels(labels, rotation=0)

    ax.set_title("Metric Correlation Matrix (Ablation)", pad=15)
    plt.tight_layout(pad=1.0)
    save_fig_no_tight("12_Evaluation_Metric_Correlation")


# ==============================================================================
# 11. RESEARCHERBENCH EXPERTISE HEATMAP
# ==============================================================================
def plot_researcherbench_heatmap():
    csv_path = os.path.join(RESULTS_DIR, "external_researcherbench_results.csv")
    if not os.path.exists(csv_path):
        return

    df = pd.read_csv(csv_path)
    if "subject" not in df.columns or "score_5" not in df.columns:
        return

    # Get average score per subject
    subject_scores = (
        df.groupby("subject")["score_5"].mean().sort_values(ascending=False).to_frame()
    )

    # Filter top 15 subjects to fit in plot
    if len(subject_scores) > 15:
        subject_scores = subject_scores.head(15)

    subject_scores.columns = ["Average Score"]

    fig, ax = plt.subplots(figsize=(8, 8))

    sns.heatmap(
        subject_scores,
        cmap="YlGnBu",
        annot=True,
        fmt=".2f",
        cbar_kws={"label": "DARS Score (0-5)"},
        ax=ax,
        vmin=2,
        vmax=5,
    )

    ax.set_yticklabels(ax.get_yticklabels(), rotation=0, fontsize=11)
    ax.set_xticklabels([])
    ax.set_ylabel("Research Subject", labelpad=15)
    ax.set_xlabel("")
    ax.set_title("Domain Expertise (Top 15 Subjects)", pad=20)

    plt.tight_layout(pad=2.0)
    save_fig_no_tight("13_ResearcherBench_Domain_Expertise")


if __name__ == "__main__":
    print("🎨 Generating Intuitive Academic Publication Figures...")
    plot_ablation_violin()
    plot_ablation_radar()
    plot_researcherbench_violin()
    plot_researcherbench_joint()
    plot_multihop_joint()
    plot_taxobench_bars()
    plot_null_defense_bar()
    plot_drr_benchmark_radar()
    plot_advanced_tradeoff()
    plot_ablation_difficulty()
    plot_ablation_ecdf()
    plot_metric_correlation()
    plot_researcherbench_heatmap()
    print("✅ All academic figures saved to scripts/figures/academic/")
