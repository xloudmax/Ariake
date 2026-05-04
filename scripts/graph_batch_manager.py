import sqlite3
import json
import os
import time
import requests
import re
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 加载配置
REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(REPO_ROOT / "apps/ai-service/.env")

# --- 配置 ---
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "project-830053bb-738a-4041-96a")
LOCATION = os.getenv("GOOGLE_CLOUD_REGION", "us-east4")
API_KEY = os.getenv("LLM_API_KEY")
GCS_BUCKET_NAME = "c404-blog-batch"
SQLITE_DB_PATH = REPO_ROOT / "apps/backend/blog_platform.db"
CHECKPOINT_FILE = SCRIPT_DIR / "ingest_checkpoint.json"
JOB_RECORD_FILE = SCRIPT_DIR / "batch_job_record.json"
MODEL_ID = "gemini-1.5-flash-002"

# 知识提取的 Prompt
KNOWLEDGE_EXTRACTION_PROMPT = """
You are an expert in knowledge graph construction. Extract entities and relationships from the text.
JSON FORMAT: Output a valid JSON object with `entities` and `relationships` lists.
"""

def get_client():
    return genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
        api_key=API_KEY if API_KEY else None
    )

def save_checkpoint(checkpoint):
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f, indent=2)

def submit_batch():
    """提交批处理作业"""
    client = get_client()
    
    if CHECKPOINT_FILE.exists():
        with CHECKPOINT_FILE.open('r', encoding='utf-8') as f:
            checkpoint = json.load(f)
    else: checkpoint = {}

    conn = sqlite3.connect(str(SQLITE_DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, updated_at FROM blog_post WHERE status = 'PUBLISHED' OR status IS NULL")
    posts = cursor.fetchall()
    conn.close()

    to_process = [p for p in posts if str(p['id']) not in checkpoint or checkpoint[str(p['id'])] != str(p['updated_at'])]

    if not to_process:
        print("Everything is up to date!")
        return

    input_file = SCRIPT_DIR / "batch_input.jsonl"
    with input_file.open('w', encoding='utf-8') as f:
        for post in to_process:
            item = {
                "request": {
                    "contents": [{"role": "user", "parts": [{"text": f"{KNOWLEDGE_EXTRACTION_PROMPT}\n\nTitle: {post['title']}\n\nContent: {post['content']}"}]}],
                    "generation_config": {"response_mime_type": "application/json"}
                }
            }
            f.write(json.dumps(item) + '\n')

    from google.cloud import storage
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    if not bucket.exists():
        bucket.create(location=LOCATION)
    
    blob = bucket.blob(input_file.name)
    blob.upload_from_filename(str(input_file))
    gcs_input_uri = f"gs://{GCS_BUCKET_NAME}/{input_file.name}"
    gcs_output_uri = f"gs://{GCS_BUCKET_NAME}/outputs/{int(time.time())}/"

    print(f"📦 Submitting batch job for {len(to_process)} posts...")
    batch_job = client.batches.create(
        model=MODEL_ID,
        src=gcs_input_uri,
        config=types.CreateBatchJobConfig(dest=gcs_output_uri)
    )

    job_info = {
        "job_name": batch_job.name,
        "output_uri": gcs_output_uri,
        "posts": {str(p['id']): str(p['updated_at']) for p in to_process}
    }
    with JOB_RECORD_FILE.open('w', encoding='utf-8') as f:
        json.dump(job_info, f, indent=2)

    print(f"🚀 Batch Job Created: {batch_job.name}")

def collect_results():
    """检查并收集结果"""
    if not JOB_RECORD_FILE.exists():
        print("No active job record.")
        return

    with JOB_RECORD_FILE.open('r', encoding='utf-8') as f:
        job_info = json.load(f)
    
    client = get_client()
    job = client.batches.get(name=job_info['job_name'])

    state_str = str(job.state).upper()
    if 'SUCCEEDED' not in state_str:
        print(f"Job is not finished yet. Current State: {job.state}")
        return
    
    print("✨ Job succeeded! Recovering results from GCS...")
    from google.cloud import storage
    storage_client = storage.Client(project=PROJECT_ID)
    
    output_path = job_info['output_uri'].replace(f"gs://{GCS_BUCKET_NAME}/", "")
    blobs = list(storage_client.list_blobs(GCS_BUCKET_NAME, prefix=output_path))
    
    if not blobs:
        print("⚠️ No blobs in path. Scanning entire bucket...")
        blobs = [b for b in storage_client.list_blobs(GCS_BUCKET_NAME) if 'predictions.jsonl' in b.name]

    success_count = 0
    error_count = 0
    upsert_url = "http://localhost:8000/extract/knowledge"

    for blob in blobs:
        if ".jsonl" in blob.name:
            print(f"Reading: {blob.name}")
            content = blob.download_as_text()
            for line in content.strip().split('\n'):
                if not line.strip(): continue
                try:
                    result = json.loads(line)
                    response_obj = result.get('response') or result.get('output')
                    if not response_obj or isinstance(response_obj, str): continue
                    
                    candidates = response_obj.get('candidates', [])
                    if not candidates: continue
                    
                    llm_text = candidates[0]['content']['parts'][0].get('text', "")
                    if not llm_text: continue

                    json_match = re.search(r'(\{.*\})', llm_text, re.DOTALL)
                    clean_json = json_match.group(1) if json_match else llm_text
                    clean_json = clean_json.replace('```json', '').replace('```', '').strip()
                    
                    # 关键：增加 strict=False 容忍非标准 JSON
                    extraction_data = json.loads(clean_json, strict=False)
                    
                    standard_entities = []
                    for e in extraction_data.get('entities', []):
                        if not isinstance(e, dict): continue
                        standard_entities.append({
                            "name": e.get('name') or e.get('label') or e.get('title') or "Unknown",
                            "type": e.get('type') or e.get('category') or "Entity",
                            "description": e.get('description') or e.get('content') or ""
                        })
                    
                    if not standard_entities: continue

                    standard_relationships = []
                    for r in extraction_data.get('relationships', []):
                        if not isinstance(r, dict): continue
                        standard_relationships.append({
                            "source": r.get('source') or r.get('from') or "",
                            "target": r.get('target') or r.get('to') or "",
                            "relation_type": r.get('relation_type') or r.get('type') or "relates_to",
                            "description": r.get('description') or ""
                        })

                    resp = requests.post(upsert_url, json={
                        "text": "BATCH_UPLOAD", 
                        "manual_data": {"entities": standard_entities, "relationships": standard_relationships}
                    }, timeout=30)
                    
                    if resp.status_code == 200:
                        success_count += 1
                        if success_count % 10 == 0: print(f"  Integrated {success_count}...")
                    else: error_count += 1
                except Exception as e:
                    error_count += 1

    if success_count > 0:
        if CHECKPOINT_FILE.exists():
            with CHECKPOINT_FILE.open('r', encoding='utf-8') as f:
                checkpoint = json.load(f)
        else: checkpoint = {}
        checkpoint.update(job_info['posts'])
        save_checkpoint(checkpoint)
        print(f"\n✅ Done! Integrated {success_count} posts. Errors: {error_count}")
    else:
        print("❌ No valid results found.")

def watch_job():
    if not JOB_RECORD_FILE.exists():
        print("No active job."); return
    with JOB_RECORD_FILE.open('r', encoding='utf-8') as f:
        job_info = json.load(f)
    client = get_client()
    while True:
        job = client.batches.get(name=job_info['job_name'])
        print(f"[{time.strftime('%H:%M:%S')}] Status: {job.state}")
        if 'SUCCEEDED' in str(job.state).upper(): break
        time.sleep(15)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2: print("Usage: ... [submit|collect|watch]")
    elif sys.argv[1] == "submit": submit_batch()
    elif sys.argv[1] == "collect": collect_results()
    elif sys.argv[1] == "watch": watch_job()
