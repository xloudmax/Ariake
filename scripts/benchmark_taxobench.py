import os
import json
import asyncio
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "apps/ai-service/.env")

# TaxoBench-CS Mock Ground Truth (Computer Science -> AI)
# Represents an expert-crafted target topology.
TAXO_GROUND_TRUTH = {
    "root": "Artificial Intelligence",
    "edges": [
        ("artificial intelligence", "machine learning"),
        ("artificial intelligence", "natural language processing"),
        ("artificial intelligence", "computer vision"),
        ("machine learning", "deep learning"),
        ("machine learning", "reinforcement learning"),
        ("deep learning", "convolutional neural networks"),
        ("deep learning", "transformers"),
        ("natural language processing", "machine translation"),
        ("natural language processing", "named entity recognition"),
        ("computer vision", "object detection"),
        ("computer vision", "image segmentation")
    ]
}

class TaxoBenchEvaluator:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_CLOUD_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_CLOUD_API_KEY is missing. Please set it in apps/ai-service/.env")
            
        self.client = genai.Client(
            vertexai=True,
            api_key=self.api_key
        )
        self.model = "gemini-3.1-flash-lite-preview"

    async def generate_drr_tree(self, root_concept: str) -> list[tuple[str, str]]:
        system_instruction = """
        You are the DRR Mechanism Tree Extractor. 
        Your task is to take a root Computer Science concept and break it down into a strict hierarchical taxonomy tree.
        Output MUST be in a raw JSON array format, where each object has exactly two keys: 'parent' and 'child'.
        Do not include markdown formatting like ```json. Just return the raw JSON array.
        Extract up to 3 levels of depth, focusing on the most critical sub-domains.
        Example output:
        [
            {"parent": "Artificial Intelligence", "child": "Machine Learning"},
            {"parent": "Machine Learning", "child": "Deep Learning"}
        ]
        """
        
        prompt = f"Extract the taxonomy tree for the concept: {root_concept}"
        
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.1,
            response_mime_type="application/json"
        )
        
        print(f"🌲 [DRR] Generating Mechanism Tree via {self.model} for [{root_concept}]...")
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config
        )
        
        try:
            edges_data = json.loads(response.text)
            predicted_edges = []
            for item in edges_data:
                parent = item.get("parent", "").strip().lower()
                child = item.get("child", "").strip().lower()
                if parent and child:
                    predicted_edges.append((parent, child))
            return predicted_edges
        except Exception as e:
            print(f"❌ Failed to parse JSON tree structure. Raw output:\n{response.text}\nError: {e}")
            return []

    def compute_hsr_metrics(self, gt_edges: list, pred_edges: list):
        gt_set = set(gt_edges)
        pred_set = set(pred_edges)
        
        intersection = gt_set.intersection(pred_set)
        
        precision = len(intersection) / len(pred_set) if pred_set else 0
        recall = len(intersection) / len(gt_set) if gt_set else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) else 0
        
        print("\n" + "="*50)
        print("📊 TaxoBench-CS Topology Purity Report (DRR Integration)")
        print("="*50)
        print(f"Ground Truth Edges (Human Experts):  {len(gt_set)}")
        print(f"DRR Generated Edges (Gemini Flash):  {len(pred_set)}")
        print(f"Exact Topological Intersections:     {len(intersection)}")
        print("-" * 50)
        print(f"-> Precision (Purity):               {precision:.1%}")
        print(f"-> Recall (Coverage):                {recall:.1%}")
        print(f"-> F1 Score (Hierarchical Struct):   {f1:.1%}")
        print("="*50)
        
        if f1 > 0.6:
            print("✅ Status: PASSED (Structural consistency exceeds 60% baseline).")
        else:
            print("⚠️ Status: WARNING (High topological divergence).")

async def main():
    try:
        evaluator = TaxoBenchEvaluator()
        pred_edges = await evaluator.generate_drr_tree(TAXO_GROUND_TRUTH["root"])
        
        print(f"\n[Generated Edges Sample]:")
        for edge in pred_edges[:5]:
            print(f"  {edge[0]} -> {edge[1]}")
        print("  ...")
            
        evaluator.compute_hsr_metrics(TAXO_GROUND_TRUTH["edges"], pred_edges)
    except Exception as e:
        print(f"Execution Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
