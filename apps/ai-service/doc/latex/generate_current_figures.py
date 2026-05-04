#!/usr/bin/env python3
"""
Generate publication figures for the current Chinese paper revision.

This script intentionally uses manifest-driven benchmark outputs so every figure
is tied to a concrete experimental run.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parent
FIGURES_DIR = ROOT / "figures"
FIGURES_DIR.mkdir(exist_ok=True)

AI_SERVICE_ROOT = ROOT.parent.parent
sys.path.insert(0, str(AI_SERVICE_ROOT))

from ai_service.script_support import resolve_latest_run_result  # noqa: E402

DEFAULT_PAPER_CORE_RESULTS = (
    AI_SERVICE_ROOT
    / "benchmarks"
    / "runs"
    / "paper_core"
    / "paper_core_v2"
    / "corpus_v3_scale"
    / "DRR_Final"
    / "paper_core_v2_neutral"
)
DEFAULT_ZERO_SHOT_RESULTS = (
    AI_SERVICE_ROOT
    / "benchmarks"
    / "runs"
    / "paper_core"
    / "paper_core_v2"
    / "corpus_v3_scale"
    / "Zero_Shot"
    / "paper_core_v2_neutral"
)
DEFAULT_ABLATION_RESULTS = (
    AI_SERVICE_ROOT
    / "benchmarks"
    / "runs"
    / "advanced_ablation"
    / "advanced_ablation_v2"
    / "corpus_v3_scale"
    / "ablation_suite"
    / "standard_judge"
)

C_VECTOR = "#D55E00"
C_DRAFT = "#0072B2"
C_FINAL = "#009E73"
C_ZERO = "#CC79A7"
C_GRID = "#BDBDBD"
C_BENCH = ["#009E73", "#56B4E9", "#E69F00", "#CC79A7"]
C_DRR_BAR = "#D55E00"
H_VECTOR = "///"
H_DRAFT = "\\\\\\"
H_FINAL = "xxx"


def apply_style() -> None:
    plt.style.use("default")
    plt.rcParams.update(
        {
            "font.family": "serif",
            "font.size": 9,
            "axes.labelsize": 9,
            "axes.titlesize": 10,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "legend.fontsize": 8,
            "axes.linewidth": 0.8,
            "savefig.bbox": "tight",
            "savefig.pad_inches": 0.08,
            "figure.dpi": 300,
        }
    )


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_paper_core_query_map() -> dict[str, str]:
    query_path = Path(
        os.getenv(
            "PAPER_CORE_QUERY_PATH",
            str(AI_SERVICE_ROOT / "benchmarks/results/paper_core_benchmark_queries.json"),
        )
    ).expanduser()
    with query_path.open("r", encoding="utf-8") as handle:
        queries = json.load(handle)
    return {query["id"]: query["benchmark_group"] for query in queries}


def normalize_paper_core_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Align historical paper-core runs to the final 42-query set.

    Historical runs may contain an older Q10 plus Q43/Q44. The final benchmark
    removes Q43 and uses the revised Q44 result as Q10. Future native 42-query
    runs will pass through unchanged.
    """
    group_map = load_paper_core_query_map()
    query_ids = set(group_map)
    rows_by_id = {row["id"]: row for row in rows}
    normalized: list[dict[str, str]] = []

    def sort_key(query_id: str) -> int:
        return int(query_id.split("-")[0].lstrip("Q"))

    for query_id in sorted(query_ids, key=sort_key):
        source_id = query_id
        if (
            query_id == "Q10-Level2"
            and "Q44-Level2" in rows_by_id
            and "Q44-Level2" not in query_ids
        ):
            source_id = "Q44-Level2"
        row = rows_by_id.get(source_id)
        if row is None:
            continue
        copied = dict(row)
        copied["id"] = query_id
        copied["benchmark_group"] = group_map[query_id]
        normalized.append(copied)

    return normalized


def resolve_latest_run_csv(base_dir: Path) -> Path:
    resolved = resolve_latest_run_result(base_dir, result_filename="results.csv")
    if resolved is None:
        raise FileNotFoundError(f"No run results found under {base_dir}")
    return resolved


def resolve_results_path(value: str | None, fallback: Path) -> Path:
    if value:
        path = Path(value).expanduser()
        if path.suffix == ".csv":
            return path
        return resolve_latest_run_csv(path)
    return resolve_latest_run_csv(fallback)


def geometric_mean(values: list[float]) -> float:
    return math.exp(sum(math.log(v) for v in values) / len(values))


def summarize_paper_core(paper_core_results: Path) -> dict[str, float]:
    rows = normalize_paper_core_rows(load_rows(paper_core_results))
    causality = np.mean([float(row["causality"]) for row in rows])
    actionability = np.mean([float(row["actionability"]) for row in rows])
    novelty = np.mean([float(row["novelty"]) for row in rows])
    geomean = geometric_mean([causality, actionability, novelty])
    return {
        "causality": causality,
        "actionability": actionability,
        "novelty": novelty,
        "geomean": geomean,
    }


def summarize_paper_core_by_group(paper_core_results: Path) -> dict[str, dict[str, float]]:
    rows = normalize_paper_core_rows(load_rows(paper_core_results))
    group_map = load_paper_core_query_map()
    
    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        group = group_map.get(row["id"], "unknown")
        for key in ("causality", "actionability", "novelty"):
            grouped[group][key].append(float(row[key]))
            
    summary: dict[str, dict[str, float]] = {}
    for group, metrics in grouped.items():
        causality = float(np.mean(metrics["causality"]))
        actionability = float(np.mean(metrics["actionability"]))
        novelty = float(np.mean(metrics["novelty"]))
        summary[group] = {
            "causality": causality,
            "actionability": actionability,
            "novelty": novelty,
            "geomean": geometric_mean([causality, actionability, novelty])
        }
    return summary


def paper_core_per_query_metrics(paper_core_results: Path) -> dict[str, list[float]]:
    rows = normalize_paper_core_rows(load_rows(paper_core_results))
    causality = [float(row["causality"]) for row in rows]
    actionability = [float(row["actionability"]) for row in rows]
    novelty = [float(row["novelty"]) for row in rows]
    geomean = [
        geometric_mean([float(row["causality"]), float(row["actionability"]), float(row["novelty"])])
        for row in rows
    ]
    return {
        "Causality": causality,
        "Actionability": actionability,
        "Novelty": novelty,
        "GeoMean": geomean,
    }


def summarize_ablation(ablation_results: Path) -> dict[str, dict[str, float]]:
    rows = load_rows(ablation_results)
    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        scenario = row["scenario"]
        for key in ("causality", "actionability", "novelty", "final_score", "latency"):
            grouped[scenario][key].append(float(row[key]))
    summary: dict[str, dict[str, float]] = {}
    for scenario, metrics in grouped.items():
        summary[scenario] = {
            key: float(np.mean(values)) for key, values in metrics.items()
        }
    return summary


def save_figure(fig: plt.Figure, stem: str) -> None:
    fig.savefig(FIGURES_DIR / f"{stem}.pdf")
    fig.savefig(FIGURES_DIR / f"{stem}.png")
    plt.close(fig)


def plot_paper_core_summary(drr_results: Path, zero_results: Path) -> None:
    drr = summarize_paper_core(drr_results)
    zero = summarize_paper_core(zero_results)
    labels = ["Causality", "Actionability", "Novelty", "GeoMean"]
    drr_values = [drr["causality"], drr["actionability"], drr["novelty"], drr["geomean"]]
    zero_values = [zero["causality"], zero["actionability"], zero["novelty"], zero["geomean"]]

    fig, ax = plt.subplots(figsize=(5.4, 3.0))
    ax.grid(axis="y", color=C_GRID, alpha=0.35, linewidth=0.6, zorder=0)
    x = np.arange(len(labels))
    width = 0.34
    zero_bars = ax.bar(
        x - width / 2,
        zero_values,
        width,
        color=C_ZERO,
        edgecolor="black",
        linewidth=0.7,
        label="Zero-Shot",
        zorder=3,
    )
    drr_bars = ax.bar(
        x + width / 2,
        drr_values,
        width,
        color=C_DRR_BAR,
        edgecolor="black",
        linewidth=0.7,
        label="DRR",
        zorder=3,
    )
    for bars in (zero_bars, drr_bars):
        for bar in bars:
            value = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + 0.04,
                f"{value:.2f}",
                ha="center",
                va="bottom",
                fontsize=7.5,
                fontweight="bold",
            )

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 5.4)
    ax.set_ylabel("Score")
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.28), ncol=2, frameon=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    save_figure(fig, "paper_core_benchmark_summary")


def plot_paper_core_by_group(drr_results: Path, zero_results: Path) -> None:
    drr = summarize_paper_core_by_group(drr_results)
    zero = summarize_paper_core_by_group(zero_results)
    groups = ["anchor_engineering", "transfer_core", "exploratory"]
    labels = ["Anchor\n(n=6)", "Transfer\n(n=20)", "Exploratory\n(n=16)"]
    drr_values = [drr[g]["geomean"] for g in groups]
    zero_values = [zero[g]["geomean"] for g in groups]

    fig, ax = plt.subplots(figsize=(5.2, 3.1))
    ax.grid(axis="y", color=C_GRID, alpha=0.35, linewidth=0.6, zorder=0)

    x = np.arange(len(groups))
    width = 0.34
    zero_bars = ax.bar(
        x - width / 2,
        zero_values,
        width,
        color=C_ZERO,
        edgecolor="black",
        linewidth=0.7,
        label="Zero-Shot",
        zorder=3,
    )
    drr_bars = ax.bar(
        x + width / 2,
        drr_values,
        width,
        color=C_DRR_BAR,
        edgecolor="black",
        linewidth=0.7,
        label="DRR",
        zorder=3,
    )

    for bars in (zero_bars, drr_bars):
        for bar in bars:
            value = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + 0.04,
                f"{value:.2f}",
                ha="center",
                va="bottom",
                fontsize=7.5,
                fontweight="bold",
            )

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 5.0)
    ax.set_ylabel("GeoMean")
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.28), ncol=2, frameon=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    save_figure(fig, "paper_core_benchmark_by_group")


def plot_paper_core_distribution_violin(drr_results: Path, zero_results: Path) -> None:
    drr_metrics = paper_core_per_query_metrics(drr_results)
    zero_metrics = paper_core_per_query_metrics(zero_results)
    labels = list(drr_metrics.keys())
    positions = np.arange(1, len(labels) + 1)
    offset = 0.18

    fig, ax = plt.subplots(figsize=(5.4, 3.2))
    ax.grid(axis="y", color=C_GRID, alpha=0.35, linewidth=0.6, zorder=0)

    def draw_box_and_strip(values: list[list[float]], pos_shift: float, color: str) -> None:
        box = ax.boxplot(
            values,
            positions=positions + pos_shift,
            widths=0.28,
            patch_artist=True,
            showfliers=False,
            boxprops={"facecolor": color, "alpha": 0.35, "edgecolor": "black", "linewidth": 0.8},
            medianprops={"color": "black", "linewidth": 1.1},
            whiskerprops={"color": "black", "linewidth": 0.8},
            capprops={"color": "black", "linewidth": 0.8},
        )
        for patch in box["boxes"]:
            patch.set_zorder(3)
        for idx, vals in enumerate(values, start=1):
            x = idx + pos_shift
            jitter = np.linspace(-0.05, 0.05, len(vals))
            ax.scatter(
                np.full(len(vals), x) + jitter,
                vals,
                s=14,
                color=color,
                edgecolor="black",
                linewidth=0.25,
                alpha=0.55,
                zorder=2,
            )

    draw_box_and_strip([zero_metrics[label] for label in labels], -offset, C_ZERO)
    draw_box_and_strip([drr_metrics[label] for label in labels], offset, C_DRR_BAR)

    ax.set_xticks(positions)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Per-query score")
    ax.set_ylim(3.0, 5.1)
    ax.legend(
        handles=[
            plt.Rectangle((0, 0), 1, 1, facecolor=C_ZERO, edgecolor="black", alpha=0.35, label="Zero-Shot"),
            plt.Rectangle((0, 0), 1, 1, facecolor=C_DRR_BAR, edgecolor="black", alpha=0.35, label="DRR"),
        ],
        loc="lower center",
        bbox_to_anchor=(0.5, -0.28),
        ncol=2,
        frameon=False,
    )
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    save_figure(fig, "paper_core_score_distribution_violin")


def plot_ablation_radar(ablation_results: Path) -> None:
    summary = summarize_ablation(ablation_results)
    order = ["Zero_Shot", "Vector", "DRR_Draft", "DRR_Final"]
    display = {
        "Zero_Shot": ("Zero-Shot", C_ZERO),
        "Vector": ("Vector", C_VECTOR),
        "DRR_Draft": ("DRR-Draft", C_DRAFT),
        "DRR_Final": ("DRR-Final", C_FINAL),
    }
    categories = ["Causality", "Actionability", "Novelty"]
    angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(4.2, 3.6), subplot_kw={"polar": True})
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)
    ax.grid(color=C_GRID, alpha=0.45, linewidth=0.6)
    ax.set_ylim(0, 10)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(["2", "4", "6", "8", "10"], color="gray", fontsize=7)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontweight="medium")

    for scenario in order:
        label, color = display[scenario]
        values = [
            summary[scenario]["causality"],
            summary[scenario]["actionability"],
            summary[scenario]["novelty"],
        ]
        values += values[:1]
        ax.plot(angles, values, linewidth=2.0, color=color, label=label)
        ax.fill(angles, values, color=color, alpha=0.14)

    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.24), ncol=4, frameon=False)
    save_figure(fig, "advanced_ablation_radar_v3")


def plot_ablation_pareto(ablation_results: Path) -> None:
    summary = summarize_ablation(ablation_results)
    display = {
        "Zero_Shot": ("Zero-Shot", C_ZERO, "D"),
        "Vector": ("Vector", C_VECTOR, "o"),
        "DRR_Draft": ("DRR-Draft", C_DRAFT, "s"),
        "DRR_Final": ("DRR-Final", C_FINAL, "^"),
    }
    fig, ax = plt.subplots(figsize=(4.6, 3.0))
    ax.grid(color=C_GRID, alpha=0.35, linewidth=0.6, linestyle="--", zorder=0)

    points = [
        (scenario, summary[scenario]["latency"], summary[scenario]["final_score"])
        for scenario in ["Zero_Shot", "Vector", "DRR_Draft", "DRR_Final"]
    ]
    # Sort by latency (ascending) and then by score (descending)
    points.sort(key=lambda item: (item[1], -item[2]))
    frontier = []
    for scenario, x, y in points:
        # A point is on the Pareto frontier if it offers a strictly better score
        # than the best score seen so far (since latency is increasing)
        if not frontier or y > frontier[-1][2]:
            frontier.append((scenario, x, y))
    ax.plot(
        [item[1] for item in frontier],
        [item[2] for item in frontier],
        color="black",
        linewidth=1.0,
        linestyle=":",
        zorder=1,
    )

    for scenario in ["Zero_Shot", "Vector", "DRR_Draft", "DRR_Final"]:
        label, color, marker = display[scenario]
        x = summary[scenario]["latency"]
        y = summary[scenario]["final_score"]
        ax.scatter(
            x,
            y,
            s=70,
            color=color,
            marker=marker,
            edgecolor="black",
            linewidth=0.7,
            zorder=3,
            label=label,
        )
        ax.annotate(
            label,
            (x, y),
            xytext=(6, 6),
            textcoords="offset points",
            fontsize=8,
            fontweight="bold",
        )

    ax.set_xlabel("Average latency (s)")
    ax.set_ylabel("Final score")
    
    # Auto-scale with margin based on actual data
    ax.margins(x=0.2, y=0.2)
    
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    save_figure(fig, "advanced_ablation_pareto_v3")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate figures from explicit run outputs")
    parser.add_argument(
        "--paper-core-results",
        default=os.getenv("PAPER_CORE_RESULTS_PATH", ""),
        help="Path to paper-core results CSV or run parent directory",
    )
    parser.add_argument(
        "--zero-shot-results",
        default=os.getenv("ZERO_SHOT_RESULTS_PATH", ""),
        help="Path to Zero-Shot paper-core results CSV or run parent directory",
    )
    parser.add_argument(
        "--ablation-results",
        default=os.getenv("ADVANCED_ABLATION_RESULTS_PATH", ""),
        help="Path to advanced ablation CSV",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paper_core_results = resolve_results_path(args.paper_core_results, DEFAULT_PAPER_CORE_RESULTS)
    zero_shot_results = resolve_results_path(args.zero_shot_results, DEFAULT_ZERO_SHOT_RESULTS)
    ablation_results = resolve_results_path(args.ablation_results, DEFAULT_ABLATION_RESULTS)

    apply_style()
    try:
        plot_paper_core_summary(paper_core_results, zero_shot_results)
        plot_paper_core_distribution_violin(paper_core_results, zero_shot_results)
        plot_paper_core_by_group(paper_core_results, zero_shot_results)
    except Exception as e:
        print(f"Skipping paper core plots: {e}")
    plot_ablation_radar(ablation_results)
    plot_ablation_pareto(ablation_results)
    print("Generated current paper figures in", FIGURES_DIR)
    print("paper-core source:", paper_core_results)
    print("zero-shot source:", zero_shot_results)
    print("ablation source:", ablation_results)


if __name__ == "__main__":
    main()
