import os
import asyncio
import asyncpg
from ai_service.script_support import load_service_env

load_service_env()


async def check_connection():
    url = os.getenv("GRAPH_DATABASE_URL")
    print(f"Testing connection to: {url}")
    if not url:
        print("GRAPH_DATABASE_URL is not configured.")
        return
    try:
        conn = await asyncpg.connect(url)
        print("Successfully connected to PostgreSQL!")

        has_vector = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')"
        )
        print(f"pgvector extension installed: {'yes' if has_vector else 'no'}")

        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(check_connection())
