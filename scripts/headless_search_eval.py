import os
import asyncio
import requests
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Config
REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "apps/ai-service/.env")
BACKEND_URL = "http://localhost:11451"

# LLM Config — use google-genai SDK which handles Vertex AI keys natively
API_KEY = os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("LLM_API_KEY")
JUDGE_MODEL = "gemini-3.1-flash-lite-preview"  # Hardcoded; .env LLM_MODEL uses Vertex AI format

async def get_judge(answer, query):
    if not API_KEY:
        return "⚠️ Skipped. No API key configured for evaluation."

    try:
        from google import genai
        client = genai.Client(api_key=API_KEY)
        prompt = f"""You are an elite AI Output Auditor. Read the question below and the AI's generated answer.
Assess the answer for:
1. Accuracy / Factual Correctness
2. Depth of Reasoning
3. Relevance to the Question
Provide a strictly numerical score out of 10 on the first line (e.g. "SCORE: 8/10"), followed by a 1-sentence justification.

Question: {query}
Answer: {answer}
"""
        response = client.models.generate_content(model=JUDGE_MODEL, contents=prompt)
        return response.text.strip()
    except Exception as e:
        return f"⚠️ LLM evaluation failed: {e}"

def test_local_search(query):
    url = f"{BACKEND_URL}/api/graph/search"
    payload = {"query": query, "max_hops": 2}
    
    print(f"\n=============================================")
    print(f"🌲 LOCAL SEARCH EVALUATION: '{query}'")
    print(f"=============================================")
    
    start_time = time.time()
    try:
        res = requests.post(url, json=payload, timeout=10)
        res.raise_for_status()
        data = res.json()
        latency = time.time() - start_time
        
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        
        print(f"✅ SUCCESS: Repro Latency: {latency:.2f}s")
        print(f"📊 Nodes found: {len(nodes)} (Target: >0)")
        print(f"📊 Edges found: {len(edges)}")
        
        if len(nodes) == 0:
            print("❌ FAILED: No nodes fetched! Is DB empty or search_vector missing?")
        else:
            seeds = [n for n in nodes if n.get('hop_level') == 0]
            print(f"🌱 Top Seed Nodes:")
            for n in seeds[:3]:
                print(f"   - {n['name']} (Score: {n.get('score', 0):.2f})")
    except Exception as e:
        print(f"❌ FAILED local search request: {e}")

async def test_global_search(query):
    url = f"{BACKEND_URL}/api/graph/global-search"
    # Note: Using stream stream=False since the frontend supports standard block or event stream
    payload = {"query": query}
    
    print(f"\n=============================================")
    print(f"🌍 GLOBAL SEARCH EVALUATION: '{query}'")
    print(f"=============================================")
    
    start_time = time.time()
    try:
        # Backend defaults to stream context, but if simple POST, wait for JSON.
        headers = {"Content-Type": "application/json"}
        # Some backends stream by default on /api/graph/global-search
        # We will assume JSON or plain text. Let's send header requesting JSON.
        res = requests.post(url, json=payload, headers=headers, timeout=160)
        res.raise_for_status()
        latency = time.time() - start_time
        
        print(f"✅ SUCCESS: API call returned 200 OK (Latency: {latency:.2f}s)")
        
        # Determine if it's SSE or normal JSON
        if "text/event-stream" in res.headers.get("Content-Type", ""):
            print("📥 Streaming response detected, gathering chunks...")
            full_answer = ""
            for line in res.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith("data: "):
                        data_payload = decoded[6:]
                        if data_payload != "[DONE]":
                            try:
                                chunk = json.loads(data_payload)
                                full_answer += chunk.get("text", "")
                            except:
                                pass
        else:
            data = res.json()
            full_answer = data.get('answer', str(data))
            
        print(f"📝 Answer Length: {len(full_answer)} characters")
        if len(full_answer) < 10:
             print("❌ FAILED: Answer too short!")
        else:
             print("\n🤖 [LLM JUDGE EVALUATION]:")
             eval_result = await get_judge(full_answer, query)
             print(f"{eval_result}\n")
    except Exception as e:
        print(f"❌ FAILED global search request: {e}")

async def main():
    print("🚀 Starting Headless Test Suite...\n")
    # 1. Local Search Tests
    test_local_search("沙漠")
    test_local_search("React 19")
    
    # 2. Global Search Tests
    # Note: this might take 30-40 seconds for AI to compute
    await test_global_search("对比沙漠生态系统与前端技术发展的演化")

if __name__ == "__main__":
    asyncio.run(main())
