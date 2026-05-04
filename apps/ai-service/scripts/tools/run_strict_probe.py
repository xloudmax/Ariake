from __future__ import annotations

import argparse
import json
from pathlib import Path

from ai_service.script_support import resolve_from_service

DEFAULT_QUERY_IDS = ("Q13-Level2", "Q21-Level2", "Q41-Level2", "Q49-Level2")
DEFAULT_INPUT_PATH = resolve_from_service(
    "benchmarks", "results", "advanced_ablation_v2_queries.json"
)
DEFAULT_OUTPUT_PATH = resolve_from_service(
    "benchmarks", "results", "advanced_ablation_backbone_probe.json"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate strict backbone probe subset from advanced ablation v2 queries."
    )
    parser.add_argument(
        "--input-path",
        default=str(DEFAULT_INPUT_PATH),
        help="Input query JSON file path.",
    )
    parser.add_argument(
        "--output-path",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Output probe JSON file path.",
    )
    parser.add_argument(
        "--ids",
        nargs="+",
        default=list(DEFAULT_QUERY_IDS),
        help="Query IDs to keep in the probe set.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input_path)
    output_path = Path(args.output_path)
    selected_ids = set(args.ids)

    with input_path.open(encoding="utf-8") as handle:
        data = json.load(handle)

    probe = [q for q in data if q.get("id") in selected_ids]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(probe, indent=2, ensure_ascii=False), encoding="utf-8")
    print(
        f"Wrote {len(probe)} probe queries to {output_path} from {input_path}"
    )


if __name__ == "__main__":
    main()

