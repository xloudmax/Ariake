import json
import os
from argparse import ArgumentParser, Namespace
from pathlib import Path

from ai_service.openalex_corpus import (
    ACCEPTED_ARTIFACT_PATH,
    REVIEWED_ARTIFACT_PATH,
    corpus_artifact_paths,
    preview_materialization_selection,
)


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Preview per-pack selected papers before seed materialization.")
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    parser.add_argument(
        "--per-pack-limit",
        type=int,
        default=int(os.getenv("OPENALEX_PER_PACK_LIMIT", "8")),
        help="How many top works to keep per pack in the preview. Default: 8.",
    )
    parser.add_argument(
        "--max-works",
        type=int,
        default=int(os.getenv("OPENALEX_MAX_WORKS")) if os.getenv("OPENALEX_MAX_WORKS") else None,
        help="Optional global cap after dedupe across packs.",
    )
    parser.add_argument("--accepted-path", help="Override accepted/reviewed artifact path.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    if args.accepted_path:
        accepted_path = Path(args.accepted_path)
    elif paths["reviewed"].exists():
        accepted_path = paths["reviewed"]
    elif paths["accepted"].exists():
        accepted_path = paths["accepted"]
    elif REVIEWED_ARTIFACT_PATH.exists():
        accepted_path = REVIEWED_ARTIFACT_PATH
    else:
        accepted_path = ACCEPTED_ARTIFACT_PATH
    preview = preview_materialization_selection(
        accepted_path=accepted_path,
        per_pack_limit=args.per_pack_limit,
        max_works=args.max_works,
        output_path=paths["preview"],
    )
    print(json.dumps(preview, indent=2))


if __name__ == "__main__":
    main()
