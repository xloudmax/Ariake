import asyncio
from argparse import ArgumentParser, Namespace

from ai_service.openalex_corpus import REVIEWED_ARTIFACT_PATH, corpus_artifact_paths, analyze_benchmark_coverage


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Analyze benchmark readiness and GraphRAG coverage.")
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    return parser.parse_args()


async def _main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    accepted_path = paths["reviewed"] if paths["reviewed"].exists() else paths["accepted"]
    if not accepted_path.exists() and REVIEWED_ARTIFACT_PATH.exists():
        accepted_path = REVIEWED_ARTIFACT_PATH
    report = await analyze_benchmark_coverage(
        accepted_path=accepted_path,
        provenance_path=paths["provenance"],
        output_json_path=paths["benchmark_coverage_json"],
        output_csv_path=paths["benchmark_coverage_csv"],
    )
    print(report["readiness_checks"])


if __name__ == "__main__":
    asyncio.run(_main())
