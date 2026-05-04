from __future__ import annotations

import csv
import json
import math
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[3]
FIGURES_DIR = ROOT / "doc" / "latex" / "figures"
QUERY_PATH = ROOT / "benchmarks" / "results" / "paper_core_benchmark_queries.json"
DRR_RESULTS = (
    ROOT
    / "benchmarks"
    / "runs"
    / "paper_core"
    / "paper_core_v2"
    / "corpus_v3_scale"
    / "DRR_Final"
    / "paper_core_v2_neutral"
    / "20260416T012528Z"
    / "results.csv"
)
ZERO_RESULTS = (
    ROOT
    / "benchmarks"
    / "runs"
    / "paper_core"
    / "paper_core_v2"
    / "corpus_v3_scale"
    / "Zero_Shot"
    / "paper_core_v2_neutral"
    / "20260414T154320Z"
    / "results.csv"
)

C_DRR = "#009E73"
C_ZERO = "#CC79A7"
C_GRID = "#BDBDBD"
GROUP_LABELS = {
    "anchor_engineering": "Anchor",
    "transfer_core": "Transfer",
    "exploratory": "Exploratory",
}


def apply_style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 8.5,
            "axes.labelsize": 8.5,
            "xtick.labelsize": 7.5,
            "ytick.labelsize": 7.5,
            "legend.fontsize": 7.5,
            "axes.linewidth": 0.8,
            "savefig.bbox": "tight",
            "savefig.pad_inches": 0.08,
            "figure.dpi": 300,
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def geometric_mean(values: list[float]) -> float:
    return math.exp(sum(math.log(v) for v in values) / len(values))


def row_geomean(row: dict[str, str]) -> float:
    return geometric_mean(
        [
            float(row["causality"]),
            float(row["actionability"]),
            float(row["novelty"]),
        ]
    )


def summarize(rows: list[dict[str, str]]) -> dict[str, float]:
    causality = float(np.mean([float(row["causality"]) for row in rows]))
    actionability = float(np.mean([float(row["actionability"]) for row in rows]))
    novelty = float(np.mean([float(row["novelty"]) for row in rows]))
    geomean = float(geometric_mean([causality, actionability, novelty]))
    return {
        "causality": causality,
        "actionability": actionability,
        "novelty": novelty,
        "geomean": geomean,
    }


def summarize_by_group(
    rows: list[dict[str, str]], group_map: dict[str, str]
) -> dict[str, dict[str, float]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[group_map.get(row["id"], "unknown")].append(row)
    return {group: summarize(group_rows) for group, group_rows in grouped.items()}


def save(fig: plt.Figure, stem: str) -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIGURES_DIR / f"{stem}.pdf")
    fig.savefig(FIGURES_DIR / f"{stem}.png", dpi=300)
    plt.close(fig)
    print(f"Saved {FIGURES_DIR / f'{stem}.pdf'}")


def plot_radar(drr: dict[str, float], zero: dict[str, float]) -> None:
    labels = ["Causality", "Actionability", "Novelty", "GeoMean"]
    keys = ["causality", "actionability", "novelty", "geomean"]
    angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(4.2, 3.65), subplot_kw={"polar": True})
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)
    ax.grid(color=C_GRID, alpha=0.45, linewidth=0.6)
    ax.set_ylim(0, 5)
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_yticklabels(["1", "2", "3", "4", "5"], color="gray", fontsize=7)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels)

    for name, summary, color in [
        ("Zero-Shot", zero, C_ZERO),
        ("DRR", drr, C_DRR),
    ]:
        values = [summary[key] for key in keys]
        values += values[:1]
        ax.plot(angles, values, linewidth=2.0, color=color, label=name)
        ax.fill(angles, values, color=color, alpha=0.16)

    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.25), ncol=2, frameon=False)
    save(fig, "paper_core_v2_ablation_radar")


def plot_pareto(
    drr: dict[str, float],
    zero: dict[str, float],
    drr_groups: dict[str, dict[str, float]],
    zero_groups: dict[str, dict[str, float]],
) -> None:
    fig, ax = plt.subplots(figsize=(4.65, 3.05))
    ax.grid(color=C_GRID, alpha=0.35, linewidth=0.6, linestyle="--", zorder=0)

    group_markers = {
        "anchor_engineering": "o",
        "transfer_core": "s",
        "exploratory": "^",
    }
    for group, marker in group_markers.items():
        if group not in drr_groups or group not in zero_groups:
            continue
        label = GROUP_LABELS[group]
        ax.scatter(
            zero_groups[group]["novelty"],
            zero_groups[group]["geomean"],
            s=42,
            marker=marker,
            color=C_ZERO,
            edgecolor="black",
            linewidth=0.55,
            alpha=0.55,
            zorder=2,
        )
        ax.scatter(
            drr_groups[group]["novelty"],
            drr_groups[group]["geomean"],
            s=48,
            marker=marker,
            color=C_DRR,
            edgecolor="black",
            linewidth=0.55,
            alpha=0.72,
            zorder=3,
        )
        ax.annotate(
            label,
            (drr_groups[group]["novelty"], drr_groups[group]["geomean"]),
            xytext=(5, 3),
            textcoords="offset points",
            fontsize=7.2,
        )

    ax.scatter(
        zero["novelty"],
        zero["geomean"],
        s=92,
        marker="D",
        color=C_ZERO,
        edgecolor="black",
        linewidth=0.7,
        label="Zero-Shot overall",
        zorder=4,
    )
    ax.scatter(
        drr["novelty"],
        drr["geomean"],
        s=108,
        marker="D",
        color=C_DRR,
        edgecolor="black",
        linewidth=0.7,
        label="DRR overall",
        zorder=5,
    )
    ax.annotate(
        "Zero-Shot",
        (zero["novelty"], zero["geomean"]),
        xytext=(-50, -12),
        textcoords="offset points",
        fontsize=8,
        fontweight="bold",
    )
    ax.annotate(
        "DRR",
        (drr["novelty"], drr["geomean"]),
        xytext=(8, 6),
        textcoords="offset points",
        fontsize=8,
        fontweight="bold",
    )
    ax.annotate(
        "",
        xy=(drr["novelty"], drr["geomean"]),
        xytext=(zero["novelty"], zero["geomean"]),
        arrowprops={"arrowstyle": "->", "color": "black", "lw": 0.9, "linestyle": ":"},
    )

    ax.set_xlabel("Novelty")
    ax.set_ylabel("Geometric mean")
    ax.set_xlim(3.05, 4.12)
    ax.set_ylim(3.45, 4.36)
    ax.legend(loc="lower right", frameon=False)
    save(fig, "paper_core_v2_ablation_pareto")


def main() -> None:
    apply_style()
    drr_rows = load_rows(DRR_RESULTS)
    zero_rows = load_rows(ZERO_RESULTS)
    with QUERY_PATH.open("r", encoding="utf-8") as handle:
        queries = json.load(handle)
    group_map = {item["id"]: item.get("benchmark_group", "unknown") for item in queries}

    drr = summarize(drr_rows)
    zero = summarize(zero_rows)
    drr_groups = summarize_by_group(drr_rows, group_map)
    zero_groups = summarize_by_group(zero_rows, group_map)

    plot_radar(drr, zero)
    plot_pareto(drr, zero, drr_groups, zero_groups)
    print(
        "DRR:",
        {key: round(value, 3) for key, value in drr.items()},
        "Zero-Shot:",
        {key: round(value, 3) for key, value in zero.items()},
    )


if __name__ == "__main__":
    main()
