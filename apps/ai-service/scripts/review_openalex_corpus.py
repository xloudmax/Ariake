import json
from argparse import ArgumentParser, Namespace
from pathlib import Path

from ai_service.openalex_corpus import (
    REVIEWED_ARTIFACT_PATH,
    ACCEPTED_ARTIFACT_PATH,
    corpus_artifact_paths,
    curate_accepted_works,
    review_config_path,
)


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Apply manual review rules to accepted OpenAlex works.")
    parser.add_argument("--version", help="Optional corpus version label, e.g. corpus_v2.")
    parser.add_argument("--review-config", help="Path to a review YAML file.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = corpus_artifact_paths(args.version)
    accepted_path = paths["accepted"] if paths["accepted"].exists() else ACCEPTED_ARTIFACT_PATH
    output_path = paths["reviewed"] if args.version else REVIEWED_ARTIFACT_PATH
    review_path = review_config_path(args.version)
    if args.review_config:
        review_path = Path(args.review_config)
    report = curate_accepted_works(
        accepted_path=accepted_path,
        review_path=review_path,
        output_path=output_path,
    )
    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()
