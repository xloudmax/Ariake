import asyncio
import json

from ai_service.llm import get_gemini_response
from ai_service.script_support import load_service_env, resolve_from_service

load_service_env()

TARGET_COUNT = 65


def read_json(path):
    with open(path, "r") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


STANDARD_PROMPT = """
You are an expert in cross-domain knowledge transfer and engineering reasoning. Generate exactly 10 NEW standard test queries for a cross-domain mechanism-transfer benchmark.
Do not repeat any existing subjects. Output MUST be valid JSON list matching the format:
[
  {{
    "id": "Q11-Level2",
    "difficulty": "Level 2",
    "intent": "Open_Divergence",
    "engineering_query": "How to design X...",
    "biological_hints": ["Given hints if any (legacy schema slot for source-domain hints)"],
    "ground_truth": {{
      "required_mechanisms": ["Physical mechanism 1", "Physical mechanism 2"],
      "physics_constraints": ["Constraint 1", "Constraint 2"]
    }}
  }}
]

Avoid the following queries:
{existing_text}
"""

NULL_PROMPT = """
You are an expert in cross-domain knowledge transfer and engineering reasoning. Generate exactly 10 NEW "Null/Impossible" queries for a cross-domain mechanism-transfer benchmark.
A NULL query asks an engineering question but forces the system to consider completely unrelated source-domain mechanisms, making it impossible to solve rationally (e.g., using impact attenuation in avian anatomy to design packet routing).
Output MUST be valid JSON list matching the format:
[
  {{
    "id": "null_21",
    "engineering_query": "How to design X...",
    "active_ingredients": ["Unrelated mechanism 1 (Reason)", "Unrelated mechanism 2 (Reason)"]
  }}
]

Avoid the following queries:
{existing_text}
"""


def extract_json(res_text):
    start = res_text.find("[")
    end = res_text.rfind("]") + 1
    if start != -1 and end != 0:
        return json.loads(res_text[start:end])
    raise ValueError("Valid JSON list not found")


async def expand_standard():
    existing = read_json(
        resolve_from_service("benchmarks", "results", "paper_core_benchmark_queries.json")
    )
    print(f"Current standard queries: {len(existing)}")
    while len(existing) < TARGET_COUNT:
        context = json.dumps(
            [{"query": e["engineering_query"]} for e in existing], ensure_ascii=False
        )
        prompt = STANDARD_PROMPT.format(existing_text=context)
        print("Requesting 10 more standard queries...")
        res_text = await get_gemini_response(
            prompt=prompt,
            task="dataset_expansion",
            use_cache=False,
        )
        try:
            new_items = extract_json(res_text)
            for i, item in enumerate(new_items):
                item["id"] = f"Q{len(existing) + 1 + i}-Level2"
                item["difficulty"] = "Level 2"
                item["intent"] = "Open_Divergence"
            existing.extend(new_items)
            write_json(
                resolve_from_service("benchmarks", "results", "paper_core_benchmark_queries.json"),
                existing,
            )
            print(f"Added {len(new_items)} queries. Total: {len(existing)}")
        except Exception as e:
            print(f"Parsing error: {e}")


async def expand_null():
    existing = read_json(
        resolve_from_service("benchmarks", "results", "benchmark_queries_null.json")
    )
    print(f"Current null queries: {len(existing)}")
    while len(existing) < TARGET_COUNT:
        context = json.dumps(
            [{"query": e["engineering_query"]} for e in existing], ensure_ascii=False
        )
        prompt = NULL_PROMPT.format(existing_text=context)
        print("Requesting 10 more null queries...")
        res_text = await get_gemini_response(
            prompt=prompt,
            task="dataset_expansion",
            use_cache=False,
        )
        try:
            new_items = extract_json(res_text)
            for i, item in enumerate(new_items):
                item["id"] = f"null_{len(existing) + 1 + i}"
            existing.extend(new_items)
            write_json(
                resolve_from_service(
                    "benchmarks", "results", "benchmark_queries_null.json"
                ),
                existing,
            )
            print(f"Added {len(new_items)} queries. Total: {len(existing)}")
        except Exception as e:
            print(f"Parsing error: {e}")


async def main():
    await expand_standard()
    await expand_null()


if __name__ == "__main__":
    asyncio.run(main())
