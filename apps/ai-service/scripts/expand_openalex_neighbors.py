import asyncio
from argparse import ArgumentParser, Namespace

from ai_service.openalex_corpus import (
    OPENALEX_QUERY_PACKS_PATH,
    corpus_artifact_paths,
    expand_openalex_neighbors,
)


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Expand OpenAlex discovery results with 1-hop neighbors.")
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    return parser.parse_args()


async def _main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    await expand_openalex_neighbors(
        config_path=OPENALEX_QUERY_PACKS_PATH,
        discovery_path=paths["discovery"],
        output_path=paths["accepted"],
    )


if __name__ == "__main__":
    asyncio.run(_main())
