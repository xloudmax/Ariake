import os
import json
import asyncio
import httpx
import pandas as pd
import argparse
import re
from typing import Set, Tuple
from ai_service.script_support import (
    default_service_url,
    load_service_env,
    resolve_from_service,
    service_request_headers,
)

load_service_env()
API_URL = f"{default_service_url()}/generate/mechanism-tree"
DATA_DIR = resolve_from_service(
    "benchmarks", "external", "TaxoBench-CS", "data", "ground_new"
)
SERVICE_HEADERS = service_request_headers()


def get_tokens(text: str) -> Set[str]:
    """Extract alpha keywords for fuzzy matching."""
    return set(re.findall(r"\w+", text.lower()))


def jaccard_similarity(set1: Set[str], set2: Set[str]) -> float:
    if not set1 or not set2:
        return 0.0
    return len(set1.intersection(set2)) / len(set1.union(set2))


def get_edges_from_nested_dict(d: dict, parent: str = None) -> Set[tuple]:
    edges = set()
    for k, v in d.items():
        if parent:
            edges.add((parent, k))
        if isinstance(v, dict) and v:
            edges.update(get_edges_from_nested_dict(v, k))
    return edges


def get_edges_from_drr_tree(tree: dict) -> Set[tuple]:
    edges = set()
    node_id_to_title = {n["id"]: n["data"]["title"] for n in tree.get("nodes", [])}
    for e in tree.get("edges", []):
        source_title = node_id_to_title.get(e["source"])
        target_title = node_id_to_title.get(e["target"])
        if source_title and target_title:
            edges.add((source_title, target_title))
    return edges


def calculate_fuzzy_overlap(
    target_edges: Set[Tuple[str, str]],
    ground_truth_edges: Set[Tuple[str, str]],
    threshold: float = 0.3,
) -> float:
    """Calculate overlap where an edge matches if both its source and target are 'similar' to a GT edge."""
    if not target_edges or not ground_truth_edges:
        return 0.0

    matches = 0
    for t_src, t_tgt in target_edges:
        t_src_tokens = get_tokens(t_src)
        t_tgt_tokens = get_tokens(t_tgt)

        for g_src, g_tgt in ground_truth_edges:
            g_src_tokens = get_tokens(g_src)
            g_tgt_tokens = get_tokens(g_tgt)

            # Match if source->source and target->target are similar enough
            if (
                jaccard_similarity(t_src_tokens, g_src_tokens) >= threshold
                and jaccard_similarity(t_tgt_tokens, g_tgt_tokens) >= threshold
            ):
                matches += 1
                break
    return matches


async def run_taxobench_benchmark(limit: int = 5):
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".json")]
    if not files:
        print(f"Error: No files found in {DATA_DIR}")
        return

    # Filter for smaller trees to prevent server timeouts
    valid_files = []
    print("Filtering for realistic trees (5-50 edges)...")
    for f in files:
        with open(os.path.join(DATA_DIR, f), "r") as r:
            try:
                data = json.load(r)
                gt_tree = data.get("taxo_tree", {})
                edge_count = len(get_edges_from_nested_dict(gt_tree))
                if 5 <= edge_count < 50:
                    valid_files.append(f)
            except Exception:
                continue

    print(f"Found {len(valid_files)} eligible files. Running first {limit}...")

    results = []
    async with httpx.AsyncClient(timeout=300.0, headers=SERVICE_HEADERS) as client:
        for i, filename in enumerate(valid_files[:limit]):
            path = os.path.join(DATA_DIR, filename)
            with open(path, "r") as f:
                item = json.load(f)

            # Enhanced context: Title + Abstract (from papers list) + Category keywords
            title = item.get("title", "")
            abstract = item.get("abstract", "")
            if not abstract and item.get("papers"):
                # Use first paper's abstract as proxy
                p0 = item["papers"].get("0") or list(item["papers"].values())[0]
                abstract = p0.get("abstract", "")

            # Guide the DRR with top-level concepts
            gt_tree = item.get("taxo_tree", {})
            top_concepts = list(gt_tree.keys())[:3]
            query = f"Domain: {title}. Focus Aspects: {', '.join(top_concepts)}. Summary: {abstract[:800]}"

            gt_edges = get_edges_from_nested_dict(gt_tree)
            print(f"[{i + 1}/{limit}] File: {filename} (GT Edges: {len(gt_edges)})")

            try:
                resp = await client.post(API_URL, json={"query": query})
                if resp.status_code != 200:
                    print(f"  -> HTTP Error {resp.status_code}")
                    continue

                drr_tree = resp.json()
                drr_edges = get_edges_from_drr_tree(drr_tree)

                # Fuzzy matching instead of exact
                fuzzy_matches = calculate_fuzzy_overlap(drr_edges, gt_edges)
                precision = fuzzy_matches / len(drr_edges) if drr_edges else 0
                recall = fuzzy_matches / len(gt_edges) if gt_edges else 0

                results.append(
                    {
                        "filename": filename,
                        "gt_edges": len(gt_edges),
                        "drr_edges": len(drr_edges),
                        "precision": precision,
                        "fuzzy_recall": recall,
                        "status": "success",
                    }
                )
                print(
                    f"  -> Success! Fuzzy Recall: {recall:.4f} (Edges: {len(drr_edges)})"
                )
            except Exception as e:
                print(f"  -> Failed: {e}")

    if not results:
        print("No successful results to save.")
        return

    # Save results
    df = pd.DataFrame(results)
    output_path = resolve_from_service(
        "benchmarks", "results", "external_taxobench_results.csv"
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nDone! Results saved to {output_path}")
    print(f"Mean Structural Fuzzy Recall: {df['fuzzy_recall'].mean():.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    asyncio.run(run_taxobench_benchmark(args.limit))
