import os
import asyncio
from pathlib import Path
from openai import AsyncOpenAI
from dotenv import load_dotenv

# 加载配置
REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "apps/ai-service/.env")

async def verify_gemini():
    # 修复拼写错误
    api_key = os.getenv("LLM_API_KEY")
    # 使用 v1beta 的 API Key 兼容端点
    base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
    model = os.getenv("LLM_MODEL", "gemini-2.0-flash")

    if not api_key or "your_gemini_api_key" in api_key:
        print("❌ 错误: 请先在 apps/ai-service/.env 中设置有效的 LLM_API_KEY")
        return

    print(f"正在连接 Gemini API...")
    print(f"模型: {model}")

    # 对于 Google AI Studio API Key，OpenAI SDK 需要设置 api_key 
    # 并且在特定区域可能需要 base_url 后缀
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url
    )

    try:
        print("\n--- 发送测试请求 ---")
        # 尝试简单请求
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Say 'Connection Success!' if you can read this."}
            ]
        )
        
        answer = response.choices[0].message.content
        print(f"\n✅ 验证通过！回复内容：")
        print(f"-> {answer}")
        
    except Exception as e:
        print(f"\n❌ 连接失败!")
        print(f"错误详情: {str(e)}")
        
        if "API keys are not supported" in str(e):
            print("\n💡 关键修复方案：")
            print("您使用的端点可能由于地理位置或配置原因要求 OAuth2。")
            print("请尝试直接访问 Google 的原生 API 格式（绕过 OpenAI SDK）来确认 Key 是否有效。")
            print("或者，检查您是否在 AI Studio 中创建了 API Key，而不是在 Google Cloud Console 中。")

if __name__ == "__main__":
    asyncio.run(verify_gemini())
