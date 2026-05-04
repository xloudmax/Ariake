import asyncio
from argparse import ArgumentParser, Namespace

from ai_service.openalex_corpus import corpus_artifact_paths, load_seed_knowledge_and_rebuild


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Load materialized seed knowledge and rebuild communities.")
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    return parser.parse_args()


async def _main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    report = await load_seed_knowledge_and_rebuild(
        seed_path=paths["seed"],
        report_path=paths["post_build_health"],
    )
    print(report)


if __name__ == "__main__":
    asyncio.run(_main())
