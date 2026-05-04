from __future__ import annotations

import unittest
from unittest import mock

from ai_service.llm import (
    ModelUnavailableError,
    get_gemini_response,
    stream_gemini_response,
)


class _FakeStreamChunk:
    def __init__(self, text: str):
        self.text = text


async def _async_iter(items):
    for item in items:
        yield item


class TestGetGeminiResponse(unittest.IsolatedAsyncioTestCase):
    async def test_raises_when_no_model_configured(self):
        """No task, no model_id → must raise instead of silently using an old model."""
        with (
            mock.patch("ai_service.llm.client", mock.Mock()),
            mock.patch("ai_service.llm.gemini_cache", {}),
        ):
            with self.assertRaises(ModelUnavailableError):
                await get_gemini_response(prompt="hello", use_cache=False)

    async def test_raises_when_client_not_configured(self):
        with mock.patch("ai_service.llm.client", None):
            with self.assertRaises(ModelUnavailableError):
                await get_gemini_response(prompt="hello", task="mechanism_tree")


class TestStreamGeminiResponse(unittest.IsolatedAsyncioTestCase):
    async def test_passes_yaml_settings_to_client(self):
        """stream_gemini_response must read model/temperature/max_tokens from model_config.yaml."""
        fake_stream = _async_iter([_FakeStreamChunk("hello "), _FakeStreamChunk("world")])
        stream_mock = mock.AsyncMock(return_value=fake_stream)

        fake_client = mock.Mock()
        fake_client.aio.models.generate_content_stream = stream_mock

        with mock.patch("ai_service.llm.client", fake_client):
            chunks: list[str] = []
            async for text in stream_gemini_response(
                prompt="Query: test",
                system_instruction="sys",
                task="mechanism_tree",
            ):
                chunks.append(text)

        self.assertEqual(chunks, ["hello ", "world"])

        stream_mock.assert_awaited_once()
        kwargs = stream_mock.await_args.kwargs
        # mechanism_tree task in model_config.yaml uses gemini-3.1-flash-lite-preview / temp=1.0 / max_tokens=8192.
        self.assertEqual(kwargs["model"], "gemini-3.1-flash-lite-preview")
        config = kwargs["config"]
        self.assertEqual(config.temperature, 1.0)
        self.assertEqual(config.max_output_tokens, 8192)
        self.assertEqual(config.response_mime_type, "text/plain")
        # default.thinking_level = "LOW" should be inherited.
        self.assertIsNotNone(config.thinking_config)
        self.assertEqual(config.thinking_config.thinking_level, "LOW")

    async def test_raises_when_no_model_configured(self):
        with mock.patch("ai_service.llm.client", mock.Mock()):
            with self.assertRaises(ModelUnavailableError):
                agen = stream_gemini_response(prompt="x")
                async for _ in agen:
                    pass

    async def test_raises_when_client_not_configured(self):
        with mock.patch("ai_service.llm.client", None):
            with self.assertRaises(ModelUnavailableError):
                agen = stream_gemini_response(prompt="x", task="mechanism_tree")
                async for _ in agen:
                    pass


if __name__ == "__main__":
    unittest.main()
