import os
import json
import asyncio
import pandas as pd
from typing import Dict, Any, List
from google.genai import types

# Import core LLM logic from main (assuming relative import or path management)
# For this demonstration, we'll define a specialized wrapper for the academic pipeline

class AcademicWriterAgent:
    def __init__(self, api_key: str):
        from google.genai import Client
        self.client = Client(api_key=api_key, vertexai=False)
        self.flash_model = "publishers/google/models/gemini-3.1-flash-lite-preview"
        self.pro_model = "publishers/google/models/gemini-3.1-pro-preview"

    async def get_response(self, model: str, prompt: str, system_instruction: str = None, thinking: bool = False) -> str:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.4,
        )
        if thinking and "pro" in model:
            config.thinking_config = types.ThinkingConfig(include_thoughts=True)
            # Thinking mode currently requires specific candidate extraction in main.py logic

        response = self.client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        
        # Simple extraction for the script demo
        try:
            return response.candidates[0].content.parts[0].text
        except:
            return str(response)

    async def run_pipeline(self, benchmark_results_path: str):
        print(f"Loading benchmark data from {benchmark_results_path}...")
        results = pd.read_csv(benchmark_results_path)
        last_run = results.tail(3).to_json(orient="records")
        
        system_instruction = """
        Role: Ambitious AI Researcher.
        Format: LaTeX style, max 8 pages. Use \citep{} and \citet{}.
        No Acknowledgements. Standard structure: Title, Abstract, Intro, Related Work, Method, Experiments, Conclusion.
        """

        # Stage 1: Drafting
        draft_prompt = f"""
        # Goal
        Write a complete academic paper draft based on the DRR (Tree-Graph Dual Representation Reasoning) framework results.
        
        # Experimental Results
        {last_run}
        
        # Task
        Follow the global system instruction and synthesize the paper in Markdown format (intended for LaTeX conversion).
        """
        print("Stage 1: Generating Initial Draft...")
        draft = await self.get_response(self.flash_model, draft_prompt, system_instruction)
        
        # Stage 2: Critique
        critique_prompt = f"""
        # Role
        Expert Scientific Manuscript Reviewer.
        
        # Manuscript to Review
        {draft}
        
        # Objective Evidence
        {last_run}
        
        # Feedback Criteria
        - Falsification: check text against data.
        - Guideline Adherence.
        - Missing Citations.
        - Suggestions for Clarity.
        """
        print("Stage 2: Critical Audit (Gemini 3.1 Pro)...")
        critique = await self.get_response(self.pro_model, critique_prompt, thinking=True)
        
        # Stage 3: Refinement
        refine_prompt = f"""
        # Goal
        Refine the following draft based on the Reviewer's feedback.
        
        # Original Draft
        {draft}
        
        # Feedback
        {critique}
        
        # Rule
        DO NOT INVENT DATA. Frame unsupported requests as 'Future Work'.
        """
        print("Stage 3: Final Refinement...")
        final_paper = await self.get_response(self.flash_model, refine_prompt, system_instruction)
        
        return {
            "draft": draft,
            "critique": critique,
            "final_paper": final_paper
        }

if __name__ == "__main__":
    import sys
    # Load API Key from environment
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Please set GOOGLE_API_KEY environment variable.")
        sys.exit(1)
        
    agent = AcademicWriterAgent(api_key)
    results_path = "/Users/shenyufei/workspace/C404-blog/apps/ai-service/drr_benchmark_results.csv"
    
    loop = asyncio.get_event_loop()
    output = loop.run_until_complete(agent.run_pipeline(results_path))
    
    with open("DRR_Academic_Final_Manuscript.md", "w") as f:
        f.write("# Final Peer-Reviewed Manuscript\n\n")
        f.write(output["final_paper"])
        f.write("\n\n--- \n# Reviewer Feedback (Thinking Process)\n\n")
        f.write(output["critique"])
    
    print("Paper generated: DRR_Academic_Final_Manuscript.md")
