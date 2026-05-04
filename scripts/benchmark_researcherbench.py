import os
import json
import asyncio
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv
import re

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "apps/ai-service/.env")

# Mock ResearcherBench Frontier Problem
RESEARCHER_PROBLEM = """
[ResearcherBench Query #42 - Model Architecture]
Current large language models suffer from quadratic complexity O(N^2) in sequence length due to standard scaled dot-product attention. Recent linear RNNs like Mamba and RWKV offer O(N) complexity but struggle with ultra-long-term precise factual recall (the "needle in a haystack" problem) compared to Transformers.
Design a hybrid or novel mechanism that strictly maintains O(N) training complexity while preserving the exact retrieval capabilities of traditional attention for sequences exceeding 1 million tokens.
"""

class ResearcherBenchEvaluator:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("LLM_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_CLOUD_API_KEY is missing. Please set it in apps/ai-service/.env")
            
        self.client = genai.Client(
            vertexai=True,
            api_key=self.api_key
        )
        # We will use Pro for BOTH generation (acting as the AI Scientist) and evaluation (acting as the Reviewer Rubric)
        self.model = "gemini-3.1-pro-preview"

    async def generate_scientific_insight(self) -> str:
        prompt = f"Solve the following frontier AI research problem as an elite AI Scientist:\n{RESEARCHER_PROBLEM}\nProvide a concrete, deeply technical mechanism design."
        
        config = types.GenerateContentConfig(
            temperature=0.7, # Higher temp for creative ideation
            thinking_config=types.ThinkingConfig(include_thoughts=True)
        )
        
        print("💡 [Agent] Generating AI Scientist Insight via Gemini 3.1 Pro (Thinking Mode)...")
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config
        )
        return response.text

    async def evaluate_insight(self, generated_solution: str) -> dict:
        rubric_prompt = f"""
        # Role
        You are an expert Reviewer for ResearcherBench. Your job is to strictly evaluate AI-generated scientific ideas.

        # Problem Statement
        {RESEARCHER_PROBLEM}

        # AI Scientist Proposed Solution
        {generated_solution}

        # Evaluation Rubric
        Please evaluate the proposed solution strictly on a scale of 1 to 5 across these three dimensions:
        1. Factual Correctness (Factuality): Does the idea violate known theoretical computer science bounds? (1=violates physics/math, 5=mathematically sound).
        2. Depth of Insight (Depth): Is it a superficial combination of buzzwords or a deep, structurally coherent design? (1=buzzwords, 5=highly detailed architectural formulation).
        3. Novelty (Novelty): Is it just a recap of existing papers (like quoting Transformer-XL or standard Mamba) or highly inventive? (1=existing SOTA, 5=groundbreaking/creative).
        
        Output MUST be in the following raw JSON format:
        {{
            "factuality": <int 1-5>,
            "depth": <int 1-5>,
            "novelty": <int 1-5>,
            "justification": "<string analyzing the score>"
        }}
        """
        
        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json"
        )
        
        print("🧑‍⚖️ [Reviewer] Executing ResearcherBench Rubric Evaluation via Gemini 3.1 Pro...")
        response = self.client.models.generate_content(
            model=self.model,
            contents=rubric_prompt,
            config=config
        )
        
        try:
            return json.loads(response.text)
        except Exception as e:
            print(f"❌ Failed to parse JSON rubric score. Output: {response.text}")
            return {"factuality": 1, "depth": 1, "novelty": 1, "justification": "error"}

    async def run(self):
        print("\n" + "="*70)
        print("🚀 Starting ResearcherBench Integration Test")
        print("="*70)
        
        # 1. Generate Idea
        idea = await self.generate_scientific_insight()
        print("\n[Idea Snippet]:")
        print(idea[:500] + "...\n")
        
        # 2. Evaluate Idea
        scores = await self.evaluate_insight(idea)
        
        factuality = scores.get("factuality", 0)
        depth = scores.get("depth", 0)
        novelty = scores.get("novelty", 0)
        
        # Geometric Mean of ResearcherBench
        geo_mean = (factuality * depth * novelty) ** (1/3) if (factuality*depth*novelty) > 0 else 0
        
        print("\n" + "="*70)
        print("📊 ResearcherBench AI Scientist Evaluation Report")
        print("="*70)
        print(f"Factuality (Theoretical Soundness): {factuality} / 5")
        print(f"Depth      (Structural Coherence):  {depth} / 5")
        print(f"Novelty    (Frontier Creativity):   {novelty} / 5")
        print("-" * 70)
        print(f"-> ResearcherBench Final Score (GeoMean): {geo_mean:.2f} / 5.00")
        print(f"-> Reviewer Justification:\n{scores.get('justification', '')}")
        print("="*70)

async def main():
    evaluator = ResearcherBenchEvaluator()
    await evaluator.run()

if __name__ == "__main__":
    asyncio.run(main())
