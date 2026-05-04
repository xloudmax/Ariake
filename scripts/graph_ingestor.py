import sqlite3
import requests
import json
import time
import os
from pathlib import Path

# --- 配置 ---
REPO_ROOT = Path(__file__).resolve().parent.parent
SQLITE_DB_PATH = REPO_ROOT / "apps/backend/blog_platform.db"
AI_SERVICE_URL = "http://127.0.0.1:11451/extract/knowledge"
CHECKPOINT_FILE = Path(__file__).resolve().parent / "ingest_checkpoint.json"

def load_checkpoint():
    if CHECKPOINT_FILE.exists():
        with CHECKPOINT_FILE.open('r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_checkpoint(checkpoint):
    with CHECKPOINT_FILE.open('w', encoding='utf-8') as f:
        json.dump(checkpoint, f, indent=2)

def ingest_knowledge():
    if not SQLITE_DB_PATH.exists():
        print(f"Error: SQLite database not found at {SQLITE_DB_PATH}")
        return

    # 1. 加载上次进度
    checkpoint = load_checkpoint()
    
    # 2. 连接 SQLite
    try:
        conn = sqlite3.connect(str(SQLITE_DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 获取所有已发布的文章
        # 增加 updated_at 字段以便检测内容更新
        cursor.execute("SELECT id, title, content, updated_at FROM blog_post WHERE status = 'PUBLISHED' OR status IS NULL ORDER BY id DESC")
        posts = cursor.fetchall()
        print(f"Found {len(posts)} total posts in SQLite.")
        
    except Exception as e:
        print(f"Database error: {e}")
        return
    finally:
        if 'conn' in locals():
            conn.close()

    # 3. 过滤出需要处理的文章 (增量逻辑)
    to_process = []
    for post in posts:
        post_id = str(post['id'])
        updated_at = str(post['updated_at'])
        
        # 如果 ID 不在记录中，或者更新时间比记录中新，则需要处理
        if post_id not in checkpoint or checkpoint[post_id] != updated_at:
            to_process.append(post)

    if not to_process:
        print("Everything is up to date! No new knowledge to ingest.")
        return

    print(f"Processing {len(to_process)} new or updated posts...")

    # 4. 遍历并注入
    success_count = 0
    try:
        for post in to_process:
            post_id = str(post['id'])
            title = post['title']
            content = post['content']
            updated_at = str(post['updated_at'])
            
            print(f"[{success_count+1}/{len(to_process)}] Processing: {title[:30]}...")
            
            payload = {"text": f"Title: {title}\n\nContent: {content}"}
            
            try:
                response = requests.post(AI_SERVICE_URL, json=payload, timeout=60)
                if response.status_code == 200:
                    # 关键：处理成功后立即更新进度记录
                    checkpoint[post_id] = updated_at
                    success_count += 1
                    # 每处理 5 篇保存一次文件，防止断电丢失
                    if success_count % 5 == 0:
                        save_checkpoint(checkpoint)
                else:
                    print(f"  ❌ Failed: AI Service error {response.status_code}")
            except Exception as e:
                print(f"  ❌ Network error: {e}")
            
            time.sleep(1) # 限流保护
            
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Saving progress...")
    finally:
        save_checkpoint(checkpoint)

    print(f"\n--- Ingestion Complete ---")
    print(f"Newly processed: {success_count}/{len(to_process)}")
    print(f"Total knowledge base now covers {len(checkpoint)} posts.")

if __name__ == "__main__":
    ingest_knowledge()
