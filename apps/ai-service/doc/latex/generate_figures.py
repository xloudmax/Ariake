#!/usr/bin/env python3
"""
Generate all academic figures for the DRR LaTeX manuscript.
Optimized for high-end academic publishing (ACM/IEEE).
Features: Colorblind compliance, texture hatching, explicit text safety zones.
"""

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Global Advanced Academic Style ────────────────────
plt.style.use("default")
plt.rcParams.update(
    {
        "font.family": "serif",
        "font.size": 10,
        "axes.labelsize": 10,
        "axes.titlesize": 12,
        "axes.titleweight": "bold",
        "legend.fontsize": 9,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "figure.dpi": 300,
        # Text safety regions (padding)
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.15,
        "axes.linewidth": 1.0,
        "patch.linewidth": 0.7,
    }
)

# Color palette: Colorblind friendly + elegant
# Standardized across scientific publications
C_VECTOR = "#D55E00"  # Vermillion (weak baseline, danger)
C_GRAPH = "#56B4E9"  # Sky Blue (GraphRAG)
C_DRR = "#009E73"  # Bluish Green (DRR, success)
C_ACCENT = "#CC79A7"  # Reddish Purple (Highlights)

# Hatch patterns for B&W print accessibility
H_VECTOR = "///"
H_GRAPH = "\\\\\\\\"
H_DRR = "xxx"


# ══════════════════════════════════════════════════════════
# Figure 1: Ablation Study – Grouped Bar Chart (Advanced)
# ══════════════════════════════════════════════════════════
def fig1_ablation_bar():
    labels = ["Novelty", "Causality", "Actionability", "Depth", "G-Eval Result"]
    # N=70 Final Data
    vector = [2.0, 2.16, 2.16, 2.0, 2.08]
    graphrag = [1.93, 2.26, 2.26, 2.1, 2.13]
    drr = [1.93, 2.26, 2.26, 2.1, 2.13]

    x = np.arange(len(labels))
    width = 0.25  # Slightly wider for better hatching visibility

    fig, ax = plt.subplots(figsize=(5.0, 3.2))

    # Add light grid behind bars
    ax.grid(axis="y", color="gray", alpha=0.2, linestyle="-", linewidth=0.5, zorder=0)

    # Bars with hatching (zorder=3 to be in front of grid)
    bars1 = ax.bar(
        x - width,
        vector,
        width,
        label="Baseline A (Vector)",
        color=C_VECTOR,
        edgecolor="black",
        hatch=H_VECTOR,
        zorder=3,
    )
    bars2 = ax.bar(
        x,
        graphrag,
        width,
        label="Baseline B (GraphRAG)",
        color=C_GRAPH,
        edgecolor="black",
        hatch=H_GRAPH,
        zorder=3,
    )
    bars3 = ax.bar(
        x + width,
        drr,
        width,
        label="DRR (Ours)",
        color=C_DRR,
        edgecolor="black",
        hatch=H_DRR,
        zorder=3,
    )

    # High-contrast value labels with white outline for readability
    import matplotlib.patheffects as path_effects

    # Use index to stagger same-height bars in a group
    for i, bars_group in enumerate([bars1, bars2, bars3]):
        for j, bar in enumerate(bars_group):
            h = bar.get_height()

            # Stagger logic: If height is close to previous bar in the same category group, shift it up
            v_offset = 4
            if i == 1:  # Group 2 (GraphRAG)
                if abs(h - bars1[j].get_height()) < 0.05:
                    v_offset = 14
            elif i == 2:  # Group 3 (DRR)
                # If all three are same, push third one even higher
                if abs(h - bars2[j].get_height()) < 0.05:
                    v_offset = 24 if abs(h - bars1[j].get_height()) < 0.05 else 14

            txt = ax.annotate(
                f"{h:.2f}",
                xy=(bar.get_x() + bar.get_width() / 2, h),
                xytext=(0, v_offset),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=7,
                fontweight="bold",
            )
            txt.set_path_effects(
                [path_effects.withStroke(linewidth=2.5, foreground="white")]
            )

    ax.set_ylabel("Rubric Score (1–5)")
    ax.set_title("Biomimetic-Bench V2 Core Ablation", pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontweight="medium")

    # Text Safe Zone: ylim up to 6.3 to prevent legend/text clipping
    ax.set_ylim(0, 6.3)
    ax.yaxis.set_major_locator(ticker.MultipleLocator(1))

    # Move legend above the plot to avoid all label occlusions
    legend = ax.legend(
        loc="upper center",
        bbox_to_anchor=(0.5, 1.28),
        ncol=3,
        framealpha=1.0,
        edgecolor="black",
        fontsize=7,
        fancybox=False,
    )
    legend.get_frame().set_linewidth(0.8)

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    fig.savefig(os.path.join(OUTPUT_DIR, "fig1_ablation.pdf"))
    fig.savefig(os.path.join(OUTPUT_DIR, "fig1_ablation.png"))
    plt.close(fig)
    print("✅ Figure 1: Advanced Ablation bar chart saved.")


# ══════════════════════════════════════════════════════════
# Figure 2: Physics Veto Comparison (Horizontal Stacked)
# ══════════════════════════════════════════════════════════
def fig2_physics_veto():
    configs = ["Baseline A\n(Vector)", "Baseline B\n(GraphRAG)", "DRR\n(Ours)"][::-1]
    passed = [9, 10, 10][::-1]
    vetoed = [1, 0, 0][::-1]

    fig, ax = plt.subplots(figsize=(4.5, 2.0))
    y = np.arange(len(configs))
    height = 0.5

    # Horizontal bars feel more modern for discrete counts
    ax.barh(
        y,
        passed,
        height,
        label="Passed Physics Check",
        color=C_DRR,
        edgecolor="black",
        zorder=3,
    )
    ax.barh(
        y,
        vetoed,
        height,
        left=passed,
        label="Physics Veto (Failure)",
        color=C_VECTOR,
        edgecolor="black",
        hatch="////",
        zorder=3,
    )

    # Annotation inside bars
    for i, (p, v) in enumerate(zip(passed, vetoed)):
        ax.text(
            p / 2,
            i,
            f"{p}",
            ha="center",
            va="center",
            fontweight="bold",
            color="white",
            fontsize=10,
            zorder=4,
        )
        if v > 0:
            ax.text(
                p + v / 2,
                i,
                f"{v}",
                ha="center",
                va="center",
                fontweight="bold",
                color="white",
                fontsize=10,
                zorder=4,
            )

    ax.set_xlabel("Number of Queries (N=10)")
    ax.set_title("Absolute Physics Violation Frequency", pad=15)
    ax.set_yticks(y)
    ax.set_yticklabels(configs)

    # Safety zone for X axis
    ax.set_xlim(0, 11)
    ax.xaxis.set_major_locator(ticker.MultipleLocator(2))

    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.4), ncol=2, frameon=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Vertical grid for easier reading
    ax.grid(axis="x", color="gray", alpha=0.2, linestyle="--")

    fig.savefig(os.path.join(OUTPUT_DIR, "fig2_physics_veto.pdf"))
    fig.savefig(os.path.join(OUTPUT_DIR, "fig2_physics_veto.png"))
    plt.close(fig)
    print("✅ Figure 2: Advanced Physics Veto stacked chart saved.")


# ══════════════════════════════════════════════════════════
# Figure 3: SOTA Benchmark Radar Chart (Polished)
# ══════════════════════════════════════════════════════════
def fig3_sota_radar():
    categories = [
        "TaxoBench-CS\n(Topology)",
        "MultiHop-RAG\n(Abstention)",
        "ResearcherBench\n(AI Insight)",
        "Biomimetic-Bench\n(Convergence)",
        "Physics Safety\n(Zero Veto)",
    ]
    # Normalize all to 0-1 scale
    drr_scores = [0.571, 1.0, 4.64 / 5, 3.82 / 5, 1.0]
    baseline_scores = [0.30, 0.33, 2.5 / 5, 3.02 / 5, 0.9]

    N = len(categories)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    angles += angles[:1]
    drr_scores += drr_scores[:1]
    baseline_scores += baseline_scores[:1]

    fig, ax = plt.subplots(figsize=(5.0, 4.5), subplot_kw=dict(polar=True))
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)

    # Thinner grid, more elegant
    ax.grid(color="gray", alpha=0.3, linestyle="-", linewidth=0.5)

    # Plot DRR
    ax.plot(angles, drr_scores, "o-", linewidth=2.5, label="DRR (Ours)", color=C_DRR)
    ax.fill(angles, drr_scores, alpha=0.2, color=C_DRR)

    # Plot Baseline
    ax.plot(
        angles,
        baseline_scores,
        "s--",
        linewidth=2.0,
        label="Baseline A",
        color=C_VECTOR,
    )
    ax.fill(angles, baseline_scores, alpha=0.1, color=C_VECTOR)

    ax.set_xticks(angles[:-1])
    # Give padding to tick labels so they don't overlap the plot
    ax.set_xticklabels(categories, fontsize=9, fontweight="medium")
    ax.tick_params(axis="x", pad=15)

    ax.set_ylim(0, 1.1)
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_yticklabels(["0.2", "0.4", "0.6", "0.8", "1.0"], fontsize=7, color="gray")
    ax.spines["polar"].set_color("gray")
    ax.spines["polar"].set_alpha(0.5)

    ax.legend(
        loc="lower center",
        bbox_to_anchor=(0.5, -0.2),
        ncol=2,
        frameon=False,
        fontsize=10,
    )
    ax.set_title("Cross-Domain Generalization Profile", pad=30)

    fig.savefig(os.path.join(OUTPUT_DIR, "fig3_radar.pdf"))
    fig.savefig(os.path.join(OUTPUT_DIR, "fig3_radar.png"))
    plt.close(fig)
    print("✅ Figure 3: Advanced SOTA Radar chart saved.")


# ══════════════════════════════════════════════════════════
# Figure 4: ResearcherBench Rubric Scores
# ══════════════════════════════════════════════════════════
def fig4_researcherbench():
    dims = ["Factuality", "Depth", "Novelty"]
    scores = [4, 5, 5]

    # Consistent colorblind friendly gradient
    colors = [C_GRAPH, C_DRR, C_ACCENT]

    fig, ax = plt.subplots(figsize=(4.5, 2.5))

    # Grid in background
    ax.grid(axis="x", color="gray", alpha=0.2, linestyle="--", zorder=0)

    bars = ax.barh(
        dims,
        scores,
        color=colors,
        edgecolor="black",
        linewidth=0.8,
        height=0.5,
        zorder=3,
    )

    for bar, score in zip(bars, scores):
        ax.text(
            bar.get_width() - 0.15,
            bar.get_y() + bar.get_height() / 2,
            f"{score}/5",
            va="center",
            ha="right",
            fontweight="bold",
            fontsize=11,
            color="white",
            zorder=4,
        )

    # Safe text region
    ax.set_xlim(0, 5.5)
    ax.set_xlabel("ResearcherBench Score (1–5)", fontweight="medium")
    ax.set_title("Frontier Ideation: SCARM Architecture Evaluation", pad=15)
    ax.xaxis.set_major_locator(ticker.MultipleLocator(1))
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Add GeoMean annotation with properly anchored text to prevent exploding bounding box
    geo = (4 * 5 * 5) ** (1 / 3)
    ax.axvline(x=geo, color=C_VECTOR, linestyle=":", linewidth=2, zorder=5)

    # Text uses data transform for X, and axes transform for Y (0 to 1).
    # To be extremely safe with tight_layout, we use purely data coordinates.
    # Y=1 is the middle bar ('Depth')
    import matplotlib.patheffects as path_effects

    txt = ax.text(
        geo + 0.1,
        1.0,
        f"GeoMean\n{geo:.2f}",
        fontsize=9,
        color=C_VECTOR,
        fontweight="bold",
        va="center",
        zorder=6,
    )
    txt.set_path_effects([path_effects.withStroke(linewidth=3, foreground="white")])

    fig.savefig(os.path.join(OUTPUT_DIR, "fig4_researcherbench.pdf"))
    fig.savefig(os.path.join(OUTPUT_DIR, "fig4_researcherbench.png"))
    plt.close(fig)
    print("✅ Figure 4: Advanced ResearcherBench rubric chart saved.")


# ══════════════════════════════════════════════════════════
# Figure 5: Per-Query Domain Heatmap
# ══════════════════════════════════════════════════════════
def fig5_domain_heatmap():
    domains = [
        "Q1\nAero",
        "Q2\nWater",
        "Q3\nRobot",
        "Q4\nSolar",
        "Q5\nNoise",
        "Q6\nWind",
        "Q7\nMedic",
        "Q8\nCrash",
        "Q9\nTextile",
        "Q10\nCamo",
    ]
    vector_q = [3.2, 2.5, 3.0, 3.4, 2.8, 2.0, 3.6, 3.0, 3.4, 2.3]
    graph_q = [4.0, 3.8, 4.0, 4.2, 3.6, 3.0, 4.2, 4.0, 4.0, 3.8]
    drr_q = [4.0, 4.0, 3.8, 4.2, 3.6, 2.8, 4.2, 4.0, 4.0, 3.6]

    data = np.array([vector_q, graph_q, drr_q])
    configs = ["Vector", "GraphRAG", "DRR"]

    fig, ax = plt.subplots(figsize=(6.5, 2.2))

    # 'viridis' is the academic standard for colorblind-friendly continuous data
    im = ax.imshow(data, cmap="viridis", aspect="auto", vmin=1.5, vmax=5)

    # Gridlines for explicit cell boundaries
    ax.set_xticks(np.arange(data.shape[1] + 1) - 0.5, minor=True)
    ax.set_yticks(np.arange(data.shape[0] + 1) - 0.5, minor=True)
    ax.grid(which="minor", color="white", linestyle="-", linewidth=2)
    ax.tick_params(which="minor", bottom=False, left=False)

    ax.set_xticks(np.arange(len(domains)))
    ax.set_xticklabels(domains, fontsize=8)
    ax.set_yticks(np.arange(len(configs)))
    ax.set_yticklabels(configs, fontsize=9, fontweight="medium")

    # Add text annotations with contrast awareness
    for i in range(len(configs)):
        for j in range(len(domains)):
            # In viridis, low values are dark purple (need white text), high are yellow (need black text)
            text_color = "white" if data[i, j] < 3.2 else "black"
            ax.text(
                j,
                i,
                f"{data[i, j]:.1f}",
                ha="center",
                va="center",
                fontsize=8,
                color=text_color,
                fontweight="bold",
            )

    # Shrink prevents the colorbar from being taller than the plot
    cbar = fig.colorbar(im, ax=ax, shrink=0.8, pad=0.03)
    cbar.set_label("GeoMean Score", fontsize=9)
    cbar.ax.tick_params(labelsize=8)

    ax.set_title("Per-Query Performance Heatmap Across Domains (N=10)", pad=12)

    fig.savefig(os.path.join(OUTPUT_DIR, "fig5_heatmap.pdf"))
    fig.savefig(os.path.join(OUTPUT_DIR, "fig5_heatmap.png"))
    plt.close(fig)
    print("✅ Figure 5: Advanced Domain heatmap saved.")


# ══════════════════════════════════════════════════════════
# Figure 6: Barrier Defense Rate (BDR) - Hallucination Defense
# ══════════════════════════════════════════════════════════
def fig6_barrier_defense_rate():
    """
    Visualize DRR's ability to reject impossible queries vs baselines.
    This stacked bar chart highlights 'Honest Rejection' vs 'Metaphorical Hallucination'.
    """
    labels = ["Vector Search\n(Baseline A)", "GraphRAG\n(Baseline B)", "DRR\n(Ours)"]
    # Empirical results from N=70 Null benchmark
    defense_rates = [0.0, 74.3, 74.3]
    hallucination_rates = [100.0, 25.7, 25.7]

    fig, ax = plt.subplots(figsize=(5.0, 4.0))

    width = 0.5
    # Success bars (Honest Rejection)
    bars_def = ax.bar(
        labels,
        defense_rates,
        color=C_DRR,
        label="Honest Rejection",
        edgecolor="black",
        hatch=H_DRR,
        width=width,
        zorder=3,
    )
    # Failure bars (Metaphorical Hallucination)
    bars_hal = ax.bar(
        labels,
        hallucination_rates,
        bottom=defense_rates,
        color="#ffcccc",
        label="Metaphorical Hallucination",
        edgecolor="black",
        hatch="\\\\",
        width=width,
        zorder=3,
    )

    # Add percentage labels for Defense
    for i, bar in enumerate(bars_def):
        h = bar.get_height()
        if h > 5:
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                h / 2,
                f"{h:.1f}%",
                ha="center",
                va="center",
                fontweight="bold",
                fontsize=9,
                color="white",
            )

    # Add percentage labels for Hallucination
    for i, bar in enumerate(bars_hal):
        h = bar.get_height()
        base = defense_rates[i]
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            base + h / 2,
            f"{h:.1f}%",
            ha="center",
            va="center",
            fontweight="bold",
            fontsize=9,
            color="#800000",
        )

    ax.set_ylabel("Query Outcome Distribution (%)")
    ax.set_title(
        'Cross-Domain "Honesty" Audit (N=70)', pad=20, fontsize=12, fontweight="bold"
    )
    ax.set_ylim(0, 100)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.15), ncol=2, frameon=False)

    # Remove top/right spines
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", linestyle=":", alpha=0.5, zorder=0)

    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, "fig6_barrier_stats.pdf"), bbox_inches="tight")
    fig.savefig(os.path.join(OUTPUT_DIR, "fig6_barrier_stats.png"), bbox_inches="tight")
    plt.close(fig)
    print("✅ Figure 6: Upgraded Barrier Defense Rate (Stacked) saved.")


# ══════════════════════════════════════════════════════════
# Run all
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("🎨 Generating Advanced Academic DRR Manuscript Figures...")
    fig1_ablation_bar()
    fig2_physics_veto()
    fig3_sota_radar()
    fig4_researcherbench()
    fig5_domain_heatmap()
    fig6_barrier_defense_rate()
    print(f"\n✅ All advanced figures saved to: {OUTPUT_DIR}")
