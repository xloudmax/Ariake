import asyncio
import os
from argparse import ArgumentParser, Namespace
from pathlib import Path

from ai_service.openalex_corpus import (
    ACCEPTED_ARTIFACT_PATH,
    REVIEWED_ARTIFACT_PATH,
    corpus_artifact_paths,
    materialize_seed_knowledge,
)


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Materialize benchmark-first seed knowledge from accepted OpenAlex works.")
    parser.add_argument(
        "--per-pack-limit",
        type=int,
        default=int(os.getenv("OPENALEX_PER_PACK_LIMIT", "8")),
        help="How many top works to keep per query pack during materialization. Default: 8.",
    )
    parser.add_argument(
        "--max-works",
        type=int,
        default=int(os.getenv("OPENALEX_MAX_WORKS")) if os.getenv("OPENALEX_MAX_WORKS") else None,
        help="Optional cap after dedupe across packs.",
    )
    parser.add_argument(
        "--include-fulltext-excerpt",
        action="store_true",
        help="Try to fetch bounded OA landing-page excerpts before extraction.",
    )
    parser.add_argument(
        "--full-corpus",
        action="store_true",
        help="Disable per-pack and global caps; use the entire accepted corpus.",
    )
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    parser.add_argument(
        "--accepted-path",
        help="Override accepted/reviewed artifact path.",
    )
    return parser.parse_args()


async def _main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    accepted_path = None
    if args.accepted_path:
        accepted_path = Path(args.accepted_path)
    elif paths["reviewed"].exists():
        accepted_path = paths["reviewed"]
    elif args.version and paths["accepted"].exists():
        accepted_path = paths["accepted"]
    elif REVIEWED_ARTIFACT_PATH.exists():
        accepted_path = REVIEWED_ARTIFACT_PATH
    else:
        accepted_path = ACCEPTED_ARTIFACT_PATH
    await materialize_seed_knowledge(
        accepted_path=accepted_path,
        output_path=paths["seed"],
        provenance_path=paths["provenance"],
        include_fulltext_excerpt=args.include_fulltext_excerpt,
        per_pack_limit=None if args.full_corpus else args.per_pack_limit,
        max_works=None if args.full_corpus else args.max_works,
    )


if __name__ == "__main__":
    asyncio.run(_main())
