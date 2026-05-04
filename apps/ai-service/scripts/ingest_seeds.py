import asyncio
import json
import logging
import os

from ai_service import db as service_db
from ai_service.knowledge_graph import (
    generate_all_community_summaries,
    run_leiden_clustering,
    upsert_knowledge,
)
from ai_service.llm import client_configured, get_gemini_response
from ai_service.models import KnowledgeExtractionResponse
from ai_service.prompts import KNOWLEDGE_EXTRACTION_PROMPT
from ai_service.script_support import load_service_env, resolve_from_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_ingestor")

load_service_env()

GRAPH_DATABASE_URL = os.getenv("GRAPH_DATABASE_URL")


async def extract_knowledge(text: str) -> KnowledgeExtractionResponse:
    if not client_configured():
        raise RuntimeError(
            "GOOGLE_CLOUD_API_KEY or LLM_API_KEY is required for seed ingestion."
        )
    try:
        content = await get_gemini_response(
            prompt=f"Text to extract from:\n{text}",
            system_instruction=KNOWLEDGE_EXTRACTION_PROMPT,
            json_mode=True,
            task="knowledge_extraction",
        )
        data = json.loads(content)

        if "relationships" in data:
            for rel in data["relationships"]:
                rel.setdefault("relation_type", "associated_with")
                rel.setdefault(
                    "description",
                    f"Link between {rel.get('source')} and {rel.get('target')}",
                )

        return KnowledgeExtractionResponse(**data)
    except Exception as e:
        logger.error(f"Extraction Error: {e}")
        return KnowledgeExtractionResponse(entities=[], relationships=[])


async def main():
    if not GRAPH_DATABASE_URL:
        raise RuntimeError("GRAPH_DATABASE_URL is required for seed ingestion.")

    seed_dir = resolve_from_service("data", "seeds")
    await service_db.init_db_pool()

    try:
        for filename in sorted(os.listdir(seed_dir)):
            if filename.endswith(".md"):
                filepath = os.path.join(seed_dir, filename)
                logger.info(f"Processing {filename}...")
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                extraction = await extract_knowledge(content)
                await upsert_knowledge(extraction)

        logger.info("Ingestion complete. Rebuilding communities...")
        await run_leiden_clustering()
        await generate_all_community_summaries()
    finally:
        await service_db.close_db_pool()


if __name__ == "__main__":
    asyncio.run(main())
