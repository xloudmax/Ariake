import asyncio
from argparse import ArgumentParser, Namespace

from ai_service.openalex_corpus import OPENALEX_QUERY_PACKS_PATH, corpus_artifact_paths, discover_openalex


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Discover OpenAlex works for benchmark-aligned query packs.")
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    return parser.parse_args()


async def _main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    await discover_openalex(
        config_path=OPENALEX_QUERY_PACKS_PATH,
        output_path=paths["discovery"],
    )


if __name__ == "__main__":
    asyncio.run(_main())
