from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
PACKAGE_DIR = Path(__file__).resolve().parent
PROMPTS_DIR = ROOT_DIR / "prompts"
DATA_DIR = ROOT_DIR / "data"
BENCHMARKS_DIR = ROOT_DIR / "benchmarks"
RESULTS_DIR = BENCHMARKS_DIR / "results"
LOGS_DIR = ROOT_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT_DIR / ".env")

# Enhanced logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

logging.basicConfig(
    level=LOG_LEVEL,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "ai_service.log", encoding="utf-8"),
    ],
)

logger = logging.getLogger("ai_service")
logger.setLevel(LOG_LEVEL)

CONFIG_PATH = ROOT_DIR / "model_config.yaml"
EMBEDDING_CACHE_FILE = ROOT_DIR / ".embedding_cache.json"
GEMINI_CACHE_FILE = ROOT_DIR / ".gemini_cache.json"


def load_system_config() -> dict[str, Any]:
    try:
        if CONFIG_PATH.exists():
            with CONFIG_PATH.open("r", encoding="utf-8") as handle:
                return yaml.safe_load(handle) or {}
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to load %s: %s", CONFIG_PATH.name, exc)
    return {}


_sys_config = load_system_config()


def get_model_setting(task: str, key: str, default_val: Any = None) -> Any:
    task_cfg = _sys_config.get(task, {})
    value = task_cfg.get(key)
    if value is not None:
        return value
    return _sys_config.get("default", {}).get(key, default_val)


def reload_model_config() -> None:
    """Re-read model_config.yaml from disk. Useful in dev when editing yaml live."""
    global _sys_config
    _sys_config = load_system_config()


LLM_API_KEY = os.getenv("LLM_API_KEY")
GOOGLE_CLOUD_API_KEY = os.getenv("GOOGLE_CLOUD_API_KEY") or LLM_API_KEY
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY")
PROJECT_ID = os.getenv(
    "GOOGLE_CLOUD_PROJECT", get_model_setting("default", "project_id")
)
LOCATION = os.getenv(
    "GOOGLE_CLOUD_REGION", get_model_setting("default", "location", "us-central1")
)
GRAPH_DATABASE_URL = os.getenv("GRAPH_DATABASE_URL")
