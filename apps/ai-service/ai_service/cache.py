from __future__ import annotations

import asyncio
import json
from collections import OrderedDict

from .config import EMBEDDING_CACHE_FILE, GEMINI_CACHE_FILE, logger


class LRUDict(OrderedDict):
    def __init__(self, maxsize: int = 10_000):
        super().__init__()
        self.maxsize = maxsize

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self.move_to_end(key)
        if len(self) > self.maxsize:
            self.popitem(last=False)

    def __getitem__(self, key):
        value = super().__getitem__(key)
        self.move_to_end(key)
        return value


embedding_cache: LRUDict = LRUDict(maxsize=10_000)
gemini_cache: LRUDict = LRUDict(maxsize=5_000)


def load_caches() -> None:
    try:
        if EMBEDDING_CACHE_FILE.exists():
            with EMBEDDING_CACHE_FILE.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
                for key, value in data.items():
                    embedding_cache[key] = value
        if GEMINI_CACHE_FILE.exists():
            with GEMINI_CACHE_FILE.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
                for key, value in data.items():
                    gemini_cache[key] = value
        logger.info(
            "Loaded caches: %s embeddings, %s responses.",
            len(embedding_cache),
            len(gemini_cache),
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning("Could not load caches: %s", exc)


_last_saved_embedding_size = 0
_last_saved_gemini_size = 0


async def periodic_cache_sync(interval_seconds: int = 300) -> None:
    """Periodically saves caches to disk to prevent data loss on crash."""
    global _last_saved_embedding_size, _last_saved_gemini_size
    
    while True:
        await asyncio.sleep(interval_seconds)
        
        current_embedding_size = len(embedding_cache)
        current_gemini_size = len(gemini_cache)
        
        # Only save if there are new items
        if (current_embedding_size != _last_saved_embedding_size or 
            current_gemini_size != _last_saved_gemini_size):
            
            logger.info("Periodic cache sync triggered. New items detected.")
            save_caches()
            
            _last_saved_embedding_size = current_embedding_size
            _last_saved_gemini_size = current_gemini_size

def save_caches() -> None:
    try:
        with EMBEDDING_CACHE_FILE.open("w", encoding="utf-8") as handle:
            json.dump(dict(embedding_cache), handle)
        with GEMINI_CACHE_FILE.open("w", encoding="utf-8") as handle:
            json.dump(dict(gemini_cache), handle)
        logger.info("Saved caches to disk.")
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning("Could not save caches: %s", exc)
