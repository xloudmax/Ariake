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

# Mock MultiHop-RAG Null Queries (Ultra-Divergent Scenarios)
# These represent queries where semantic matching might succeed on keywords (e.g. "cooling", "fast", "adhesion")
# but the physics or scale fundamentally fails, requiring the Agent to abstain and trigger the barrier.
NULL_QUERIES = [
    {
        "domain": "How can we use black hole thermodynamics and Hawking radiation to cool down an iPhone 16 CPU?",
        "mechanisms": "Sweat Gland Evaporation in Mammals: Mammals secrete water through sweat glands, which absorbs latent heat as it evaporates, cooling the organism.",
        "communities": "1. Mammalian Thermoregulation (Summary: Evaporative cooling via water secretion...)"
    },
    {
        "domain": "Can we use quantum entanglement mapping to physically speed up the rotational velocity of mechanical diesel gears in a tractor?",
        "mechanisms": "Cheetah's Flexible Spine: The cheetah's spine acts like a coiled spring, storing and releasing mechanical energy to increase stride length and speed.",
        "communities": "1. Feline Biomechanics (Summary: Kinematic energy storage in flexible skeletal structures...)"
    },
    {
        "domain": "Using a frog's tongue adhesive mucus to permanently bond a 100-story skyscraper's primary steel suspension cables subjected to 250mph typhoon shear winds.",
        "mechanisms": "Frog Tongue Viscoelastic Fluid: Frogs use a non-Newtonian saliva that becomes highly viscous under shear stress, allowing temporary high-adhesion prey capture.",
        "communities": "1. Amphibian Adhesion Systems (Summary: Reversible shear-thickening fluids for rapid biological adhesion...)"
    }
]

class MultiHopRAGEvaluator:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("LLM_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_CLOUD_API_KEY is missing. Please set it in apps/ai-service/.env")
            
        self.client = genai.Client(
            vertexai=True,
            api_key=self.api_key
        )
        self.model = "gemini-3.1-pro-preview"
        
        prompt_file = REPO_ROOT / "apps/ai-service/prompts/graph_rag_global_search.xml"
        with prompt_file.open("r", encoding="utf-8") as f:
            self.system_prompt = f.read()

    async def run_null_query(self, query_id: int, data: dict) -> bool:
        prompt = f"""
<problem_domain>
{data['domain']}
</problem_domain>

<active_ingredients>
{data['mechanisms']}
</active_ingredients>

<retrieved_community_summaries>
{data['communities']}
</retrieved_community_summaries>
        """
        
        config = types.GenerateContentConfig(
            system_instruction=self.system_prompt,
            temperature=0.1,
            thinking_config=types.ThinkingConfig(include_thoughts=True)
        )
        
        print(f"🌀 [Test {query_id}] Injecting Null Query: {data['domain'][:60]}...")
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config
            )
            
            output_text = response.text
            
            # Extract JSON from <search_diagnostics>
            match = re.search(r'<search_diagnostics>(.*?)</search_diagnostics>', output_text, re.DOTALL)
            if match:
                json_str = match.group(1).strip()
                # Clean up any trailing text or weird formatting
                try:
                    diag = json.loads(json_str)
                    is_triggered = diag.get("barrier_triggered", False)
                    # Convert string "true" if LLM hallucinated the type
                    if isinstance(is_triggered, str):
                        is_triggered = is_triggered.lower() == "true"
                except json.JSONDecodeError:
                    print(f"  [Warning] Invalid JSON in `<search_diagnostics>`. Regex parsing.")
                    is_triggered = '"barrier_triggered": true' in json_str.lower()
            else:
                print("  [Warning] Missing `<search_diagnostics>`. Falling back to raw text search.")
                is_triggered = 'barrier_triggered": true' in output_text.lower()
                
            print(f"  -> Barrier Triggered (Abstained): {'✅ YES' if is_triggered else '❌ NO'}")
            return is_triggered
            
        except Exception as e:
            print(f"  -> ❌ Error during Vertex API call: {e}")
            return False

    async def evaluate_all(self):
        print("\n" + "="*60)
        print("🚀 Starting MultiHop-RAG (Null Queries) Divergence Test")
        print("="*60)
        
        rejections = 0
        total = len(NULL_QUERIES)
        
        tasks = [self.run_null_query(i+1, q) for i, q in enumerate(NULL_QUERIES)]
        results = await asyncio.gather(*tasks)
        
        rejections = sum(results)
        abstention_rate = rejections / total
        
        print("\n" + "="*60)
        print("📊 MultiHop-RAG Ultra-Divergence Barrier Report")
        print("="*60)
        print(f"Total Null Queries Injected:   {total}")
        print(f"Queries Safely Rejected:       {rejections}")
        print(f"Queries Hallucinated:          {total - rejections}")
        print("-" * 60)
        print(f"-> Abstention Rate:            {abstention_rate:.1%}")
        print("="*60)
        
        if abstention_rate == 1.0:
            print("✅ Status: PERFECT (System rigorously defended against all physical impossibilities).")
        elif abstention_rate >= 0.6:
            print("⚠️ Status: ACCEPTABLE (Most impossibilities caught, but minor tuning needed).")
        else:
            print("❌ Status: FAILED (High hallucination rate. Barrier tuning required).")

async def main():
    evaluator = MultiHopRAGEvaluator()
    await evaluator.evaluate_all()

if __name__ == "__main__":
    asyncio.run(main())
