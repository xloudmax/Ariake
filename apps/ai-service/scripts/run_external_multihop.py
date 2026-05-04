import os
import json
import asyncio
import httpx
import pandas as pd
import argparse
from ai_service.script_support import (
    default_service_url,
    load_service_env,
    resolve_from_service,
    service_request_headers,
)

load_service_env()
API_URL = f"{default_service_url()}/generate/mechanism-tree"
SERVICE_HEADERS = service_request_headers()


async def run_multihop_benchmark(limit: int = 10):
    query_file = resolve_from_service(
        "benchmarks", "external", "MultiHop-RAG", "dataset", "MultiHopRAG.json"
    )

    # Try to load real data, fallback to hardcoded if LFS or file missing
    queries = []
    if os.path.exists(query_file):
        try:
            with open(query_file, "r") as f:
                raw_data = json.load(f)
                queries = (
                    raw_data
                    if isinstance(raw_data, list)
                    else raw_data.get("queries", [])
                )
        except Exception as e:
            print(
                f"Warning: Failed to load {query_file} ({e}). Falling back to sample."
            )

    if not queries:
        queries = [
            {
                "id": "mh-01",
                "query": "How does the desert beetle's shell structure inspire passive water collection systems in architecture?",
            },
            {
                "id": "mh-02",
                "query": "What are the commonalities between spider silk's tensile strength and carbon nanotubes for aerospace applications?",
            },
            {
                "id": "mh-03",
                "query": "Describe the cross-domain application of sharkskin riblets in reducing drag for both swimming and wind turbine blades.",
            },
            {
                "id": "mh-04",
                "query": "How can the structural color of butterfly wings be applied to create anti-counterfeiting security features?",
            },
            {
                "id": "mh-05",
                "query": "Can the self-healing properties of bone be modeled for concrete in bridge construction?",
            },
            {
                "id": "mh-06",
                "query": "How do lotus leaf superhydrophobic surfaces inform the design of self-cleaning solar panels?",
            },
            {
                "id": "mh-07",
                "query": "Compare the acoustic dampening of owl feathers with noise-reduction technology in high-speed rail.",
            },
            {
                "id": "mh-08",
                "query": "In what ways does the honeycomb structure of beehives optimize weight-to-strength ratios in satellite chassis?",
            },
            {
                "id": "mh-09",
                "query": "How can the bioluminescence of deep-sea jellyfish be translated into passive emergency lighting systems?",
            },
            {
                "id": "mh-10",
                "query": "Can the thermal regulation of termite mounds be adapted for ventilation in high-rise office buildings?",
            },
            {
                "id": "mh-11",
                "query": "How does the kingfisher beak shape reduce sonic boom intensity in bullet train nose design?",
            },
            {
                "id": "mh-12",
                "query": "What principles of slug mucus can be used to develop reversible medical adhesives for surgery?",
            },
            {
                "id": "mh-13",
                "query": "How do gecko foot pads inspire the engineering of climbing robots for space station maintenance?",
            },
            {
                "id": "mh-14",
                "query": "Can the muscle-driven movement of octopuses be applied to soft robotics in underwater exploration?",
            },
            {
                "id": "mh-15",
                "query": "How does the woodpecker's skull structure inform the design of shock-absorbing impact helmets?",
            },
            {
                "id": "mh-16",
                "query": "What can the desalination process in mangrove roots teach us about low-energy water purification?",
            },
            {
                "id": "mh-17",
                "query": "How do swarm intelligence algorithms in ants optimize traffic flow management in smart cities?",
            },
            {
                "id": "mh-18",
                "query": "Can the structure of polar bear fur be used to create synthetic fibers for extreme-cold insulation?",
            },
            {
                "id": "mh-19",
                "query": "How does the flight navigation of monarch butterflies inspire autonomous drone swarm coordination?",
            },
            {
                "id": "mh-20",
                "query": "What aspects of venus flytrap snapping mechanisms can be applied to micro-scale mechanical switches?",
            },
        ]
        print("Using expanded hardcoded MultiHop-RAG sample (N=20).")

    print(f"Loaded {len(queries)} queries. Running first {limit}...")

    results = []
    async with httpx.AsyncClient(timeout=120.0, headers=SERVICE_HEADERS) as client:
        for i, item in enumerate(queries[:limit]):
            # Support both 'query', 'question', or 'text' keys
            query_text = item.get("query") or item.get("question") or item.get("text")
            print(f"[{i + 1}/{limit}] Query: {query_text[:50]}...")

            try:
                resp = await client.post(API_URL, json={"query": query_text})
                resp.raise_for_status()
                data = resp.json()

                # Basic assessment: Did it generate nodes/edges?
                node_count = len(data.get("nodes", []))
                edge_count = len(data.get("edges", []))

                results.append(
                    {
                        "id": item.get("id", f"sample-{i}"),
                        "query": query_text,
                        "nodes": node_count,
                        "edges": edge_count,
                        "status": "success",
                    }
                )
            except Exception as e:
                print(f"  -> Failed: {e}")
                results.append(
                    {"query": query_text, "error": str(e), "status": "failed"}
                )

    # Save results
    df = pd.DataFrame(results)
    output_path = resolve_from_service(
        "benchmarks", "results", "external_multihop_results.csv"
    )
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nDone! Results saved to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    asyncio.run(run_multihop_benchmark(args.limit))
