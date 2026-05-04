from __future__ import annotations

import json
import unittest
from unittest import mock

from fastapi.testclient import TestClient

from ai_service.app import create_app


class _FakeTask:
    def cancel(self):
        return None

    def add_done_callback(self, _callback):
        return None

    def cancelled(self):
        return False

    def exception(self):
        return None

    def __await__(self):
        async def _done():
            return None

        return _done().__await__()


class _FakeConn:
    async def execute(self, _query):
        return None


class _FakeAcquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakePool:
    def __init__(self, conn=None):
        self.conn = conn or _FakeConn()

    def acquire(self):
        return _FakeAcquire(self.conn)


class AppRouteTests(unittest.TestCase):
    def build_client(self):
        patches = [
            mock.patch("ai_service.api.load_caches", return_value=None),
            mock.patch("ai_service.api.save_caches", return_value=None),
            mock.patch("ai_service.api.db.init_db_pool", new=mock.AsyncMock()),
            mock.patch("ai_service.api.db.close_db_pool", new=mock.AsyncMock()),
        ]
        stack = []
        for patcher in patches:
            stack.append(patcher.start())
            self.addCleanup(patcher.stop)
        return TestClient(create_app())

    def test_health_contract(self):
        with self.build_client() as client:
            response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"status": "healthy", "service": "C404 Insight AI"}
        )

    def test_db_health_disconnected(self):
        with mock.patch("ai_service.api.db.db_connected", return_value=False):
            with self.build_client() as client:
                response = client.get("/db-health")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["status"], "disconnected")

    def test_db_health_connected(self):
        with (
            mock.patch("ai_service.api.db.db_connected", return_value=True),
            mock.patch("ai_service.api.db.get_db_pool", return_value=_FakePool()),
        ):
            with self.build_client() as client:
                response = client.get("/db-health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "connected")

    def test_db_health_bypasses_api_key_requirement(self):
        with (
            mock.patch("ai_service.app.AI_SERVICE_API_KEY", "secret"),
            mock.patch("ai_service.api.db.db_connected", return_value=False),
        ):
            with self.build_client() as client:
                response = client.get("/db-health")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["status"], "disconnected")

    def test_generate_mechanism_tree_fallback(self):
        with mock.patch(
            "ai_service.mechanism_tree.client_configured", return_value=False
        ):
            with self.build_client() as client:
                response = client.post(
                    "/generate/mechanism-tree", json={"query": "water harvesting"}
                )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["tree_metadata"]["query"], "water harvesting")
        self.assertGreaterEqual(len(payload["nodes"]), 1)

    def test_generate_mechanism_tree_stream_fallback_uses_sse_contract(self):
        with mock.patch(
            "ai_service.mechanism_tree.client_configured", return_value=False
        ):
            with self.build_client() as client:
                response = client.post(
                    "/generate/mechanism-tree/stream",
                    json={"query": "water harvesting"},
                )
        self.assertEqual(response.status_code, 200)
        self.assertIn('"type": "metadata"', response.text)
        self.assertIn('"type": "node"', response.text)
        self.assertIn("[DONE]", response.text)

    def test_extract_knowledge_manual_data_schedules_upsert(self):
        scheduled = {"called": False}
        upsert_mock = mock.AsyncMock()

        def fake_create_task(coro):
            scheduled["called"] = True
            coro.close()
            return _FakeTask()

        manual_data = {
            "entities": [
                {"name": "Lotus", "type": "plant", "description": "Hydrophobic leaf"}
            ],
            "relationships": [],
        }
        with mock.patch("ai_service.api.upsert_knowledge", upsert_mock):
            with mock.patch(
                "ai_service.api.asyncio.create_task", side_effect=fake_create_task
            ):
                with self.build_client() as client:
                    response = client.post(
                        "/extract/knowledge",
                        json={
                            "text": "",
                            "manual_data": manual_data,
                            "source_metadata": {"post_id": "42", "slug": "react-19"},
                        },
                    )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(scheduled["called"])
        self.assertEqual(response.json(), manual_data)
        self.assertEqual(upsert_mock.call_count, 1)
        self.assertEqual(
            upsert_mock.call_args.args[1], {"post_id": "42", "slug": "react-19"}
        )

    def test_extract_knowledge_repairs_malformed_relationships(self):
        fake_content = json.dumps(
            {
                "entities": [{"label": "React 19", "content": "Compiler-driven React"}],
                "relationships": [
                    {"source": "React 19", "target": "React Compiler"},
                    {"from": "createRoot", "to": "Concurrent Rendering", "type": "enables"},
                ],
            },
            ensure_ascii=False,
        )
        with mock.patch("ai_service.api.client_configured", return_value=True), mock.patch(
            "ai_service.api.get_gemini_response",
            new=mock.AsyncMock(return_value=fake_content),
        ), mock.patch("ai_service.api.upsert_knowledge", mock.AsyncMock()):
            with self.build_client() as client:
                response = client.post("/extract/knowledge", json={"text": "React 19"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["entities"][0]["name"], "React 19")
        self.assertEqual(payload["entities"][0]["type"], "concept")
        self.assertEqual(payload["relationships"][0]["relation_type"], "uses")
        self.assertEqual(payload["relationships"][1]["relation_type"], "enables")

    def test_global_search_bypass_critic_shape(self):
        with mock.patch("ai_service.api.db.db_connected", return_value=True), \
             mock.patch(
            "ai_service.api.perform_global_search",
            new=mock.AsyncMock(return_value={"answer": "draft body", "is_draft": True}),
        ):
            with self.build_client() as client:
                response = client.post(
                    "/graph/global-search",
                    json={"query": "x", "search_mode": "vector", "bypass_critic": True},
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["is_draft"], True)

    def test_global_search_no_results_shape(self):
        with mock.patch("ai_service.api.db.db_connected", return_value=True), \
             mock.patch(
            "ai_service.api.perform_global_search",
            new=mock.AsyncMock(
                return_value={
                    "answer": "No relevant knowledge communities found after relevancy pruning."
                }
            ),
        ):
            with self.build_client() as client:
                response = client.post(
                    "/graph/global-search", json={"query": "x", "search_mode": "hybrid"}
                )
        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "No relevant knowledge communities found", response.json()["answer"]
        )

    def test_global_search_returns_structured_sections_contract(self):
        payload = {
            "answer": "summary",
            "sections": {
                "mechanism_check": {"body": "ok", "verdict": "sound"},
                "search_diagnostics": {
                    "intent_type": "convergent",
                    "recommended_vector_weight": 0.2,
                    "barrier_triggered": False,
                },
                "global_insight": {"summary": "insight", "details": []},
                "action_summary": [],
            },
            "format_version": "v2",
            "format_kind": "structured_json",
            "sanitized": True,
        }
        with mock.patch("ai_service.api.db.db_connected", return_value=True), \
             mock.patch(
            "ai_service.api.perform_global_search",
            new=mock.AsyncMock(return_value=payload),
        ):
            with self.build_client() as client:
                response = client.post(
                    "/graph/global-search", json={"query": "x", "search_mode": "hybrid"}
                )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["format_version"], "v2")
        self.assertEqual(body["format_kind"], "structured_json")
        self.assertTrue(body["sanitized"])
        self.assertEqual(body["sections"]["mechanism_check"]["verdict"], "sound")

    def test_global_search_stream_db_missing_returns_done_event(self):
        with mock.patch("ai_service.api.db.db_connected", return_value=False):
            with self.build_client() as client:
                response = client.post(
                    "/graph/global-search/stream",
                    json={"query": "x", "search_mode": "hybrid"},
                )
        self.assertEqual(response.status_code, 200)
        self.assertIn('"type": "done"', response.text)
        self.assertIn("Database missing", response.text)

    def test_embedding_requires_configured_model(self):
        with mock.patch("ai_service.api.client_configured", return_value=False):
            with self.build_client() as client:
                response = client.post("/embedding", json={"text": "hello"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("not configured", response.json()["error"])

    def test_global_search_rejects_invalid_search_mode(self):
        with self.build_client() as client:
            response = client.post(
                "/graph/global-search", json={"query": "x", "search_mode": "vectro"}
            )
        self.assertEqual(response.status_code, 422)
