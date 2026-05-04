from __future__ import annotations

import importlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from ai_service.script_support import (
    benchmark_eval_model,
    create_vertex_express_client,
    default_service_url,
    resolve_from_service,
    resolve_paper_core_query_file,
    service_request_headers,
)


class ScriptSupportTests(unittest.TestCase):
    def _import_module_with_env(self, module_name: str, env: dict[str, str]):
        import sys

        sys.modules.pop(module_name, None)
        with mock.patch.dict("os.environ", env, clear=False):
            return importlib.import_module(module_name)

    @unittest.skipIf(not resolve_from_service("benchmarks", "results", "benchmark_queries.json").exists(), "Dataset missing in CI")
    def test_benchmark_dataset_path_resolves(self):
        dataset = resolve_from_service(
            "benchmarks", "results", "benchmark_queries.json"
        )
        self.assertTrue(dataset.exists())

    @unittest.skipIf(not resolve_paper_core_query_file().exists(), "Dataset missing in CI")
    def test_paper_core_query_file_resolves_v2(self):
        with mock.patch.dict(
            "os.environ", {"PAPER_CORE_QUERY_VERSION": "paper_core_v2"}, clear=False
        ):
            query_file = resolve_paper_core_query_file()
        self.assertTrue(query_file.exists())
        self.assertEqual(query_file.name, "paper_core_benchmark_queries.json")

    def test_service_url_override(self):
        with mock.patch.dict(
            "os.environ", {"AI_SERVICE_URL": "http://localhost:9000"}, clear=False
        ):
            self.assertEqual(default_service_url(), "http://localhost:9000")

    def test_service_request_headers_include_api_key(self):
        with mock.patch.dict(
            "os.environ", {"AI_SERVICE_API_KEY": "secret-key"}, clear=False
        ):
            self.assertEqual(service_request_headers(), {"X-API-Key": "secret-key"})

    def test_benchmark_eval_model_prefers_override(self):
        with mock.patch.dict(
            "os.environ", {"BENCHMARK_EVAL_MODEL": "gemini-custom"}, clear=False
        ):
            self.assertEqual(benchmark_eval_model(), "gemini-custom")

    def test_benchmark_eval_model_for_paper_core_uses_dedicated_override(self):
        with mock.patch.dict(
            "os.environ",
            {
                "PAPER_CORE_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
                "LLM_MODEL": "gemini-generation-model",
            },
            clear=False,
        ):
            self.assertEqual(
                benchmark_eval_model(dataset_name="paper_core"),
                "publishers/google/models/gemini-3.1-pro-preview",
            )

    def test_benchmark_eval_model_for_paper_core_does_not_fallback_to_llm_model(self):
        with mock.patch.dict(
            "os.environ",
            {
                "LLM_MODEL": "gemini-generation-model",
            },
            clear=False,
        ):
            self.assertEqual(
                benchmark_eval_model(dataset_name="paper_core"),
                "gemini-3.1-pro-preview",
            )

    def test_benchmark_eval_model_for_blind_test_uses_dedicated_override(self):
        with mock.patch.dict(
            "os.environ",
            {
                "BLIND_AB_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
                "BENCHMARK_EVAL_MODEL": "gemini-generic-judge",
            },
            clear=False,
        ):
            self.assertEqual(
                benchmark_eval_model(dataset_name="blind_test"),
                "publishers/google/models/gemini-3.1-pro-preview",
            )

    def test_benchmark_eval_model_for_blind_test_does_not_fallback_to_benchmark_model(self):
        with mock.patch.dict(
            "os.environ",
            {
                "BENCHMARK_EVAL_MODEL": "gemini-generic-judge",
            },
            clear=False,
        ):
            self.assertEqual(
                benchmark_eval_model(dataset_name="blind_test"),
                "gemini-3.1-pro-preview",
            )

    def test_vertex_client_uses_express_mode(self):
        with mock.patch("ai_service.script_support.genai.Client") as client_cls:
            with mock.patch.dict(
                "os.environ", {"GOOGLE_CLOUD_API_KEY": "vertex-key"}, clear=False
            ):
                create_vertex_express_client()
        client_cls.assert_called_once_with(vertexai=True, api_key="vertex-key")

    def test_researcherbench_script_no_sys_path_hack(self):
        script_path = resolve_from_service("scripts", "run_external_researcherbench.py")
        content = script_path.read_text(encoding="utf-8")
        self.assertNotIn("sys.path.append", content)
        self.assertNotIn("get_gemini_response", content)

    def test_postgres_smoke_script_no_sys_path_hack(self):
        script_path = resolve_from_service("scripts", "run_postgres_smoke.py")
        content = script_path.read_text(encoding="utf-8")
        self.assertNotIn("sys.path.append", content)

    def test_run_benchmark_writes_to_versioned_runs_dir(self):
        script_path = resolve_from_service("scripts", "run_benchmark.py")
        content = script_path.read_text(encoding="utf-8")
        self.assertIn('"BENCHMARK_RESULTS_PATH"', content)
        self.assertIn("resolve_experiment_paths", content)

    def test_archive_scripts_are_retired_with_explicit_exit(self):
        run_archive = resolve_from_service("scripts", "archive", "run_benchmarks_v3_scale.sh")
        verify_archive = resolve_from_service("scripts", "archive", "verify-improvements.sh")
        run_content = run_archive.read_text(encoding="utf-8")
        verify_content = verify_archive.read_text(encoding="utf-8")

        self.assertIn("[ARCHIVED]", run_content)
        self.assertIn("exit 1", run_content)
        self.assertIn("[ARCHIVED]", verify_content)
        self.assertIn("exit 1", verify_content)

    def test_probe_tools_are_parameterized(self):
        balanced_probe = resolve_from_service("scripts", "tools", "run_balanced_probe.py")
        strict_probe = resolve_from_service("scripts", "tools", "run_strict_probe.py")
        balanced_content = balanced_probe.read_text(encoding="utf-8")
        strict_content = strict_probe.read_text(encoding="utf-8")

        self.assertIn("argparse", balanced_content)
        self.assertIn("--input-path", balanced_content)
        self.assertIn("--output-path", balanced_content)
        self.assertIn("--ids", balanced_content)
        self.assertIn("argparse", strict_content)
        self.assertIn("--input-path", strict_content)
        self.assertIn("--output-path", strict_content)
        self.assertIn("--ids", strict_content)

    def test_package_json_benchmark_entry_is_deprecated(self):
        package_path = resolve_from_service("package.json")
        package = json.loads(package_path.read_text(encoding="utf-8"))
        scripts = package["scripts"]

        self.assertIn("Deprecated entry", scripts["benchmark"])
        self.assertIn("benchmark:paper-core:v2:drr", scripts)
        self.assertIn("benchmark:paper-core:v2:zero-shot", scripts)
        self.assertIn("benchmark:advanced", scripts)

    def test_current_figure_generator_uses_dual_model_box_distribution_for_paper_core(self):
        script_path = resolve_from_service("doc", "latex", "generate_current_figures.py")
        content = script_path.read_text(encoding="utf-8")

        self.assertIn("DEFAULT_ZERO_SHOT_RESULTS", content)
        self.assertIn('label="Zero-Shot"', content)
        self.assertIn('label="DRR"', content)
        self.assertIn('labels = ["Anchor\\n(n=6)", "Transfer\\n(n=20)", "Exploratory\\n(n=16)"]', content)
        self.assertIn("ax.boxplot(", content)
        self.assertNotIn("ax.violinplot(", content)

    def test_paper_core_neutral_judge_prompt_exists(self):
        from ai_service.prompts import EVAL_PAPER_CORE_V2_PROMPT

        self.assertTrue(EVAL_PAPER_CORE_V2_PROMPT.strip())
        self.assertIn("Novelty", EVAL_PAPER_CORE_V2_PROMPT)
        self.assertIn("cookbook", EVAL_PAPER_CORE_V2_PROMPT)
        self.assertIn("should usually not exceed 2", EVAL_PAPER_CORE_V2_PROMPT)
        self.assertIn("hard physical limit", EVAL_PAPER_CORE_V2_PROMPT)

    @unittest.skipIf(not resolve_from_service("benchmarks", "results", "paper_core_benchmark_queries.json").exists(), "Dataset missing in CI")
    def test_run_benchmark_uses_paper_core_neutral_judge_configuration(self):
        module = self._import_module_with_env(
            "scripts.run_benchmark",
            {
                "BENCHMARK_QUERY_SET": "paper_core",
                "BENCHMARK_VERSION": "paper_core_v2",
                "BENCHMARK_RUN_ID": "unit_test_run",
                "PAPER_CORE_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
                "LLM_MODEL": "gemini-generation-model",
            },
        )
        self.assertEqual(module.EVAL_MODEL, "publishers/google/models/gemini-3.1-pro-preview")
        self.assertEqual(module.CSV_PATH.name, "results.csv")
        self.assertEqual(module.RUN_PATHS.identity.benchmark_version, "paper_core_v2")
        self.assertEqual(module.RUN_PATHS.identity.pipeline_variant, "DRR_Final")
        self.assertIn("benchmarks/runs/paper_core", str(module.RUN_PATHS.run_dir))
        self.assertIn("cookbook", module.EVAL_PROMPT)

    def test_generate_blind_ab_answers_clean_drr_output_normalizes_fragmented_blueprint(self):
        module = self._import_module_with_env(
            "scripts.generate_blind_ab_answers",
            {
                "GOOGLE_CLOUD_API_KEY": "vertex-key",
                "GOOGLE_CLOUD_PROJECT": "unit-test-project",
            },
        )
        text = """## Primary Recommendation
Use route.

## Engineering Blueprint
1. Core structure: Alpha.; Alpha.
3. Parameter direction: Beta.; Beta.; Gamma
4. Manufacturing/integration path: Step A -> Step B.; Validation C.; Validation C.

## Action Summary
1. Do A
3. Do B
"""
        cleaned = module.clean_drr_output(text)
        self.assertIn("1. Core structure: Alpha.", cleaned)
        self.assertIn("2. Parameter direction: Beta. Gamma", cleaned)
        self.assertIn("3. Manufacturing/integration path: Step A -> Step B. Validation C.", cleaned)
        self.assertNotIn(".;", cleaned)

    @unittest.skipIf(not resolve_from_service("benchmarks", "results", "paper_core_benchmark_queries.json").exists(), "Dataset missing in CI")
    def test_run_benchmark_builds_query_specific_paper_core_prompt(self):
        module = self._import_module_with_env(
            "scripts.run_benchmark",
            {
                "BENCHMARK_QUERY_SET": "paper_core",
                "PAPER_CORE_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
            },
        )
        item = {
            "id": "Q10-Level2",
            "engineering_query": "How to design an external pipeline coating that passively reduces turbulent drag for fluids pumped at high Reynolds numbers over long distances?",
            "ground_truth": {
                "required_mechanisms": ["Micro-riblet arrays to restrict spanwise vortex movement"],
                "physics_constraints": ["Viscous sublayer thickness"]
            }
        }
        prompt = module.build_eval_prompt(item)
        self.assertIn("Query-Specific Adjudication Notes", prompt)
        self.assertIn("external coating", prompt.lower())
        self.assertIn("internal wetted boundary layer", prompt.lower())

    def test_run_paper_core_zero_shot_uses_neutral_judge_configuration(self):
        module = self._import_module_with_env(
            "scripts.run_paper_core_zero_shot",
            {
                "PAPER_CORE_ZERO_SHOT_VERSION": "paper_core_v2",
                "PAPER_CORE_ZERO_SHOT_RUN_ID": "unit_test_run",
                "PAPER_CORE_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
                "LLM_MODEL": "gemini-generation-model",
            },
        )
        self.assertEqual(module.EVAL_MODEL, "publishers/google/models/gemini-3.1-pro-preview")
        self.assertEqual(module.CSV_PATH.name, "results.csv")
        self.assertEqual(module.RUN_PATHS.identity.pipeline_variant, "Zero_Shot")
        self.assertIn("benchmarks/runs/paper_core", str(module.RUN_PATHS.run_dir))
        self.assertIn("cookbook", module.EVAL_PROMPT)

    def test_run_paper_core_zero_shot_builds_query_specific_prompt(self):
        module = self._import_module_with_env(
            "scripts.run_paper_core_zero_shot",
            {
                "PAPER_CORE_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
            },
        )
        item = {
            "id": "Q33-Level2",
            "engineering_query": "How to design a non-invasive, high-bandwidth brain-computer interface capable of reading and writing neural states with single-neuron resolution across deep brain structures?",
            "ground_truth": {
                "required_mechanisms": ["Magnetoelectric nanoparticles for localized neural stimulation"],
                "physics_constraints": ["Acoustic and optical scattering limits in biological tissue"]
            }
        }
        prompt = module.build_eval_prompt(item)
        self.assertIn("Query-Specific Adjudication Notes", prompt)
        self.assertIn("hard physical limit", prompt.lower())

    def test_blind_ab_transfer_aware_prompt_exists(self):
        prompt_path = resolve_from_service("prompts", "evaluation_blind_ab_transfer_aware.md")
        content = prompt_path.read_text(encoding="utf-8")
        self.assertIn("Cross-Domain Transfer Value", content)
        self.assertIn("Do NOT reward novelty", content)

    def test_run_blind_ab_testing_supports_prompt_profiles(self):
        module = self._import_module_with_env(
            "scripts.run_blind_ab_testing",
            {
                "BLIND_AB_JUDGE_PROFILE": "transfer_aware",
                "BLIND_AB_EVAL_MODEL": "publishers/google/models/gemini-3.1-pro-preview",
            },
        )
        self.assertEqual(module.JUDGE_MODEL, "publishers/google/models/gemini-3.1-pro-preview")
        self.assertIn("Cross-Domain Transfer Value", module.load_judge_prompt("transfer_aware"))
        with mock.patch.dict("os.environ", {"BLIND_AB_JUDGE_PROFILE": "transfer_aware"}, clear=False):
            self.assertEqual(module.default_judge_profile(), "transfer_aware")

    def test_generate_blind_ab_answers_strips_meta_artifacts(self):
        module = importlib.import_module("scripts.generate_blind_ab_answers")
        cleaned = module.clean_drr_output(
            """## 主推荐方案
Main path.

## 风险与约束
- Real risk.
- avoids biological metaphors and translated into pure engineering terms.
- parameterization directive extracted from critic.

- Internal reviewer summary that should not remain.
"""
        )
        self.assertIn("Main path.", cleaned)
        self.assertIn("Real risk.", cleaned)
        self.assertNotIn("avoids biological metaphors", cleaned)
        self.assertNotIn("parameterization", cleaned)
        self.assertNotIn("Internal reviewer summary", cleaned)
        self.assertIn("\n\n## 风险与约束\n", cleaned)

    def test_generate_blind_ab_answers_limits_section_lengths(self):
        module = importlib.import_module("scripts.generate_blind_ab_answers")
        cleaned = module.clean_drr_output(
            """## 风险与约束
- risk 1
- risk 2
- risk 3
- risk 4
## 行动摘要
1. action 1
2. action 2
3. action 3
4. action 4
"""
        )
        self.assertNotIn("risk 4", cleaned)
        self.assertNotIn("action 4", cleaned)

    def test_generate_blind_ab_answers_keeps_english_public_sections(self):
        module = importlib.import_module("scripts.generate_blind_ab_answers")
        cleaned = module.clean_drr_output(
            """## Primary Recommendation
Use a protected underwater adhesive applicator.

## Engineering Blueprint
1. Core structure: Static mixer plus conformal carrier.
2. Materials/components: Catechol-functional polymer.

## Action Summary
1. Prototype applicator: Test turbulent washout.
"""
        )

        self.assertIn("## Primary Recommendation", cleaned)
        self.assertIn("## Engineering Blueprint", cleaned)
        self.assertIn("Static mixer", cleaned)
        self.assertIn("Prototype applicator", cleaned)

    def test_generate_blind_ab_answers_supports_named_target_profiles(self):
        module = importlib.import_module("scripts.generate_blind_ab_answers")

        self.assertEqual(
            module.resolve_target_ids("transfer_core_7", None),
            [
                "Q7-Level2",
                "Q9-Level2",
                "Q14-Level2",
                "Q18-Level2",
                "Q23-Level2",
                "Q25-Level2",
                "Q10-Level2",
            ],
        )
        self.assertEqual(
            module.resolve_target_ids("legacy_stress_7", None),
            [
                "Q13-Level2",
                "Q21-Level2",
                "Q41-Level2",
                "Q31-Level2",
                "Q38-Level2",
                "Q42-Level2",
                "Q10-Level2",
            ],
        )
        self.assertEqual(
            module.resolve_target_ids("transfer_core_7", "Q1-Level1,Q2-Level1"),
            ["Q1-Level1", "Q2-Level1"],
        )

    def test_generate_blind_ab_answers_loads_reused_zero_shot_answers(self):
        module = importlib.import_module("scripts.generate_blind_ab_answers")
        with tempfile.TemporaryDirectory() as tmp:
            answers_path = Path(tmp) / "answers.json"
            answers_path.write_text(
                json.dumps(
                    {
                        "Q9-Level2": {
                            "query": "query text",
                            "Zero_Shot": "fixed zero-shot answer",
                            "DRR_Final": "old drr",
                        }
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            reused = module.load_reused_zero_shot_answers(
                str(answers_path),
                ["Q9-Level2"],
            )

        self.assertEqual(reused, {"Q9-Level2": "fixed zero-shot answer"})

    def test_generate_blind_ab_answers_rejects_missing_reused_zero_shot(self):
        module = importlib.import_module("scripts.generate_blind_ab_answers")
        with tempfile.TemporaryDirectory() as tmp:
            answers_path = Path(tmp) / "answers.json"
            answers_path.write_text(
                json.dumps(
                    {
                        "Q9-Level2": {
                            "query": "query text",
                            "Zero_Shot": "fixed zero-shot answer",
                        }
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "Q14-Level2"):
                module.load_reused_zero_shot_answers(
                    str(answers_path),
                    ["Q9-Level2", "Q14-Level2"],
                )

    def test_advanced_ablation_uses_mechanism_tree(self):
        script_path = resolve_from_service("scripts", "run_advanced_ablation.py")
        content = script_path.read_text(encoding="utf-8")
        self.assertIn("/generate/mechanism-tree", content)
        self.assertIn("ADVANCED_ABLATION_QUERY_SET", content)
        self.assertIn("test_zero_shot_scenario", content)
        self.assertIn('scenario": "Zero_Shot"', content)

    def test_advanced_ablation_write_results_persists_partial_csv(self):
        module = importlib.import_module("scripts.run_advanced_ablation")
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "advanced.csv"
            rows = [
                {
                    "id": "Q1",
                    "query": "test query",
                    "scenario": "Zero_Shot",
                    "latency": 1.23,
                    "causality": 8,
                    "actionability": 7,
                    "novelty": 6,
                    "final_score": 6.95,
                    "reasoning": "ok",
                }
            ]
            module.write_results(output, rows)
            content = output.read_text(encoding="utf-8")
            self.assertIn("scenario", content)
            self.assertIn("Zero_Shot", content)
            self.assertIn("Q1", content)

    @unittest.skipIf(not resolve_from_service("benchmarks", "results", "advanced_ablation_v2_queries.json").exists(), "Dataset missing in CI")
    def test_advanced_ablation_v2_dataset_exists(self):
        dataset = resolve_from_service(
            "benchmarks", "results", "advanced_ablation_v2_queries.json"
        )
        self.assertTrue(dataset.exists())
        import json

        payload = json.loads(dataset.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(payload), 10)
        self.assertTrue(
            all("engineering_query" in item and "id" in item for item in payload)
        )

    def test_automated_benchmark_prompt_is_cross_domain(self):
        script_path = resolve_from_service(
            "scripts", "tools", "automated_benchmark.py"
        )
        content = script_path.read_text(encoding="utf-8")
        self.assertIn("cross-domain engineering reasoning benchmark", content)
        self.assertNotIn("Biomimetic-Bench", content)

    def test_expand_dataset_prompt_is_not_biomimetic_only(self):
        script_path = resolve_from_service("scripts", "tools", "expand_datasets.py")
        content = script_path.read_text(encoding="utf-8")
        self.assertIn("cross-domain knowledge transfer", content)
        self.assertNotIn("expert in Biomimetics and Engineering", content)

    def test_knowledge_graph_writes_transfer_insights_not_sparks(self):
        module_path = resolve_from_service("ai_service", "knowledge_graph.py")
        content = module_path.read_text(encoding="utf-8")
        self.assertIn('"transfer_insights"', content)
        self.assertNotIn('"sparks": data.get("sparks", [])', content)

    def test_root_main_exports_app(self):
        module = importlib.import_module("main")
        self.assertTrue(hasattr(module, "app"))


class ColdStartRetestTests(unittest.TestCase):
    def test_default_version_label_uses_retest_prefix(self):
        module = importlib.import_module("scripts.run_cold_start_retest")
        label = module.default_version_label()
        self.assertTrue(label.startswith("corpus_retest_"))

    def test_clear_local_caches_only_touches_known_cache_files(self):
        module = importlib.import_module("scripts.run_cold_start_retest")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            embedding = root / ".embedding_cache.json"
            gemini = root / ".gemini_cache.json"
            unrelated = root / ".keep_me.json"
            embedding.write_text("{}", encoding="utf-8")
            gemini.write_text("{}", encoding="utf-8")
            unrelated.write_text("{}", encoding="utf-8")

            removed = module.clear_local_caches(root)

            self.assertEqual({path.name for path in removed}, {embedding.name, gemini.name})
            self.assertFalse(embedding.exists())
            self.assertFalse(gemini.exists())
            self.assertTrue(unrelated.exists())

    def test_summarize_retest_aggregates_outputs(self):
        module = importlib.import_module("scripts.run_cold_start_retest")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            post_build = root / "post_build_health.json"
            coverage = root / "benchmark_coverage.json"
            paper_core = root / "paper_core_results.csv"
            advanced = root / "advanced_results.csv"

            post_build.write_text(
                json.dumps(
                    {
                        "seed_summary": {"entity_count": 100, "relationship_count": 120},
                        "graph_summary": {"node_count": 210, "edge_count": 340, "community_count": 18},
                        "quality_summary": {
                            "node_embedding_coverage": 0.98,
                            "community_summary_coverage": 1.0,
                            "community_embedding_coverage": 1.0,
                        },
                    }
                ),
                encoding="utf-8",
            )
            coverage.write_text(
                json.dumps(
                    {
                        "readiness_checks": {
                            "pack_coverage": True,
                            "community_embeddings": True,
                        },
                        "hybrid_empty_ratio": 0.0,
                    }
                ),
                encoding="utf-8",
            )
            paper_core.write_text(
                "\n".join(
                    [
                        "id,query,mechanism_divergence,novelty,causality,actionability,error,g_eval_reasoning",
                        "Q1,q,0,4,5,3,,ok",
                        "Q2,q,0,5,4,4,,ok",
                    ]
                ),
                encoding="utf-8",
            )
            advanced.write_text(
                "\n".join(
                    [
                        "id,query,scenario,latency,causality,actionability,novelty,final_score,reasoning",
                        "Q1,q,Zero_Shot,1.2,8,7,6,6.95,ok",
                        "Q1,q,DRR_Final,2.4,9,8,8,8.32,ok",
                    ]
                ),
                encoding="utf-8",
            )

            summary = module.summarize_retest(
                db_name="codex_ai_service_retest_deadbeef",
                caches_cleared=[".embedding_cache.json", ".gemini_cache.json"],
                post_build_path=post_build,
                coverage_path=coverage,
                archived_results={
                    "paper_core": paper_core,
                    "advanced": advanced,
                },
            )

            self.assertEqual(summary["db_name"], "codex_ai_service_retest_deadbeef")
            self.assertEqual(summary["cache_summary"]["cleared_count"], 2)
            self.assertEqual(summary["graph_summary"]["node_count"], 210)
            self.assertEqual(summary["paper_core_benchmark"]["query_count"], 2)
            self.assertIn("Zero_Shot", summary["advanced_benchmark"]["scenario_summary"])
