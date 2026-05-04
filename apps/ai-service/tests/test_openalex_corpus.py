from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from ai_service.models import Entity, KnowledgeExtractionResponse, Relationship
from ai_service.openalex_corpus import (
    QueryPack,
    YearRange,
    analyze_benchmark_coverage,
    classify_query_to_pack,
    corpus_artifact_paths,
    curate_accepted_works,
    dedupe_works,
    discover_openalex,
    expand_openalex_neighbors,
    extract_knowledge_from_text,
    materialize_seed_knowledge,
    merge_knowledge_extractions,
    normalize_openalex_work,
    preview_materialization_selection,
    reconstruct_abstract,
    rerank_pack_candidates,
    select_materialization_works,
    versioned_artifact_path,
    OPENALEX_ARTIFACTS_DIR,
)


def _pack(pack_id: str = "self_cleaning_antifouling") -> QueryPack:
    return QueryPack(
        id=pack_id,
        display_name="Self Cleaning",
        primary_queries=["self-cleaning surface mechanisms"],
        expansion_queries=["lotus leaf superhydrophobic"],
        include_keywords=["self-cleaning", "lotus leaf", "superhydrophobic", "solar panel"],
        exclude_keywords=["social network"],
        benchmark_signals=["dusty environments", "solar panels"],
        year_range=YearRange(start=2015, end=2026),
        target_paper_count=3,
        max_neighbor_count=2,
        seed_count=1,
    )


def _raw_work(work_id: str, title: str, abstract_terms: dict[str, list[int]], cited_by: int = 10) -> dict:
    return {
        "id": f"https://openalex.org/{work_id}",
        "doi": f"https://doi.org/10.1000/{work_id.lower()}",
        "display_name": title,
        "abstract_inverted_index": abstract_terms,
        "publication_year": 2024,
        "cited_by_count": cited_by,
        "concepts": [{"display_name": "Biomimetics"}],
        "primary_topic": {"display_name": "Surface Engineering"},
        "open_access": {"is_oa": True, "oa_url": "https://example.org/landing"},
        "best_oa_location": {
            "landing_page_url": "https://example.org/landing",
            "pdf_url": "https://example.org/paper.pdf",
        },
    }


class OpenAlexCorpusUnitTests(unittest.TestCase):
    def test_reconstruct_abstract_from_inverted_index(self):
        text = reconstruct_abstract({"Lotus": [0], "leaf": [1], "repels": [2], "water": [3]})
        self.assertEqual(text, "Lotus leaf repels water")

    def test_normalize_openalex_work_extracts_metadata(self):
        work = normalize_openalex_work(
            _raw_work("W1", "Lotus surfaces", {"Lotus": [0], "surface": [1]}),
            source_pack="self_cleaning_antifouling",
            source_query="self-cleaning surface mechanisms",
        )
        self.assertEqual(work.openalex_id, "https://openalex.org/W1")
        self.assertEqual(work.abstract, "Lotus surface")
        self.assertEqual(work.pdf_url, "https://example.org/paper.pdf")
        self.assertIn("self_cleaning_antifouling", work.source_packs)

    def test_dedupe_works_merges_sources_and_keeps_richer_abstract(self):
        first = normalize_openalex_work(
            _raw_work("W1", "Lotus surfaces", {"Lotus": [0], "surface": [1]}, cited_by=3),
            source_pack="self_cleaning_antifouling",
            source_query="q1",
        )
        second = normalize_openalex_work(
            _raw_work(
                "W1",
                "Lotus self-cleaning surfaces",
                {"Lotus": [0], "leaf": [1], "superhydrophobic": [2], "surface": [3]},
                cited_by=20,
            ),
            source_pack="drag_reduction_flow_control",
            source_query="q2",
        )
        deduped = dedupe_works([first, second])
        self.assertEqual(len(deduped), 1)
        merged = deduped[0]
        self.assertIn("drag_reduction_flow_control", merged.source_packs)
        self.assertEqual(merged.cited_by_count, 20)
        self.assertIn("superhydrophobic", merged.abstract)

    def test_rerank_pack_candidates_respects_include_and_exclude_keywords(self):
        pack = _pack()
        good = normalize_openalex_work(
            _raw_work("W1", "Self-cleaning solar panels", {"Self-cleaning": [0], "lotus": [1], "surface": [2]}, cited_by=50),
            source_pack=pack.id,
            source_query=pack.primary_queries[0],
        )
        bad = normalize_openalex_work(
            _raw_work("W2", "Social network cleaning", {"social": [0], "network": [1], "cleaning": [2]}, cited_by=60),
            source_pack=pack.id,
            source_query=pack.primary_queries[0],
        )
        ranked = rerank_pack_candidates([good, bad], pack)
        self.assertEqual([item.openalex_id for item in ranked], [good.openalex_id])

    def test_rerank_pack_candidates_rejects_items_without_topic_hits(self):
        pack = _pack()
        generic = normalize_openalex_work(
            _raw_work("W3", "Qualitative research methods", {"interview": [0], "coding": [1], "analysis": [2]}, cited_by=500),
            source_pack=pack.id,
            source_query=pack.primary_queries[0],
        )
        ranked = rerank_pack_candidates([generic], pack)
        self.assertEqual(ranked, [])

    def test_merge_knowledge_extractions_normalizes_types_and_relations(self):
        merged = merge_knowledge_extractions(
            [
                KnowledgeExtractionResponse(
                    entities=[
                        Entity(name="Lotus leaf microtexture", type="surface", description="Rough surface traps air pockets."),
                        Entity(name="Solar panel coating", type="application", description="Anti-soiling coating for photovoltaic modules."),
                    ],
                    relationships=[
                        Relationship(
                            source="Lotus leaf microtexture",
                            target="Solar panel coating",
                            relation_type="cross-domain mechanism transfer",
                            description="Lotus roughness inspires anti-soiling coatings.",
                        )
                    ],
                )
            ]
        )
        self.assertEqual(merged.entities[0].type, "surface_structure")
        self.assertEqual(merged.relationships[0].relation_type, "inspires")

    def test_classify_query_to_pack(self):
        packs = [_pack(), QueryPack(
            id="swarm_distributed_optimization",
            display_name="Swarm",
            primary_queries=["swarm intelligence engineering optimization"],
            expansion_queries=["ant colony optimization routing"],
            include_keywords=["swarm", "routing", "ant colony", "traffic"],
            exclude_keywords=[],
            benchmark_signals=["traffic light", "packet routing"],
            year_range=YearRange(start=2015, end=2026),
            target_paper_count=3,
        )]
        assigned = classify_query_to_pack(
            "How to design a self-cleaning surface for solar panels in dusty environments?",
            packs,
        )
        self.assertEqual(assigned, "self_cleaning_antifouling")

    def test_classify_query_to_pack_thermal(self):
        packs = [
            _pack(),
            QueryPack(
                id="thermal_regulation_passive_cooling",
                display_name="Thermal",
                primary_queries=["passive cooling thermal mechanisms"],
                expansion_queries=["thermal regulation insulation"],
                include_keywords=["thermal", "cooling", "insulation", "infrared"],
                exclude_keywords=[],
                benchmark_signals=["passive cooling", "heat exchange"],
                year_range=YearRange(start=2015, end=2026),
                target_paper_count=3,
            ),
        ]
        assigned = classify_query_to_pack(
            "How to design a building facade that passively regulates internal temperature in a fluctuating climate, minimizing energy consumption for heating and cooling?",
            packs,
        )
        self.assertEqual(assigned, "thermal_regulation_passive_cooling")

    def test_classify_query_to_pack_swarm(self):
        packs = [
            _pack(),
            QueryPack(
                id="swarm_distributed_optimization",
                display_name="Swarm",
                primary_queries=["swarm intelligence engineering optimization"],
                expansion_queries=["ant colony optimization routing"],
                include_keywords=["swarm", "routing", "sensor network", "distributed"],
                exclude_keywords=[],
                benchmark_signals=["multi-robot", "task allocation", "decentralized"],
                year_range=YearRange(start=2015, end=2026),
                target_paper_count=3,
            ),
        ]
        assigned = classify_query_to_pack(
            "How to design a distributed, low-power sensor network that can autonomously map an unknown environment and identify hotspots of interest?",
            packs,
        )
        self.assertEqual(assigned, "swarm_distributed_optimization")

    def test_classify_query_to_pack_water(self):
        packs = [
            _pack(),
            QueryPack(
                id="water_harvesting_desalination",
                display_name="Water",
                primary_queries=["passive fog harvesting mechanisms"],
                expansion_queries=["desalination membrane"],
                include_keywords=["fog", "water vapor", "desalination"],
                exclude_keywords=[],
                benchmark_signals=["airborne fog", "collect water"],
                year_range=YearRange(start=2015, end=2026),
                target_paper_count=3,
            ),
        ]
        assigned = classify_query_to_pack(
            "How to design a large-scale, passive mesh structure for efficiently capturing and collecting water from airborne fog in coastal or mountainous regions?",
            packs,
        )
        self.assertEqual(assigned, "water_harvesting_desalination")

    def test_classify_query_to_pack_impact(self):
        packs = [
            _pack(),
            QueryPack(
                id="impact_protection_energy_dissipation",
                display_name="Impact",
                primary_queries=["impact protection energy dissipation"],
                expansion_queries=["vibration damping crashworthiness"],
                include_keywords=["impact", "energy absorption", "damping"],
                exclude_keywords=[],
                benchmark_signals=["automotive safety", "seismic", "vibration"],
                year_range=YearRange(start=2015, end=2026),
                target_paper_count=3,
            ),
        ]
        assigned = classify_query_to_pack(
            "How to design ultra-impact-resistant structural components for automotive safety?",
            packs,
        )
        self.assertEqual(assigned, "impact_protection_energy_dissipation")

    def test_classify_query_to_pack_uses_mechanism_transfer_hints(self):
        packs = [
            _pack(),
            QueryPack(
                id="drag_reduction_flow_control",
                display_name="Drag",
                primary_queries=["drag reduction surface mechanisms"],
                expansion_queries=["boundary layer control"],
                include_keywords=["drag", "flow control", "boundary layer"],
                exclude_keywords=[],
                benchmark_signals=["friction reduction", "vortex suppression"],
                year_range=YearRange(start=2015, end=2026),
                target_paper_count=3,
            ),
        ]
        assigned = classify_query_to_pack(
            "How to design a surface architecture for boundary-layer control and vortex suppression in a fluid transport system?",
            packs,
        )
        self.assertEqual(assigned, "drag_reduction_flow_control")

    def test_classify_query_to_pack_prefers_functional_thermal_hints(self):
        packs = [
            _pack(),
            QueryPack(
                id="thermal_regulation_passive_cooling",
                display_name="Thermal",
                primary_queries=["thermal regulation mechanisms"],
                expansion_queries=["passive ventilation"],
                include_keywords=["thermal", "temperature regulation", "insulation"],
                exclude_keywords=[],
                benchmark_signals=["radiative cooling", "emissivity control"],
                year_range=YearRange(start=2015, end=2026),
                target_paper_count=3,
            ),
        ]
        assigned = classify_query_to_pack(
            "How to engineer a passive thermal shielding layer with emissivity control and radiative cooling for exposed equipment?",
            packs,
        )
        self.assertEqual(assigned, "thermal_regulation_passive_cooling")

    def test_select_materialization_works_balances_packs_and_dedupes(self):
        pack_a = _pack("self_cleaning_antifouling")
        pack_b = QueryPack(
            id="drag_reduction_flow_control",
            display_name="Drag",
            primary_queries=["drag reduction"],
            expansion_queries=["shark skin riblet"],
            include_keywords=["drag reduction", "riblet", "shark skin"],
            exclude_keywords=[],
            benchmark_signals=["hydrodynamic"],
            year_range=YearRange(start=2015, end=2026),
            target_paper_count=3,
        )
        shared = normalize_openalex_work(
            _raw_work("W1", "Shared mechanism", {"lotus": [0], "riblet": [1]}, cited_by=50),
            source_pack=pack_a.id,
            source_query="q1",
        )
        shared.source_packs = [pack_a.id, pack_b.id]
        shared.pack_scores = {pack_a.id: 12.0, pack_b.id: 9.0}
        second = normalize_openalex_work(
            _raw_work("W2", "Pack A", {"lotus": [0], "self-cleaning": [1]}, cited_by=20),
            source_pack=pack_a.id,
            source_query="q2",
        )
        second.pack_scores = {pack_a.id: 11.0}
        third = normalize_openalex_work(
            _raw_work("W3", "Pack B", {"shark": [0], "riblet": [1]}, cited_by=10),
            source_pack=pack_b.id,
            source_query="q3",
        )
        third.pack_scores = {pack_b.id: 8.0}
        artifact = {
            "packs": {
                pack_a.id: {"works": [shared.model_dump(), second.model_dump()]},
                pack_b.id: {"works": [shared.model_dump(), third.model_dump()]},
            }
        }

        selected = select_materialization_works(artifact, per_pack_limit=1, max_works=None)

        self.assertEqual(len(selected), 2)
        self.assertEqual({work.openalex_id for work in selected}, {shared.openalex_id, third.openalex_id})

    def test_versioned_artifact_paths_use_version_directory_and_filename_suffix(self):
        versioned = corpus_artifact_paths("corpus_v2")
        self.assertIn("/versions/corpus_v2/", str(versioned["accepted"]))
        self.assertTrue(str(versioned["accepted"]).endswith("accepted_works_v2.json"))
        unversioned = versioned_artifact_path(
            OPENALEX_ARTIFACTS_DIR / "curated" / "accepted_works.json",
            "corpus_v2",
        )
        self.assertEqual(versioned["accepted"], unversioned)


class OpenAlexCorpusIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_extract_knowledge_retries_on_malformed_json(self):
        malformed = '{"entities": [{"name": "Lotus"'  # truncated on purpose
        repaired = json.dumps(
            {
                "entities": [
                    {
                        "name": "Lotus leaf microtexture",
                        "type": "surface_structure",
                        "description": "Traps air pockets.",
                    }
                ],
                "relationships": [],
            }
        )
        with mock.patch(
            "ai_service.openalex_corpus.get_gemini_response",
            new=mock.AsyncMock(side_effect=[malformed, repaired]),
        ):
            extraction = await extract_knowledge_from_text("Title: Lotus")

        self.assertEqual(len(extraction.entities), 1)
        self.assertEqual(extraction.entities[0].name, "Lotus leaf microtexture")

    async def test_discover_openalex_with_mocked_results(self):
        pack = _pack()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            config_path = temp_path / "query_packs.yaml"
            output_path = temp_path / "discovery.json"
            config_path.write_text(
                json.dumps({"packs": [pack.model_dump()]}),
                encoding="utf-8",
            )
            with (
                mock.patch("ai_service.openalex_corpus.load_query_packs", return_value=[pack]),
                mock.patch("ai_service.openalex_corpus.OPENALEX_RAW_DIR", temp_path / "raw"),
                mock.patch(
                    "ai_service.openalex_corpus.fetch_openalex_results",
                    new=mock.AsyncMock(return_value=[
                        _raw_work("W1", "Self-cleaning solar panels", {"self-cleaning": [0], "lotus": [1], "solar": [2], "panel": [3]}, cited_by=30),
                        _raw_work("W2", "Lotus self-cleaning surface", {"lotus": [0], "surface": [1], "self-cleaning": [2]}, cited_by=20),
                    ]),
                ),
            ):
                artifact = await discover_openalex(config_path=config_path, output_path=output_path)
        self.assertIn(pack.id, artifact["packs"])
        self.assertGreaterEqual(len(artifact["packs"][pack.id]["works"]), 2)

    async def test_expand_openalex_neighbors_dedupes_and_caps(self):
        pack = _pack()
        discovery_artifact = {
            "packs": {
                pack.id: {
                    "display_name": pack.display_name,
                    "query_pack": pack.model_dump(),
                    "works": [
                        normalize_openalex_work(
                            _raw_work("W1", "Self-cleaning solar panels", {"self-cleaning": [0], "lotus": [1]}, cited_by=30),
                            source_pack=pack.id,
                            source_query="seed",
                        ).model_dump()
                    ],
                }
            }
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            discovery_path = temp_path / "discovery.json"
            output_path = temp_path / "accepted.json"
            discovery_path.write_text(json.dumps(discovery_artifact), encoding="utf-8")
            with (
                mock.patch("ai_service.openalex_corpus.load_query_packs", return_value=[pack]),
                mock.patch("ai_service.openalex_corpus.OPENALEX_RAW_DIR", temp_path / "raw"),
                mock.patch(
                    "ai_service.openalex_corpus.fetch_openalex_results",
                    new=mock.AsyncMock(return_value=[
                        _raw_work(
                            "W2",
                            "Lotus leaf self-cleaning solar panel coating",
                            {"lotus": [0], "leaf": [1], "self-cleaning": [2], "solar": [3], "panel": [4]},
                            cited_by=15,
                        ),
                        _raw_work("W3", "Social network cleaning", {"social": [0], "network": [1]}, cited_by=100),
                    ]),
                ),
            ):
                artifact = await expand_openalex_neighbors(
                    config_path=temp_path / "query_packs.yaml",
                    discovery_path=discovery_path,
                    output_path=output_path,
                )
        works = artifact["packs"][pack.id]["works"]
        self.assertEqual(len(works), 2)
        self.assertEqual({item["openalex_id"] for item in works}, {"https://openalex.org/W1", "https://openalex.org/W2"})

    async def test_materialize_seed_knowledge_outputs_service_shape(self):
        accepted_artifact = {
            "packs": {
                "self_cleaning_antifouling": {
                    "display_name": "Self Cleaning",
                    "works": [
                        normalize_openalex_work(
                            _raw_work("W1", "Self-cleaning solar panels", {"self-cleaning": [0], "lotus": [1]}),
                            source_pack="self_cleaning_antifouling",
                            source_query="seed",
                        ).model_dump()
                    ],
                }
            }
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            accepted_path = temp_path / "accepted.json"
            seed_path = temp_path / "seed_knowledge.json"
            provenance_path = temp_path / "provenance.json"
            accepted_path.write_text(json.dumps(accepted_artifact), encoding="utf-8")

            async def fake_extract(_text: str) -> KnowledgeExtractionResponse:
                return KnowledgeExtractionResponse(
                    entities=[
                        Entity(name="Lotus leaf microtexture", type="surface", description="Traps air pockets."),
                        Entity(name="Solar panel coating", type="application", description="Anti-soiling surface."),
                    ],
                    relationships=[
                        Relationship(
                            source="Lotus leaf microtexture",
                            target="Solar panel coating",
                            relation_type="inspires",
                            description="Lotus surfaces inspire coatings.",
                        )
                    ],
                )

            with mock.patch(
                "ai_service.openalex_corpus.extract_knowledge_from_text",
                side_effect=fake_extract,
            ):
                seed, provenance = await materialize_seed_knowledge(
                    accepted_path=accepted_path,
                    output_path=seed_path,
                    provenance_path=provenance_path,
                    include_fulltext_excerpt=False,
                )
                written = json.loads(seed_path.read_text(encoding="utf-8"))

        self.assertIsInstance(seed, KnowledgeExtractionResponse)
        self.assertEqual(len(seed.entities), 2)
        self.assertEqual(seed.relationships[0].relation_type, "inspires")
        self.assertEqual(len(provenance), 1)
        self.assertIn("entities", written)

    async def test_curate_accepted_works_filters_weak_pack_noise(self):
        thermal_pack = QueryPack(
            id="thermal_regulation_passive_cooling",
            display_name="Thermal",
            primary_queries=["termite mound ventilation thermal regulation mechanisms"],
            expansion_queries=["termite mound ventilation"],
            include_keywords=["termite mound", "thermal regulation", "passive cooling"],
            exclude_keywords=["desalination"],
            benchmark_signals=["heat management"],
            year_range=YearRange(start=2015, end=2026),
            target_paper_count=4,
        )
        accepted_artifact = {
            "packs": {
                thermal_pack.id: {
                    "display_name": thermal_pack.display_name,
                    "query_pack": thermal_pack.model_dump(),
                    "works": [
                        normalize_openalex_work(
                            _raw_work("W1", "Termite mound ventilation for passive cooling", {"termite": [0], "mound": [1], "cooling": [2]}),
                            source_pack=thermal_pack.id,
                            source_query="seed",
                        ).model_dump(),
                        normalize_openalex_work(
                            _raw_work("W2", "Solar desalination with graphene oxide evaporator", {"solar": [0], "desalination": [1], "evaporator": [2]}),
                            source_pack=thermal_pack.id,
                            source_query="seed",
                        ).model_dump(),
                    ],
                }
            }
        }
        review_config = {
            "version": "corpus_v2",
            "packs": {
                thermal_pack.id: {
                    "exclude_title_patterns": ["desalination", "evaporator"],
                }
            },
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            accepted_path = temp_path / "accepted.json"
            review_path = temp_path / "review.yaml"
            output_path = temp_path / "reviewed.json"
            accepted_path.write_text(json.dumps(accepted_artifact), encoding="utf-8")
            review_path.write_text(json.dumps(review_config), encoding="utf-8")
            report = curate_accepted_works(
                accepted_path=accepted_path,
                review_path=review_path,
                output_path=output_path,
            )

        works = report["packs"][thermal_pack.id]["works"]
        self.assertEqual(len(works), 1)
        self.assertEqual(works[0]["openalex_id"], "https://openalex.org/W1")

    async def test_curate_accepted_works_dedupes_duplicate_titles_by_score(self):
        pack = QueryPack(
            id="lightweight_structures",
            display_name="Lightweight",
            primary_queries=["lightweight structural mechanisms"],
            expansion_queries=[],
            include_keywords=["lightweight", "structural"],
            exclude_keywords=[],
            benchmark_signals=["aerospace"],
            year_range=YearRange(start=2015, end=2026),
            target_paper_count=4,
        )
        low_score = normalize_openalex_work(
            _raw_work("W1", "Interlaced geometric structure for aerospace applications", {"interlaced": [0], "structure": [1]}),
            source_pack=pack.id,
            source_query="seed",
        ).model_dump()
        low_score["pack_scores"] = {pack.id: 10.0}
        low_score["cited_by_count"] = 5

        high_score = normalize_openalex_work(
            _raw_work("W2", "Interlaced geometric structure for aerospace applications", {"interlaced": [0], "structure": [1], "aerospace": [2]}),
            source_pack=pack.id,
            source_query="seed",
        ).model_dump()
        high_score["pack_scores"] = {pack.id: 18.0}
        high_score["cited_by_count"] = 20

        accepted_artifact = {
            "packs": {
                pack.id: {
                    "display_name": pack.display_name,
                    "query_pack": pack.model_dump(),
                    "works": [low_score, high_score],
                }
            }
        }
        review_config = {
            "version": "corpus_v3",
            "packs": {
                pack.id: {
                    "dedupe_by_normalized_title": True,
                }
            },
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            accepted_path = temp_path / "accepted.json"
            review_path = temp_path / "review.yaml"
            output_path = temp_path / "reviewed.json"
            accepted_path.write_text(json.dumps(accepted_artifact), encoding="utf-8")
            review_path.write_text(json.dumps(review_config), encoding="utf-8")
            report = curate_accepted_works(
                accepted_path=accepted_path,
                review_path=review_path,
                output_path=output_path,
            )

        pack_report = report["packs"][pack.id]
        works = pack_report["works"]
        self.assertEqual(len(works), 1)
        self.assertEqual(works[0]["openalex_id"], "https://openalex.org/W2")
        self.assertEqual(pack_report["removed_count"], 1)
        self.assertTrue(pack_report["removed"][0]["reasons"][0].startswith("duplicate_title:"))

    async def test_preview_materialization_selection_reports_titles_by_pack(self):
        pack = _pack()
        artifact = {
            "packs": {
                pack.id: {
                    "display_name": pack.display_name,
                    "works": [
                        normalize_openalex_work(
                            _raw_work("W1", "Self-cleaning solar panels", {"self-cleaning": [0], "lotus": [1]}),
                            source_pack=pack.id,
                            source_query="seed",
                        ).model_dump()
                    ],
                }
            }
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            accepted_path = temp_path / "accepted.json"
            preview_path = temp_path / "preview.json"
            accepted_path.write_text(json.dumps(artifact), encoding="utf-8")
            preview = preview_materialization_selection(
                accepted_path=accepted_path,
                per_pack_limit=1,
                max_works=None,
                output_path=preview_path,
            )

        self.assertEqual(preview["selected_work_count"], 1)
        self.assertEqual(preview["pack_summaries"][0]["selected_titles"][0]["title"], "Self-cleaning solar panels")

    async def test_analyze_benchmark_coverage_reports_readiness(self):
        pack = _pack()
        accepted_artifact = {
            "packs": {
                pack.id: {
                    "display_name": pack.display_name,
                    "works": [
                        normalize_openalex_work(
                            _raw_work("W1", "Self-cleaning solar panels", {"self-cleaning": [0], "lotus": [1], "solar": [2], "panel": [3]}),
                            source_pack=pack.id,
                            source_query="seed",
                        ).model_dump()
                    ],
                }
            }
        }
        provenance_artifact = {
            "accepted_work_count": 1,
            "failed_work_count": 0,
            "works": [
                {
                    "openalex_id": "https://openalex.org/W1",
                    "title": "Self-cleaning solar panels",
                    "source_packs": [pack.id],
                    "extraction_status": "success",
                    "entity_count": 4,
                    "relationship_count": 3,
                    "entity_names": [],
                    "excerpt_used": False,
                }
            ],
        }
        benchmark_queries = [
            {
                "id": "Q1",
                "engineering_query": "How to design a self-cleaning surface for solar panels in dusty environments?",
            }
        ]

        class _Conn:
            async def fetch(self, _query):
                return [{"title": "Self-cleaning community", "summary": "Lotus leaf inspired solar panel coating"}]

            async def fetchval(self, query):
                if "COUNT(*) FROM communities WHERE summary" in query:
                    return 1
                if "COUNT(*) FROM communities WHERE embedding" in query:
                    return 1
                if "COUNT(*) FROM communities" in query:
                    return 1
                return 0

        class _Acquire:
            async def __aenter__(self):
                return _Conn()

            async def __aexit__(self, exc_type, exc, tb):
                return False

        class _Pool:
            def acquire(self):
                return _Acquire()

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            accepted_path = temp_path / "accepted.json"
            provenance_path = temp_path / "provenance.json"
            benchmark_path = temp_path / "benchmark.json"
            accepted_path.write_text(json.dumps(accepted_artifact), encoding="utf-8")
            provenance_path.write_text(json.dumps(provenance_artifact), encoding="utf-8")
            benchmark_path.write_text(json.dumps(benchmark_queries), encoding="utf-8")
            with (
                mock.patch("ai_service.openalex_corpus.load_query_packs", return_value=[pack]),
                mock.patch("ai_service.openalex_corpus.OPENALEX_REPORTS_DIR", temp_path / "reports"),
                mock.patch("ai_service.openalex_corpus.BENCHMARK_COVERAGE_JSON", temp_path / "reports" / "coverage.json"),
                mock.patch("ai_service.openalex_corpus.BENCHMARK_COVERAGE_CSV", temp_path / "reports" / "coverage.csv"),
                mock.patch("ai_service.openalex_corpus.init_db_pool", new=mock.AsyncMock()),
                mock.patch("ai_service.openalex_corpus.close_db_pool", new=mock.AsyncMock()),
                mock.patch("ai_service.openalex_corpus.db_connected", return_value=True),
                mock.patch("ai_service.openalex_corpus.get_db_pool", return_value=_Pool()),
                mock.patch("ai_service.openalex_corpus.get_embedding", new=mock.AsyncMock(return_value=[0.1] * 768)),
                mock.patch("ai_service.openalex_corpus.search.fetch_vector_nodes", new=mock.AsyncMock(return_value=[{"name": "Lotus", "description": "desc"}])),
                mock.patch("ai_service.openalex_corpus.search.retrieve_hybrid_communities", new=mock.AsyncMock(return_value=[{"title": "Self-cleaning", "summary": "lotus", "findings": "{}"}])),
                mock.patch("ai_service.openalex_corpus.search.prune_relevant_communities", new=mock.AsyncMock(side_effect=lambda _q, communities: communities)),
            ):
                report = await analyze_benchmark_coverage(
                    config_path=temp_path / "query_packs.yaml",
                    accepted_path=accepted_path,
                    provenance_path=provenance_path,
                    benchmark_query_path=benchmark_path,
                    output_json_path=temp_path / "reports" / "coverage.json",
                    output_csv_path=temp_path / "reports" / "coverage.csv",
                )

        self.assertTrue(report["readiness_checks"]["community_per_pack"])
        self.assertTrue(report["readiness_checks"]["benchmark_queries_not_predominantly_empty"])
        self.assertEqual(report["pack_summaries"][0]["materialized_work_count"], 1)
        self.assertEqual(report["pack_summaries"][0]["extracted_entity_count"], 4)
