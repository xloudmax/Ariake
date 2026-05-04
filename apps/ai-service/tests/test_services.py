from __future__ import annotations

import unittest
from unittest import mock

from ai_service import mechanism_tree
from ai_service.models import Entity, KnowledgeExtractionResponse, Relationship
from ai_service import search
from ai_service.knowledge_graph import (
    _coerce_summary_json,
    upsert_knowledge,
    upsert_knowledge_with_connection,
)

TEST_EMBEDDING = [0.1] * 768


class _FakeConn:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.fetch_queries = []
        self.executemany_calls = []

    async def fetch(self, query, *args):
        self.fetch_queries.append((query, args))
        return self.rows

    async def executemany(self, query, args):
        self.executemany_calls.append((query, args))


class _ActiveConn:
    def __init__(self, pool, rows):
        self.pool = pool
        self.rows = rows
        self.fetch_queries = []
        self.executemany_calls = []

    async def fetch(self, query, *args):
        self.fetch_queries.append((query, args))
        return self.rows

    async def executemany(self, query, args):
        self.executemany_calls.append((query, args))


class _Acquire:
    def __init__(self, pool, conn):
        self.pool = pool
        self.conn = conn

    async def __aenter__(self):
        self.pool.active += 1
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        self.pool.active -= 1
        return False


class _Pool:
    def __init__(self, rows):
        self.active = 0
        self.conn = _ActiveConn(self, rows)

    def acquire(self):
        return _Acquire(self, self.conn)


class SearchServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_infer_engineering_backbone_prefers_standard_filtration_backbone(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a low-energy, anti-clogging filtration system for separating microplastics from large volumes of water?"
        )

        self.assertEqual(policy, "balanced")
        self.assertIn("cross-flow hydrodynamics", backbone.lower())
        self.assertIn("cross-domain transfer", backbone.lower())
        self.assertIn("minimal engineering template", backbone.lower())
        self.assertIn("pressure drop", backbone.lower())

    def test_infer_engineering_backbone_templates(self):
        # Q21 Anti-icing
        b21, p21 = search._infer_engineering_backbone("How to design a durable passive anti-icing surface for aircraft?")
        self.assertEqual(p21, "strict")
        self.assertIn("icing delay", b21.lower())
        self.assertIn("test conditions", b21.lower())

        # Q41 Thermal control
        b41, p41 = search._infer_engineering_backbone("How to design a surface with tunable thermal emissivity in the infrared spectrum?")
        self.assertEqual(p41, "strict")
        self.assertIn("material stack", b41.lower())
        self.assertIn("switching target", b41.lower())

        # Q49 Swarm robotics
        b49, p49 = search._infer_engineering_backbone("How to design a control algorithm for a large swarm of simple robots without a central controller?")
        self.assertEqual(p49, "strict")
        self.assertIn("local state machine", b49.lower())
        self.assertIn("threshold", b49.lower())

    def test_infer_engineering_backbone_for_freezing_fog_anti_icing(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a surface treatment for wind turbine blades that prevents ice nucleation and accretion in freezing fog conditions, avoiding the need for active electro-thermal heating?"
        )
        lowered = backbone.lower()
        self.assertEqual(policy, "balanced")
        self.assertIn("fracture", lowered)
        self.assertIn("aerodynamic", lowered)
        self.assertNotIn("photothermal", lowered)
        self.assertNotIn("photoluminescent", lowered)

    def test_infer_engineering_backbone_for_ultra_long_term_storage(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design an ultra-long-term data storage medium capable of preserving high-density digital information for millions of years without active maintenance, shielding, or power?"
        )
        lowered = backbone.lower()
        self.assertEqual(policy, "balanced")
        self.assertIn("fused silica", lowered)
        self.assertIn("bootstrap", lowered)
        self.assertNotIn("macromolecule", lowered)

    def test_infer_engineering_backbone_for_energy_positive_wastewater(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a scalable, energy-positive wastewater treatment architecture that simultaneously recovers clean water, synthesizes bioplastics, and generates grid-quality electricity?"
        )
        lowered = backbone.lower()
        self.assertEqual(policy, "balanced")
        self.assertIn("anaerobic", lowered)
        self.assertIn("biogas", lowered)
        self.assertIn("pha", lowered)
        self.assertNotIn("mfc/mec", lowered)

    def test_infer_engineering_backbone_for_useful_throughput_rare_earth(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a low-energy rare earth extraction architecture for seawater that remains selective at trace concentration, rejects competing ions, and supports practical regeneration at useful throughput?"
        )
        lowered = backbone.lower()
        self.assertEqual(policy, "balanced")
        self.assertIn("selective", lowered)
        self.assertIn("ligand", lowered)
        self.assertIn("chlorine", lowered)

    def test_infer_engineering_backbone_for_external_pipeline_q44(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design an external pipeline coating that reduces turbulent drag over long-distance transport lines while preserving the external-only boundary condition and giving a defensible indirect coupling path to the internal flow?"
        )
        lowered = backbone.lower()
        self.assertEqual(policy, "balanced")
        self.assertIn("wall compliance go/no-go", lowered)
        self.assertIn("t/d", lowered)
        self.assertIn("do not claim large passive drag reduction", lowered)

    def test_transfer_core_blind_subset_uses_query_first_defensible_backbones(self):
        cases = [
            (
                "How to design a concrete infrastructure system that autonomously seals micro-cracks before they propagate, extending service life in aggressive chemical environments?",
                ["polyurethane", "chemical resistance", "autonomous", "microcapsule"],
            ),
            (
                "How to design an adhesive system that can rapidly cure and maintain high peel strength on submerged, irregular metallic surfaces in turbulent flow environments?",
                ["protected delivery", "carrier", "coacervation", "peel strength"],
            ),
            (
                "How to design a low-noise rotor blade that suppresses vortex shedding and broadband aerodynamic noise while preserving lift-to-drag efficiency?",
                ["trailing-edge", "lighthill", "low-mach", "not shock"],
            ),
            (
                "How to coordinate a decentralized underwater glider swarm to map and track dynamic chemical plumes without relying on GPS or high-bandwidth communication?",
                ["acoustic", "ekf", "sparse gaussian process", "bandwidth"],
            ),
            (
                "How to design a dry, reversible attachment mechanism for space debris retrieval robots that functions reliably in vacuum, extreme temperatures, and zero gravity without degrading the target surface?",
                ["opposing shear", "normal preload", "outgassing", "dust"],
            ),
            (
                "How to design a self-regulating structural material whose thermal conductivity and porosity change passively with environmental conditions?",
                ["solid-state", "shape-memory", "hydrogel", "durability"],
            ),
        ]

        for query, required_terms in cases:
            with self.subTest(query=query):
                backbone, policy = search._infer_engineering_backbone(query)
                self.assertEqual(policy, "balanced")
                self.assertTrue(search._prefer_query_first_generation(query))
                lowered = backbone.lower()
                for term in required_terms:
                    self.assertIn(term, lowered)

    def test_infer_engineering_backbone_balanced_policy(self):
        # A generic open-divergence problem
        b_gen, p_gen = search._infer_engineering_backbone("How to design a self-regulating transport network in porous media?")
        self.assertEqual(p_gen, "balanced")
        self.assertIn("standard architecture", b_gen.lower())

    def test_infer_engineering_backbone_for_closed_loop_life_support(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a fully closed-loop, zero-waste life support architecture for a multi-decade deep space habitat, relying solely on in-situ resource utilization and internal recycling?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("environmental control and life support", backbone.lower())
        self.assertIn("carbon", backbone.lower())
        self.assertIn("water recovery", backbone.lower())
        self.assertIn("isru", backbone.lower())

    def test_infer_engineering_backbone_for_desalination_membrane(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a high-throughput, fouling-resistant membrane for reverse osmosis seawater desalination?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("reverse osmosis", backbone.lower())
        self.assertIn("antifouling", backbone.lower())
        self.assertIn("cross-flow", backbone.lower())

    def test_infer_engineering_backbone_for_underwater_adhesive_cure(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design an adhesive system that can rapidly cure and maintain high peel strength on submerged, irregular metallic surfaces in turbulent flow environments?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("coacervation", backbone.lower())
        self.assertIn("catechol", backbone.lower())
        self.assertIn("peel strength", backbone.lower())

    def test_infer_engineering_backbone_for_external_pipeline_drag_query(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design an external pipeline coating that passively reduces turbulent drag for fluids pumped at high Reynolds numbers over long distances?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("indirect coupling", backbone.lower())
        self.assertIn("external coating", backbone.lower())
        self.assertIn("internal flow", backbone.lower())

    def test_infer_engineering_backbone_for_noninvasive_bci(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a non-invasive, high-bandwidth brain-computer interface capable of reading and writing neural states with single-neuron resolution across deep brain structures?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("magnetoelectric", backbone.lower())
        self.assertIn("focused ultrasound", backbone.lower())
        self.assertIn("hard physical limit", backbone.lower())

    def test_infer_engineering_backbone_for_stratospheric_haps(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a zero-emission, perpetual-flight atmospheric satellite (pseudo-satellite) capable of maintaining geostationary position in the stratosphere through complete seasonal cycles?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("seasonal energy balance", backbone.lower())
        self.assertIn("regenerative fuel cells", backbone.lower())
        self.assertIn("aeroelastic", backbone.lower())

    def test_infer_engineering_backbone_for_multiobjective_facade(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a smart building facade that dynamically optimizes energy generation, natural lighting, and indoor air quality simultaneously, adapting autonomously to extreme diurnal and seasonal climate shifts?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("energy generation", backbone.lower())
        self.assertIn("daylighting", backbone.lower())
        self.assertIn("air quality", backbone.lower())

    def test_infer_engineering_backbone_for_trace_rare_earth_extraction(self):
        backbone, policy = search._infer_engineering_backbone(
            "How to design a highly selective, low-energy system for extracting trace rare earth elements directly from raw seawater, overcoming the extremely low concentrations and high competing ion interference?"
        )
        self.assertEqual(policy, "balanced")
        self.assertIn("trace concentration", backbone.lower())
        self.assertIn("competing-ion", backbone.lower())
        self.assertIn("energy per mole", backbone.lower())

    def test_new_paper_core_queries_q39_to_q44_prefer_query_first_and_have_backbones(self):
        cases = [
            (
                "How to design a fully closed-loop life support habitat for deep space crews that maintains carbon, oxygen, water, and waste closure through long-duration operation while integrating ISRU-derived makeup streams without Earth resupply?",
                ["life support", "isru", "water", "buffer storage"],
            ),
            (
                "How to design a perpetual-flight atmospheric satellite operating in the stratosphere that maintains station over a fixed region across winter and night cycles while preserving aeroelastic stability and zero-emission operation?",
                ["seasonal energy balance", "aeroelastic", "station-keeping", "fixed region"],
            ),
            (
                "How to design a smart building facade that coordinates energy generation, natural lighting, and indoor air quality in one adaptive envelope while remaining effective through extreme daily and seasonal climate swings?",
                ["energy generation", "air quality", "daylight", "adaptive envelope", "enthalpy"],
            ),
            (
                "How to design a low-energy rare earth extraction architecture for seawater that remains selective at trace concentration, rejects competing ions, and supports practical regeneration at useful throughput?",
                ["trace concentration", "competing-ion", "energy per mole", "useful throughput", "contactor", "brine"],
            ),
            (
                "How to design a submerged adhesive for metallic repair patches that rapidly cures underwater, tolerates turbulent flow during application, and preserves high peel strength on rough irregular surfaces?",
                ["coacervation", "peel strength", "metal", "repair patch"],
            ),
            (
                "How to design an external pipeline coating that reduces turbulent drag over long-distance transport lines while preserving the external-only boundary condition and giving a defensible indirect coupling path to the internal flow?",
                ["indirect coupling", "internal flow", "external coating", "external-only boundary condition"],
            ),
        ]

        for query, required_terms in cases:
            with self.subTest(query=query):
                backbone, policy = search._infer_engineering_backbone(query)
                self.assertEqual(policy, "balanced")
                self.assertTrue(search._prefer_query_first_generation(query))
                lowered = backbone.lower()
                for term in required_terms:
                    self.assertIn(term, lowered)

    def test_hybrid_sql_coalesces_fts_fields(self):
        sql = search.build_hybrid_search_sql(0.7, 0.3)
        self.assertIn("COALESCE(v.title, f.title)", sql)
        self.assertIn("COALESCE(v.summary, f.summary)", sql)
        self.assertIn("COALESCE(v.findings, f.findings)", sql)

    def test_format_community_context_uses_evidence_pack_top3(self):
        communities = [
            {
                "title": "Capillary Routing",
                "summary": "Uses curvature-driven capillary routing for passive transport.",
                "findings": '{"transfer_insights":["Use wettability contrast to steer fluid"],"trade_offs":"Sensitive to clogging","technical_details":"ΔP = 2γ/R"}',
            },
            {
                "title": "Thermal Shielding",
                "summary": "Uses layered porous insulation to isolate surface temperature.",
                "findings": '{"sparks":["Use porous layer to decouple thermal mass"],"trade_offs":"Moisture ingress collapses insulation","technical_details":"k_eff drops with tortuous pores"}',
            },
            {
                "title": "Adaptive Surface",
                "summary": "Uses tunable emissivity with switchable surface state.",
                "findings": '{"transfer_insights":["Switch emissivity around threshold state"],"trade_offs":"Response speed vs stability","technical_details":"VO2 transition near Tc"}',
            },
            {
                "title": "Should Be Trimmed",
                "summary": "This fourth community should not appear.",
                "findings": '{"transfer_insights":["Ignore me"],"trade_offs":"N/A","technical_details":"N/A"}',
            },
        ]

        context = search.format_community_context(communities)

        self.assertEqual(context.count("### Community:"), 3)
        self.assertIn("**Mechanism**:", context)
        self.assertIn("**Use-case Fit**:", context)
        self.assertIn("**Hard Detail**:", context)
        self.assertIn("**Main Trade-off**:", context)
        self.assertNotIn("BioSpark", context)
        self.assertNotIn("Should Be Trimmed", context)

    async def test_prune_relevant_communities_keeps_failures_and_true_results(self):
        communities = [
            {"title": "drop", "summary": "a"},
            {"title": "keep", "summary": "b"},
            {"title": "error", "summary": "c"},
        ]

        async def fake_check(query, title, summary):
            if title == "drop":
                return False
            if title == "keep":
                return True
            raise RuntimeError("judge failed")

        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance", side_effect=fake_check
        ):
            relevant = await search.prune_relevant_communities("query", communities)

        self.assertEqual([item["title"] for item in relevant], ["keep", "error"])

    async def test_prune_relevant_communities_drops_off_axis_thermal_hits_for_life_support_query(self):
        query = "How to design a fully closed-loop, zero-waste life support architecture for a multi-decade deep space habitat, relying solely on in-situ resource utilization and internal recycling?"
        communities = [
            {
                "title": "Passive Autonomous Inflatable Thermal Regulation",
                "summary": "Uses smart inflatable radiators and thermosyphons to modulate radiative area in vacuum environments.",
            },
            {
                "title": "Closed-Loop Water and Carbon Recovery",
                "summary": "Combines carbon dioxide reduction, water recovery, waste reprocessing, and ISRU-fed makeup loops for long-duration habitats.",
            },
        ]

        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)

        self.assertEqual([item["title"] for item in relevant], ["Closed-Loop Water and Carbon Recovery"])

    async def test_prune_relevant_communities_drops_reversible_adhesion_hits_for_curing_adhesive_query(self):
        query = "How to design an adhesive system that can rapidly cure and maintain high peel strength on submerged, irregular metallic surfaces in turbulent flow environments?"
        communities = [
            {
                "title": "Bio-Inspired Switchable Underwater Adhesion",
                "summary": "A reversible attachment system with active release and repeatable detachment cycles.",
            },
            {
                "title": "Catechol-Coacervate Underwater Bonding",
                "summary": "Combines coacervation, catechol coordination, rapid aqueous cure, and cohesive toughening for submerged metallic bonding.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Catechol-Coacervate Underwater Bonding"])

    async def test_prune_relevant_communities_drops_offaxis_mechanics_for_noninvasive_bci(self):
        query = "How to design a non-invasive, high-bandwidth brain-computer interface capable of reading and writing neural states with single-neuron resolution across deep brain structures?"
        communities = [
            {
                "title": "Adaptive Interfacial Adhesion Mechanics",
                "summary": "Focuses on contact mechanics and reversible attachment interfaces.",
            },
            {
                "title": "Ultrasonic Magnetoelectric Neural Readout",
                "summary": "Uses focused ultrasound, magnetoelectric nanoparticles, and deep-brain neural sensing channels for non-invasive read/write pathways.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Ultrasonic Magnetoelectric Neural Readout"])

    async def test_prune_relevant_communities_drops_offaxis_thermal_hits_for_haps_query(self):
        query = "How to design a zero-emission, perpetual-flight atmospheric satellite (pseudo-satellite) capable of maintaining geostationary position in the stratosphere through complete seasonal cycles?"
        communities = [
            {
                "title": "Passive Autonomous Inflatable Thermal Regulation",
                "summary": "Uses smart inflatable radiators and thermosyphons for autonomous thermal control.",
            },
            {
                "title": "Seasonal Stratospheric Energy Balance",
                "summary": "Combines regenerative fuel cells, stratospheric station-keeping, and aeroelastic margin management across diurnal and seasonal cycles.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Seasonal Stratospheric Energy Balance"])

    async def test_prune_relevant_communities_drops_generic_adsorption_for_trace_ree_query(self):
        query = "How to design a highly selective, low-energy system for extracting trace rare earth elements directly from raw seawater, overcoming the extremely low concentrations and high competing ion interference?"
        communities = [
            {
                "title": "Biomimetic Hierarchical Porous Carbon Electrodes",
                "summary": "Describes high-throughput porous carbon electrodes for bulk capacitive deionization.",
            },
            {
                "title": "Lanmodulin Electrochemical REE Capture",
                "summary": "Uses lanmodulin-inspired selective binding, competing-ion rejection, and low-energy electrochemical regeneration for trace rare-earth extraction from seawater.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Lanmodulin Electrochemical REE Capture"])

    async def test_prune_relevant_communities_drops_offaxis_reliability_hits_for_q39_life_support_habitat(self):
        query = "How to design a fully closed-loop life support habitat for deep space crews that maintains carbon, oxygen, water, and waste closure through long-duration operation while integrating ISRU-derived makeup streams without Earth resupply?"
        communities = [
            {
                "title": "Generic Habitat Predictive Maintenance",
                "summary": "Focuses on reliability dashboards, spare-part scheduling, and anomaly detection for remote facilities.",
            },
            {
                "title": "ISRU-Coupled Carbon and Water Closure",
                "summary": "Combines air revitalization, water recovery, waste processing, and ISRU-derived makeup streams for long-duration habitat closure.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["ISRU-Coupled Carbon and Water Closure"])

    async def test_prune_relevant_communities_drops_solar_only_hits_for_q40_fixed_region_haps(self):
        query = "How to design a perpetual-flight atmospheric satellite operating in the stratosphere that maintains station over a fixed region across winter and night cycles while preserving aeroelastic stability and zero-emission operation?"
        communities = [
            {
                "title": "Solar Array Optimization for Aircraft",
                "summary": "Improves daytime photovoltaic packing and wing-surface irradiance capture without addressing night storage or station-keeping.",
            },
            {
                "title": "Fixed-Region Stratospheric Energy Balance",
                "summary": "Couples regenerative fuel cells, winter-night energy closure, aeroelastic control, and persistent regional station-keeping in the stratosphere.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Fixed-Region Stratospheric Energy Balance"])

    async def test_prune_relevant_communities_drops_single_objective_hits_for_q41_facade(self):
        query = "How to design a smart building facade that coordinates energy generation, natural lighting, and indoor air quality in one adaptive envelope while remaining effective through extreme daily and seasonal climate swings?"
        communities = [
            {
                "title": "Static BIPV Shading Panels",
                "summary": "Optimizes solar harvesting and glare control but does not integrate ventilation or indoor air-quality conditioning.",
            },
            {
                "title": "Adaptive Energy-Daylight-IAQ Facade",
                "summary": "Integrates photovoltaic skin, daylight routing, ventilation channels, and adaptive air-quality management across daily and seasonal operation.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Adaptive Energy-Daylight-IAQ Facade"])

    async def test_prune_relevant_communities_drops_generic_adsorption_hits_for_q42_useful_throughput(self):
        query = "How to design a low-energy rare earth extraction architecture for seawater that remains selective at trace concentration, rejects competing ions, and supports practical regeneration at useful throughput?"
        communities = [
            {
                "title": "Generic Porous Adsorbent Beds",
                "summary": "Describes high-surface-area adsorption media for dilute ions but gives no competing-ion strategy or regeneration throughput architecture.",
            },
            {
                "title": "Selective REE Capture with Regeneration Throughput",
                "summary": "Combines selective binding, competing-ion rejection, regeneration energy control, and seawater-scale contactor throughput for rare earth recovery.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Selective REE Capture with Regeneration Throughput"])

    async def test_prune_relevant_communities_drops_reversible_patch_hits_for_q43(self):
        query = "How to design a submerged adhesive for metallic repair patches that rapidly cures underwater, tolerates turbulent flow during application, and preserves high peel strength on rough irregular surfaces?"
        communities = [
            {
                "title": "Reusable Underwater Patch Attachment",
                "summary": "A reversible patch mounting concept with active release and repeat-use cycles for temporary underwater fixtures.",
            },
            {
                "title": "Structural Repair-Patch Underwater Adhesive",
                "summary": "Uses coacervation, metallic coordination, and bulk toughening to cure structural repair patches underwater under turbulent flow.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["Structural Repair-Patch Underwater Adhesive"])

    async def test_prune_relevant_communities_drops_internal_liner_hits_for_q44(self):
        query = "How to design an external pipeline coating that reduces turbulent drag over long-distance transport lines while preserving the external-only boundary condition and giving a defensible indirect coupling path to the internal flow?"
        communities = [
            {
                "title": "Internal Riblet Flow Liner",
                "summary": "Reduces drag by texturing the internal wetted wall with riblets and slip-promoting liner materials.",
            },
            {
                "title": "External-Only Indirect Coupling Coating",
                "summary": "Uses external compliant coating dynamics and pressure-fluctuation attenuation to indirectly reduce internal pumping losses without internal modification.",
            },
        ]
        with mock.patch(
            "ai_service.search.retrieval.check_community_relevance",
            new=mock.AsyncMock(return_value=True),
        ):
            relevant = await search.prune_relevant_communities(query, communities)
        self.assertEqual([item["title"] for item in relevant], ["External-Only Indirect Coupling Coating"])

    async def test_vector_search_releases_db_connection_before_llm_call(self):
        pool = _Pool(rows=[{"name": "node", "description": "desc"}])

        async def fake_draft(*args, **kwargs):
            self.assertEqual(pool.active, 0)
            return "draft"

        async def fake_refine(*args, **kwargs):
            self.assertEqual(pool.active, 0)
            return "final"

        with (
            mock.patch("ai_service.search.retrieval.get_db_pool", return_value=pool),
            mock.patch(
                "ai_service.search.pipeline.get_embedding",
                new=mock.AsyncMock(return_value=TEST_EMBEDDING),
            ),
            mock.patch("ai_service.search.pipeline.get_gemini_response", side_effect=fake_draft),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer", side_effect=fake_refine
            ),
        ):
            result = await search.perform_vector_search("query", bypass_critic=False)

        self.assertEqual(result["answer"], "final")
        self.assertEqual(result["format_version"], "v2")
        self.assertEqual(result["format_kind"], "legacy_text")
        self.assertFalse(result["sanitized"])
        self.assertIsNone(result["sections"])
        self.assertEqual(pool.active, 0)

    async def test_perform_hybrid_search_returns_structured_sections_when_critic_outputs_json(self):
        communities = [
            {
                "title": "React Community",
                "summary": "summary",
                "findings": "{}",
            }
        ]

        structured = """
        {
          "thinking_summary": ["React 19 migration needs staged rollout."],
          "mechanism_check": { "body": "Mechanism is sound.", "verdict": "sound" },
          "feasibility_check": { "body": "Feasibility is high.", "verdict": "high" },
          "search_diagnostics": {
            "intent_type": "convergent",
            "recommended_vector_weight": 0.2,
            "barrier_triggered": false
          },
          "global_insight": {
            "summary": "React 19 should be adopted incrementally.",
            "details": ["Start with compiler-safe surfaces."]
          },
          "primary_recommendation": "Adopt a staged createRoot migration as the single primary path.",
          "why_this_path": "It minimizes concurrent upgrade risk while keeping the migration tractable.",
          "engineering_blueprint": {
            "core_structure": "Migrate app entry points first, then feature shells, then edge utilities.",
            "materials_or_components": "Use createRoot, updated test adapters, and compiler-safe component boundaries.",
            "parameter_direction": "Start with a low-risk surface set and expand once type and test regressions stabilize.",
            "manufacturing_or_integration_path": "Integrate behind branch-based rollout with CI checks at each stage."
          },
          "alternatives": [
            {
              "title": "Full-batch migration",
              "detail": "Migrate all roots at once only if the app surface is tiny and test coverage is already strong."
            },
            {
              "title": "Should be trimmed",
              "detail": "This extra alternative should be removed."
            }
          ],
          "risks_and_tradeoffs": [
            "Compiler regressions may surface in legacy patterns.",
            "Entry-point migration can temporarily duplicate boot code.",
            "Feature teams may need staggered ownership alignment.",
            "This extra risk should be trimmed."
          ],
          "action_summary": [
            {
              "title": "Upgrade entry points",
              "detail": "Move to createRoot in all apps.",
              "priority": "P1",
              "lane": "立即执行"
            },
            {
              "title": "Harden tests",
              "detail": "Update renderer and concurrency-sensitive snapshots.",
              "priority": "P1",
              "lane": "立即执行"
            },
            {
              "title": "Stage rollout",
              "detail": "Ship per-surface behind branch gates.",
              "priority": "P2",
              "lane": "本轮重构"
            },
            {
              "title": "Should be trimmed",
              "detail": "This fourth action should not survive.",
              "priority": "P3",
              "lane": "后续清理"
            }
          ]
        }
        """

        calls = []

        async def fake_llm(*args, **kwargs):
            calls.append(kwargs)
            return "draft"

        async def fake_critic(*args, **kwargs):
            calls.append({"critic": kwargs})
            return structured

        with (
            mock.patch(
                "ai_service.search.pipeline.retrieve_hybrid_communities",
                new=mock.AsyncMock(return_value=communities),
            ),
            mock.patch(
                "ai_service.search.pipeline.prune_relevant_communities",
                new=mock.AsyncMock(return_value=communities),
            ),
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                side_effect=fake_llm,
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                side_effect=fake_critic,
            ),
            mock.patch(
                "ai_service.search.pipeline.run_engineering_delivery_pass",
                new=mock.AsyncMock(return_value=structured),
            ),
        ):
            result = await search.perform_hybrid_search(
                "How to design a low-energy, anti-clogging filtration system for separating microplastics from large volumes of water?"
            )

        self.assertEqual(result["format_version"], "v2")
        self.assertEqual(result["format_kind"], "structured_json")
        self.assertEqual(result["sections"]["mechanism_check"]["verdict"], "sound")
        self.assertEqual(result["sections"]["action_summary"][0]["priority"], "P1")
        self.assertEqual(result["sections"]["action_summary"][0]["lane"], "立即执行")
        self.assertEqual(result["sections"]["primary_recommendation"], "Adopt a staged createRoot migration as the single primary path.")
        self.assertEqual(result["sections"]["engineering_blueprint"]["core_structure"], "Migrate app entry points first, then feature shells, then edge utilities.")
        self.assertEqual(len(result["sections"]["alternatives"]), 1)
        self.assertEqual(len(result["sections"]["risks_and_tradeoffs"]), 3)
        self.assertEqual(len(result["sections"]["action_summary"]), 3)
        self.assertNotIn("thinking_summary", result["answer"])
        self.assertNotIn("机制校验", result["answer"])
        self.assertNotIn("可行性评估", result["answer"])
        self.assertNotIn("搜索诊断", result["answer"])
        self.assertEqual(result["supporting_communities"][0]["title"], "React Community")
        self.assertEqual(result["retrieval_diagnostics"]["search_mode"], "hybrid")
        self.assertIn("Engineering Backbone", calls[1]["prompt"])
        self.assertIn("cross-flow hydrodynamics", calls[1]["prompt"].lower())

    async def test_perform_hybrid_search_runs_engineering_delivery_pass_after_critic(self):
        communities = [
            {
                "title": "Adhesive Community",
                "summary": "summary",
                "findings": "{}",
            }
        ]
        critic_output = """{
          "primary_recommendation": "Use a shielded phenalkamine-cured coacervate adhesive.",
          "why_this_path": "It protects the submerged repair path during cure.",
          "engineering_blueprint": {
            "core_structure": "Protected applicator and structural adhesive core.",
            "materials_or_components": "Coacervate primer and epoxy core.",
            "parameter_direction": "initial target: fast underwater cure.",
            "manufacturing_or_integration_path": "Clamp, dispense, and proof-load."
          },
          "action_summary": [
            {"title": "Prototype", "detail": "Build the applicator.", "priority": "P1", "lane": "立即执行"}
          ]
        }"""
        delivered_output = """{
          "primary_recommendation": "Use a shielded phenalkamine-cured coacervate adhesive.",
          "why_this_path": "This keeps the standard underwater repair backbone and adds one bounded transfer enhancement at the wetting and delivery stage.",
          "engineering_blueprint": {
            "core_structure": "Magnetic clamp plus elastomeric cofferdam, coacervate wetting primer, and structural adhesive core.",
            "materials_or_components": "Catechol-functional primer, phenalkamine-cured epoxy, core-shell rubber, and compliant sealing skirt.",
            "parameter_direction": "estimated starting range: gel time 30-120 s; initial target: peel strength >2 kN/m; validation protocol: turbulent-flow coupon tests.",
            "manufacturing_or_integration_path": "Prepare the rough metal, clamp the cofferdam, dispense through a static mixer, and proof-load after cure."
          },
          "delivery_profile": "materials_process_delivery",
          "transfer_mapping": {
            "baseline_backbone": "Protected underwater adhesive application with structural epoxy core.",
            "bottleneck": "Pre-gel washout and poor peel retention on rough wet metal.",
            "selected_transfer_mechanism": "Coacervate-assisted wetting with shielded delivery.",
            "engineering_role": "failure mitigation",
            "translated_effect": "Improves wet-surface displacement and keeps the adhesive in place until cure completes.",
            "implementation_slot": "Primer and protected applicator stage ahead of the structural adhesive core.",
            "validation_hook": "Validate gel time, peel, and shear under turbulent exposure."
          },
          "detail_density_check": ["materials", "ranges", "validation", "integration", "failure_boundary"],
          "action_summary": [
            {"title": "Prototype delivery tool", "detail": "Build the magnetic cofferdam and static mixer.", "priority": "P1", "lane": "立即执行"},
            {"title": "Tune cure window", "detail": "Set phenalkamine loading for 30-120 s underwater gelation.", "priority": "P1", "lane": "立即执行"},
            {"title": "Validate rough-metal repair", "detail": "Run turbulent-flow peel and shear tests.", "priority": "P2", "lane": "本轮重构"}
          ]
        }"""

        with (
            mock.patch(
                "ai_service.search.pipeline.retrieve_hybrid_communities",
                new=mock.AsyncMock(return_value=communities),
            ),
            mock.patch(
                "ai_service.search.pipeline.prune_relevant_communities",
                new=mock.AsyncMock(return_value=communities),
            ),
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                new=mock.AsyncMock(return_value="draft"),
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                new=mock.AsyncMock(return_value=critic_output),
            ),
            mock.patch(
                "ai_service.search.pipeline.run_engineering_delivery_pass",
                new=mock.AsyncMock(return_value=delivered_output),
            ) as delivery_mock,
        ):
            result = await search.perform_hybrid_search(
                "How can a submerged adhesive rapidly cure on rough metallic repair patches while preserving peel strength under turbulent flow?"
            )

        self.assertEqual(result["sections"]["delivery_profile"], "materials_process_delivery")
        self.assertEqual(result["sections"]["transfer_mapping"]["engineering_role"], "failure mitigation")
        self.assertGreaterEqual(len(result["sections"]["detail_density_check"]), 4)
        delivery_mock.assert_awaited_once()

    async def test_perform_hybrid_search_repairs_legacy_html_echo_into_sections(self):
        communities = [
            {
                "title": "React Community",
                "summary": "summary",
                "findings": "{}",
            }
        ]

        legacy = """
        <article class="insight-xml-card insight-xml-card--success">
          <div class="insight-xml-header">
            <span class="insight-xml-eyebrow">Mechanism Check</span>
            <h3 class="insight-xml-title">机制校验</h3>
          </div>
          <div class="insight-xml-body">
            <p>物理机制向软件架构的迁移在逻辑上是自洽的。</p>
          </div>
        </article>

        Search Diagnostics
        { "intent_type": "divergent", "recommended_vector_weight": 0.85, "barrier_triggered": false }

        Action Summary
        <div class="insight-xml-action-item">
          <div class="insight-xml-action-copy">
            <div class="insight-xml-action-heading">升级入口</div>
            <div class="insight-xml-action-detail">切换到 createRoot。</div>
          </div>
        </div>
        """

        with (
            mock.patch(
                "ai_service.search.pipeline.retrieve_hybrid_communities",
                new=mock.AsyncMock(return_value=communities),
            ),
            mock.patch(
                "ai_service.search.pipeline.prune_relevant_communities",
                new=mock.AsyncMock(return_value=communities),
            ),
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                new=mock.AsyncMock(return_value="draft"),
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                new=mock.AsyncMock(return_value=legacy),
            ),
        ):
            result = await search.perform_hybrid_search("query")

        self.assertEqual(result["format_kind"], "structured_json")
        self.assertTrue(result["sanitized"])
        self.assertEqual(result["sections"]["search_diagnostics"]["intent_type"], "divergent")
        self.assertEqual(result["sections"]["action_summary"][0]["title"], "升级入口")

    async def test_perform_hybrid_search_prefers_query_first_generation_for_life_support_and_passes_override_notes_to_critic(self):
        query = "How to design a fully closed-loop, zero-waste life support architecture for a multi-decade deep space habitat, relying solely on in-situ resource utilization and internal recycling?"
        llm_calls = []
        critic_calls = []

        async def fake_llm(*args, **kwargs):
            llm_calls.append(kwargs)
            return "fallback draft"

        async def fake_critic(*args, **kwargs):
            critic_calls.append(kwargs)
            return "final answer"

        with (
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                side_effect=fake_llm,
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                side_effect=fake_critic,
            ),
        ):
            result = await search.perform_hybrid_search(query)

        self.assertEqual(result["answer"], "final answer")
        self.assertEqual(result["retrieval_diagnostics"]["communities_considered"], 0)
        self.assertIn("query-first", llm_calls[0]["prompt"].lower())
        self.assertIn("carbon, oxygen, water, and waste", llm_calls[0]["prompt"].lower())
        self.assertIn("query-first drafting mode", critic_calls[0]["context"].lower())

    async def test_perform_hybrid_search_uses_query_first_fallback_when_adhesive_context_is_pruned_and_passes_override_notes_to_critic(self):
        query = "How to design an adhesive system that can rapidly cure and maintain high peel strength on submerged, irregular metallic surfaces in turbulent flow environments?"
        llm_calls = []
        critic_calls = []

        async def fake_llm(*args, **kwargs):
            llm_calls.append(kwargs)
            return "adhesive fallback draft"

        async def fake_critic(*args, **kwargs):
            critic_calls.append(kwargs)
            return "adhesive final answer"

        with (
            mock.patch(
                "ai_service.search.pipeline._prefer_query_first_generation",
                return_value=False,
            ),
            mock.patch(
                "ai_service.search.pipeline.retrieve_hybrid_communities",
                new=mock.AsyncMock(return_value=[{"title": "off-axis", "summary": "adhesion", "findings": "{}"}]),
            ),
            mock.patch(
                "ai_service.search.pipeline.prune_relevant_communities",
                new=mock.AsyncMock(return_value=[]),
            ),
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                side_effect=fake_llm,
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                side_effect=fake_critic,
            ),
        ):
            result = await search.perform_hybrid_search(query)

        self.assertEqual(result["answer"], "adhesive final answer")
        self.assertEqual(result["retrieval_diagnostics"]["communities_retained"], 0)
        self.assertIn("no directly relevant graph communities survived pruning", llm_calls[0]["prompt"].lower())
        self.assertIn("reversible attachment", llm_calls[0]["prompt"].lower())

        self.assertIn("no directly relevant graph communities survived pruning", critic_calls[0]["context"].lower())

    async def test_perform_hybrid_search_prefers_query_first_generation_for_desalination(self):
        query = "How to design a high-throughput, fouling-resistant membrane for reverse osmosis seawater desalination?"
        llm_calls = []

        async def fake_llm(*args, **kwargs):
            llm_calls.append(kwargs)
            return "desal draft"

        with (
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                side_effect=fake_llm,
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                new=mock.AsyncMock(return_value="desal final"),
            ),
        ):
            result = await search.perform_hybrid_search(query)

        self.assertEqual(result["answer"], "desal final")
        self.assertEqual(result["retrieval_diagnostics"]["communities_considered"], 0)
        self.assertIn("query-first", llm_calls[0]["prompt"].lower())
        self.assertIn("cross-flow/hydrodynamic fouling control", llm_calls[0]["prompt"].lower())
        self.assertIn("concentration polarization", llm_calls[0]["prompt"].lower())

    async def test_perform_hybrid_search_prefers_query_first_generation_for_underwater_adhesive(self):
        query = "How to design an adhesive system that can rapidly cure and maintain high peel strength on submerged, irregular metallic surfaces in turbulent flow environments?"
        llm_calls = []

        async def fake_llm(*args, **kwargs):
            llm_calls.append(kwargs)
            return "adhesive draft"

        with (
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                side_effect=fake_llm,
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                new=mock.AsyncMock(return_value="adhesive final"),
            ),
        ):
            result = await search.perform_hybrid_search(query)

        self.assertEqual(result["answer"], "adhesive final")
        self.assertEqual(result["retrieval_diagnostics"]["communities_considered"], 0)
        self.assertIn("query-first", llm_calls[0]["prompt"].lower())
        self.assertIn("bulk toughening", llm_calls[0]["prompt"].lower())
        self.assertIn("reversible attachment", llm_calls[0]["prompt"].lower())

    async def test_perform_hybrid_search_prefers_query_first_generation_for_haps(self):
        query = "How to design a zero-emission, perpetual-flight atmospheric satellite (pseudo-satellite) capable of maintaining geostationary position in the stratosphere through complete seasonal cycles?"
        llm_calls = []

        async def fake_llm(*args, **kwargs):
            llm_calls.append(kwargs)
            return "haps draft"

        with (
            mock.patch(
                "ai_service.search.pipeline.get_gemini_response",
                side_effect=fake_llm,
            ),
            mock.patch(
                "ai_service.search.pipeline.evaluate_and_refine_answer",
                new=mock.AsyncMock(return_value="haps final"),
            ),
        ):
            result = await search.perform_hybrid_search(query)

        self.assertEqual(result["answer"], "haps final")
        self.assertEqual(result["retrieval_diagnostics"]["communities_considered"], 0)
        self.assertIn("seasonal energy balance", llm_calls[0]["prompt"].lower())
        self.assertIn("query-first", llm_calls[0]["prompt"].lower())
        self.assertIn("hardest requirement", llm_calls[0]["prompt"].lower())

    def test_coerce_global_search_response_renders_primary_decision_sections(self):
        response = search.coerce_global_search_response(
            """
            {
              "primary_recommendation": "Use a single capillary-gradient collection mesh as the main design.",
              "why_this_path": "It preserves passive transport while keeping the structure manufacturable.",
              "engineering_blueprint": {
                "core_structure": "Layered fog mesh with directional drainage channels.",
                "materials_or_components": "UV-stabilized polypropylene mesh with steel mast supports.",
                "parameter_direction": "Favor 35%-45% mesh solidity and 4-6 m panel height.",
                "manufacturing_or_integration_path": "Deploy modular panels with gravity-fed piping."
              },
              "alternatives": [
                {"title": "MOF sorption bed", "detail": "Only for ultra-low humidity windows."},
                {"title": "Trim me", "detail": "Should not survive."}
              ],
              "risks_and_tradeoffs": [
                "Salt fouling reduces wetting contrast.",
                "Wind loading can collapse unsupported meshes.",
                "Low humidity reduces collection yield.",
                "Should be trimmed."
              ],
              "action_summary": [
                {"title": "Choose mesh geometry", "detail": "Set solidity and fiber spacing.", "priority": "P1", "lane": "立即执行"},
                {"title": "Define support frame", "detail": "Use guyed mast supports.", "priority": "P1", "lane": "立即执行"},
                {"title": "Plan drainage", "detail": "Use gravity-fed piping.", "priority": "P2", "lane": "本轮重构"},
                {"title": "Trim me", "detail": "Should not survive.", "priority": "P3", "lane": "后续清理"}
              ]
            }
            """
        ).model_dump()

        self.assertEqual(response["sections"]["primary_recommendation"], "Use a single capillary-gradient collection mesh as the main design.")
        self.assertEqual(len(response["sections"]["alternatives"]), 1)
        self.assertEqual(len(response["sections"]["risks_and_tradeoffs"]), 3)
        self.assertEqual(len(response["sections"]["action_summary"]), 3)
        self.assertIn("## 主推荐方案", response["answer"])
        self.assertIn("## 为什么选择这一路径", response["answer"])
        self.assertIn("## 工程实施蓝图", response["answer"])

    def test_coerce_global_search_response_can_render_english_public_answer(self):
        response = search.coerce_global_search_response(
            """
            {
              "primary_recommendation": "Use a single protected underwater adhesive delivery path.",
              "why_this_path": "It prevents turbulent washout while preserving peel strength.",
              "engineering_blueprint": {
                "core_structure": "Static-mixer cartridge with a conformal carrier film.",
                "materials_or_components": "Catechol-functional polymer and tough elastomeric network.",
                "parameter_direction": "Target gelation below 60 seconds and peel strength above 1.5 kN/m.",
                "manufacturing_or_integration_path": "Clean the metal surface, clamp the carrier, then cure in place."
              },
              "risks_and_tradeoffs": ["Nozzle clogging can occur if gelation is too fast."],
              "action_summary": [
                {"title": "Prototype delivery head", "detail": "Build a protected static-mixer applicator.", "priority": "P1", "lane": "立即执行"}
              ]
            }
            """,
            public_language="en",
        ).model_dump()

        self.assertIn("## Primary Recommendation", response["answer"])
        self.assertIn("## Engineering Blueprint", response["answer"])
        self.assertIn("1. Core structure:", response["answer"])
        self.assertNotIn("## 主推荐方案", response["answer"])


class KnowledgeGraphTests(unittest.IsolatedAsyncioTestCase):
    def test_coerce_summary_json_handles_fenced_payload(self):
        payload = _coerce_summary_json(
            """```json
            {"title":"A","summary":"B","sparks":["C"],"trade_offs":"D"}
            ```"""
        )
        self.assertEqual(payload["title"], "A")
        self.assertEqual(payload["sparks"], ["C"])

    async def test_upsert_knowledge_updates_description_and_embedding(self):
        conn = _FakeConn(rows=[{"id": "1", "name": "Lotus"}])
        extraction = KnowledgeExtractionResponse(
            entities=[
                Entity(
                    name="Lotus",
                    type="plant",
                    description="New hydrophobic description",
                )
            ],
            relationships=[
                Relationship(
                    source="Lotus",
                    target="Lotus",
                    relation_type="same",
                    description="skip self",
                )
            ],
        )

        with mock.patch(
            "ai_service.knowledge_graph.get_embedding",
            new=mock.AsyncMock(return_value=TEST_EMBEDDING),
        ):
            await upsert_knowledge_with_connection(conn, extraction)

        entity_query = conn.fetch_queries[0][0]
        self.assertIn("description = EXCLUDED.description", entity_query)
        self.assertIn("embedding = EXCLUDED.embedding", entity_query)
        self.assertIn("canonical_name", entity_query)

    async def test_upsert_knowledge_normalizes_entity_names_and_relationships(self):
        conn = _FakeConn(
            rows=[
                {"id": "1", "name": "Gecko"},
                {"id": "2", "name": "Spider silk"},
            ]
        )
        extraction = KnowledgeExtractionResponse(
            entities=[
                Entity(name="Geckos", type="animal", description="A climbing lizard."),
                Entity(
                    name="Spider-silk",
                    type="material",
                    description="Protein fiber used for resilient webs.",
                ),
                Entity(
                    name="Gecko",
                    type="biological mechanism",
                    description="A biological adhesion mechanism based on setae.",
                ),
                Entity(
                    name="spider silk",
                    type="material strategy",
                    description="A protein fiber with tensile resilience for web construction.",
                ),
            ],
            relationships=[
                Relationship(
                    source="Geckos",
                    target="Spider-silk",
                    relation_type="inspires",
                    description="Gecko-inspired gripping can be combined with spider-silk-like compliance.",
                ),
                Relationship(
                    source="Gecko",
                    target="spider silk",
                    relation_type="inspires",
                    description="Gecko-inspired gripping can be combined with spider-silk-like compliance.",
                ),
            ],
        )

        with mock.patch(
            "ai_service.knowledge_graph.get_embedding",
            new=mock.AsyncMock(return_value=TEST_EMBEDDING),
        ):
            await upsert_knowledge_with_connection(conn, extraction)

        names_arg = conn.fetch_queries[0][1][0]
        canonical_names_arg = conn.fetch_queries[0][1][1]
        descriptions_arg = conn.fetch_queries[0][1][4]
        metadata_arg = conn.fetch_queries[0][1][6]
        self.assertEqual(names_arg, ["Gecko", "Spider silk"])
        self.assertEqual(canonical_names_arg, ["gecko", "spider silk"])
        self.assertIn(
            "A biological adhesion mechanism based on setae.", descriptions_arg
        )
        self.assertIn(
            "A protein fiber with tensile resilience for web construction.",
            descriptions_arg,
        )
        self.assertIn('"aliases": ["Gecko", "Geckos"]', metadata_arg[0])
        relationship_rows = conn.executemany_calls[0][1]
        self.assertEqual(
            relationship_rows,
            [
                (
                    "1",
                    "2",
                    "inspired_by",
                    "Gecko-inspired gripping can be combined with spider-silk-like compliance.",
                    0.6599999999999999,
                    2,
                    "directed",
                    "[]",
                    '["Gecko-inspired gripping can be combined with spider-silk-like compliance."]',
                )
            ],
        )

    async def test_upsert_knowledge_releases_db_connection_before_embedding(self):
        pool = _Pool(rows=[{"id": "1", "name": "Lotus"}])
        extraction = KnowledgeExtractionResponse(
            entities=[
                Entity(name="Lotus", type="plant", description="Hydrophobic leaf")
            ],
            relationships=[],
        )

        async def fake_embedding(_text):
            self.assertEqual(pool.active, 0)
            return TEST_EMBEDDING

        with (
            mock.patch("ai_service.knowledge_graph.db_connected", return_value=True),
            mock.patch("ai_service.knowledge_graph.get_db_pool", return_value=pool),
            mock.patch(
                "ai_service.knowledge_graph.get_embedding", side_effect=fake_embedding
            ),
        ):
            await upsert_knowledge(extraction)

        self.assertEqual(pool.active, 0)


class _FakeChunk:
    def __init__(self, text):
        self.text = text


class _FakeStream:
    def __init__(self, chunks):
        self._chunks = iter(chunks)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._chunks)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class _FakeModels:
    def __init__(self, chunks):
        self._chunks = chunks

    async def generate_content_stream(self, **_kwargs):
        return _FakeStream(self._chunks)


class _FakeAio:
    def __init__(self, chunks):
        self.models = _FakeModels(chunks)


class _FakeClient:
    def __init__(self, chunks):
        self.aio = _FakeAio(chunks)


class MechanismTreeTests(unittest.IsolatedAsyncioTestCase):
    async def test_streaming_mechanism_tree_matches_blocking_ids(self):
        lines = [
            '{"type":"metadata","root_mechanism":"Root"}\n',
            '{"type":"node","id":"root","title":"Root","active_ingredient":"Anchor"}\n',
            '{"type":"node","id":"child","parentId":"root","title":"Child","active_ingredient":"Flow"}\n',
        ]
        async def fake_stream(*args, **kwargs):
            for line in lines:
                yield line
                
        blocking = mechanism_tree.parse_mechanism_tree_content("query", "".join(lines))

        with (
            mock.patch(
                "ai_service.mechanism_tree.client_configured", return_value=True
            ),
            mock.patch("ai_service.mechanism_tree.stream_gemini_response", side_effect=fake_stream),
        ):
            events = [
                item
                async for item in mechanism_tree.stream_mechanism_tree_events("query")
            ]

        payloads = [
            event.removeprefix("data: ").strip()
            for event in events
            if event.startswith("data: {")
        ]
        node_payloads = [
            mechanism_tree.json.loads(payload)
            for payload in payloads
            if '"type": "node"' in payload
        ]
        edge_payloads = [
            mechanism_tree.json.loads(payload)
            for payload in payloads
            if '"type": "edge"' in payload
        ]

        self.assertEqual(
            [item["data"]["id"] for item in node_payloads],
            [node.id for node in blocking.nodes],
        )
        self.assertEqual(
            [item["data"]["id"] for item in edge_payloads],
            [edge.id for edge in blocking.edges],
        )
