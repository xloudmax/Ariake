"""List available Gemini models via the shared ai_service client."""

from ai_service.llm import client, client_configured


def main() -> None:
    if not client_configured():
        raise RuntimeError(
            "AI model client is not configured. Set GOOGLE_CLOUD_API_KEY or LLM_API_KEY."
        )

    print("Listing models...")
    for model in client.models.list():
        print(f"Model: {model.name}, Supported: {model.supported_actions}")


if __name__ == "__main__":
    main()
