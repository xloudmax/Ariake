import os
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "apps/ai-service/.env")

def verify_gemini_31_express():
    api_key = os.getenv("GOOGLE_CLOUD_API_KEY")
    model_id = os.getenv("LLM_MODEL", "gemini-3.1-flash-lite-preview")

    if not api_key:
        print("❌ 错误: 请先在 apps/ai-service/.env 中设置 GOOGLE_CLOUD_API_KEY")
        return

    # 初始化为 Express Mode (快捷模式)
    # 注意：这里只传 api_key，不传 project/location
    client = genai.Client(
        vertexai=True,
        api_key=api_key
    )

    print(f"正在使用 Express Mode 连接 {model_id}...")

    try:
        # 配置 2026 最新特性：思维链 (Thinking Mode)
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="LOW"),
            temperature=1.0
        )

        response = client.models.generate_content(
            model=model_id,
            contents="你好！确认一下你的身份。你现在开启了 Thinking Mode 吗？",
            config=config
        )

        print(f"\n✅ 验证通过！Gemini 回复：\n")
        print(response.text)
        
    except Exception as e:
        print(f"\n❌ 连接依然失败!")
        print(f"错误详情: {str(e)}")

if __name__ == "__main__":
    verify_gemini_31_express()
