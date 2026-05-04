import json
import unittest
from unittest import mock

from ai_service import search
from ai_service.search.delivery import (
    build_review_answer,
    compress_delivery_answer,
    dedupe_review_text,
    engineering_densify_answer,
    run_engineering_delivery_pass,
)
from ai_service.search.parsing import _coerce_sections_from_json
from ai_service.search.response import coerce_global_search_response

class TestRefineV5(unittest.IsolatedAsyncioTestCase):
    def test_coerce_sections_from_json_preserves_review_answer(self):
        raw = """{
            "primary_recommendation": "Use a single MMA/redox underwater adhesive route.",
            "review_answer": "推荐方案：采用一条 MMA/redox 水下快固路线。\\n\\n工程实现：先清理金属表面，再安装护罩并注胶。",
            "action_summary": [
                {"title": "Prototype", "detail": "Build the shrouded applicator.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""
        sections = _coerce_sections_from_json(raw)
        self.assertIsNotNone(sections)
        self.assertIn("推荐方案", sections.review_answer)
        public = coerce_global_search_response(raw, query="中文测试问题", public_language="zh")
        self.assertIn("推荐方案", public.answer)
        self.assertNotIn("Primary Recommendation", public.answer)
        self.assertNotIn("Engineering Blueprint", public.answer)

    def test_build_review_answer_outputs_manual_style_without_internal_headings(self):
        raw = """{
            "primary_recommendation": "MMA/redox underwater snap-cure adhesive with catechol wetting primer.",
            "why_this_path": "MMA/redox is the main fast green-strength route; catechol is only the wetting enhancement.",
            "engineering_blueprint": {
                "core_structure": "Protected shroud/cofferdam delivery on rough submerged metal.",
                "materials_or_components": "MMA/redox acrylic adhesive family; catechol primer; 5-15 wt% CSR toughener.",
                "parameter_direction": "Estimated starting range: 1-3 min green-strength window; lap shear >5 MPa.",
                "manufacturing_or_integration_path": "grit-clean -> seat shroud -> inject -> vent -> hold -> proof-load."
            },
            "risks_and_tradeoffs": ["Reject if visible washout occurs before green strength."],
            "action_summary": [
                {"title": "Design protected delivery", "detail": "Prototype the shroud/static-mixer tool.", "priority": "P1", "lane": "立即执行"},
                {"title": "Tune chemistry", "detail": "Set initiator and CSR loading.", "priority": "P2", "lane": "本轮重构"},
                {"title": "Validate", "detail": "Test rough wet metal coupons.", "priority": "P3", "lane": "后续清理"}
            ]
        }"""
        sections = _coerce_sections_from_json(raw)
        review = build_review_answer(sections, public_language="zh")
        self.assertIn("推荐方案：", review)
        self.assertIn("工程实现：", review)
        self.assertIn("验证路径：", review)
        self.assertIn("风险边界：", review)
        self.assertNotIn("Primary Recommendation", review)
        self.assertNotIn("Engineering Blueprint", review)
        self.assertLessEqual(review.count("1-3 min"), 1)

    def test_dedupe_review_text_removes_repeated_sentence_and_template_noise(self):
        text = (
            "Primary Recommendation\\n"
            "推荐方案：采用 MMA/redox 路线。采用 MMA/redox 路线。\\n"
            "Engineering Blueprint\\n"
            "验证路径：做 lap-shear test。做 lap-shear test。"
        )
        cleaned = dedupe_review_text(text)
        self.assertNotIn("Primary Recommendation", cleaned)
        self.assertNotIn("Engineering Blueprint", cleaned)
        self.assertEqual(cleaned.count("采用 MMA/redox 路线"), 1)
        self.assertEqual(cleaned.count("lap-shear test"), 1)

    def test_coerce_sections_from_json_preserves_engineering_detail_pack(self):
        raw = """{
            "primary_recommendation": "Use a directional dry-adhesion gripper.",
            "why_this_path": "The contact interface stays reversible under vacuum.",
            "delivery_profile": "extreme_environment_attachment_delivery",
            "route_selection": {
                "selected_main_route": "Directional dry-adhesion gripper with bounded electroadhesive tacking",
                "rejected_routes": ["isotropic mushroom-tip PDMS pad"],
                "route_rationale": "Directional shear is more defensible for reversible zero-g attachment than normal pull-off.",
                "transfer_enhancement_slot": "pad interface"
            },
            "engineering_fact_cards": [
                {
                    "mechanism": "directional shear engagement",
                    "component_or_material": "vacuum-qualified silicone family with Kapton-backed electrode",
                    "parameter_or_range": "50-100 um wedge fibrils; 0.5-2 mm shear stroke",
                    "validation_method": "TVAC release test",
                    "failure_boundary": "dust loading collapses contact area",
                    "source_hint": "delivery template"
                }
            ],
            "engineering_detail_pack": {
                "material_grade_or_family": "Vacuum-qualified silicone family with Kapton-backed electrodes",
                "dimension_windows": "Directional wedges 50-100 um tall with bounded preload window",
                "attach_sequence": "touch -> tack -> shear -> hold",
                "detach_sequence": "shear relax -> detack -> back-away",
                "environmental_boundaries": "TVAC, ASTM E595 outgassing, dust/MLI contamination"
            },
            "action_summary": [
                {"title": "Prototype pad", "detail": "Build the dry-adhesion pad.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""
        sections = _coerce_sections_from_json(raw)
        self.assertIsNotNone(sections)
        self.assertIsNotNone(sections.engineering_detail_pack)
        self.assertIn("Kapton", sections.engineering_detail_pack.material_grade_or_family)
        self.assertIn("50-100", sections.engineering_detail_pack.dimension_windows)
        self.assertIn("touch -> tack -> shear -> hold", sections.engineering_detail_pack.attach_sequence)
        self.assertIsNotNone(sections.route_selection)
        self.assertIn("Directional dry-adhesion", sections.route_selection.selected_main_route)
        self.assertEqual(len(sections.engineering_fact_cards), 1)
        self.assertIn("TVAC", sections.engineering_fact_cards[0].validation_method)

    def test_compress_delivery_answer_applies_q9_mma_redox_route_selection(self):
        raw = """{
            "primary_recommendation": "Use a phenalkamine epoxy/coacervate adhesive as the fast underwater snap-cure route.",
            "why_this_path": "It gives underwater wetting but may be slow.",
            "engineering_blueprint": {
                "core_structure": "Protected shroud delivery on rough metal.",
                "materials_or_components": "Phenalkamine epoxy, catechol coacervate primer, and CSR toughener.",
                "parameter_direction": "gel time 30-120 s.",
                "manufacturing_or_integration_path": "Clean, inject, hold, and proof-load."
            },
            "delivery_profile": "materials_process_delivery",
            "action_summary": [
                {"title": "Prototype", "detail": "Build the shrouded applicator.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""

        res = compress_delivery_answer(
            "How can a submerged adhesive rapidly cure on rough metallic repair patches while preserving peel strength under turbulent flow?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        self.assertIsNotNone(sections)
        self.assertIsNotNone(sections.route_selection)
        combined = json.dumps(sections.model_dump(), ensure_ascii=False).lower()
        self.assertIn("mma/redox", combined)
        self.assertIn("catechol", combined)
        self.assertIn("csr", combined)
        self.assertIn("shroud", combined)
        self.assertNotIn("phenalkamine epoxy/coacervate adhesive as the fast", combined)

    def test_compress_delivery_answer_applies_q14_rotor_level_route_selection(self):
        raw = """{
            "primary_recommendation": "Use a trailing-edge serration treatment.",
            "why_this_path": "It reduces edge noise.",
            "engineering_blueprint": {
                "core_structure": "Serrated trailing-edge strip.",
                "materials_or_components": "Porous insert.",
                "parameter_direction": "Size serrations from local boundary layer.",
                "manufacturing_or_integration_path": "Install insert and test."
            },
            "delivery_profile": "aero_hydrodynamic_delivery",
            "action_summary": [
                {"title": "Install strip", "detail": "Bond the insert.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""

        res = compress_delivery_answer(
            "How can a rotor blade reduce aerodynamic noise from vortex shedding and broadband trailing-edge noise?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        combined = json.dumps(sections.model_dump(), ensure_ascii=False).lower()
        self.assertIn("rotor-level", combined)
        self.assertIn("tip mach", combined)
        self.assertIn("spanwise", combined)
        self.assertTrue("lsb" in combined or "tonal-broadband" in combined)
        self.assertIn("aero penalty", combined)

    def test_compress_delivery_answer_applies_q18_glider_specific_route_selection(self):
        raw = """{
            "primary_recommendation": "Use generic AUV swarm behavior for plume mapping.",
            "why_this_path": "It coordinates the vehicles.",
            "engineering_blueprint": {
                "core_structure": "Generic swarm controller.",
                "materials_or_components": "AUV modem and chemical sensor.",
                "parameter_direction": "1 Hz updates.",
                "manufacturing_or_integration_path": "Deploy and coordinate."
            },
            "delivery_profile": "control_protocol_delivery",
            "action_summary": [
                {"title": "Deploy swarm", "detail": "Run the controller.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""

        res = compress_delivery_answer(
            "How can underwater gliders map chemical plumes cooperatively with sparse acoustic communication?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        combined = json.dumps(sections.model_dump(), ensure_ascii=False).lower()
        self.assertIn("glider-specific", combined)
        self.assertIn("inflection", combined)
        self.assertIn("sparse inducing", combined)
        self.assertTrue("tdma" in combined or "low-bandwidth acoustic mac" in combined)
        self.assertIn("fallback", combined)
        self.assertIn("listen", combined)
        self.assertIn("update ekf", combined)
        self.assertIn("update sparse gp", combined)
        self.assertTrue("choose ucb + apf" in combined or "choose waypoint" in combined)
        self.assertNotIn("1 hz", combined)
        public = coerce_global_search_response(res, query="How can underwater gliders map chemical plumes cooperatively with sparse acoustic communication?", public_language="en")
        rendered = public.answer.lower()
        self.assertIn("listen for neighbor packets", rendered)
        self.assertEqual(rendered.count("update sparse gp"), 1)
        self.assertNotIn(".;", rendered)

    def test_compress_delivery_answer_applies_q44_passive_route_with_rationale(self):
        raw = """{
            "primary_recommendation": "Use active spanwise wall forcing as the main coating route.",
            "why_this_path": "It reduces near-wall structures.",
            "engineering_blueprint": {
                "core_structure": "External actuator bands.",
                "materials_or_components": "Piezoelectric actuator coating.",
                "parameter_direction": "Wall-unit forcing.",
                "manufacturing_or_integration_path": "Bond actuators and test pressure drop."
            },
            "delivery_profile": "aero_hydrodynamic_delivery",
            "action_summary": [
                {"title": "Bond actuators", "detail": "Install active coating.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""

        res = compress_delivery_answer(
            "How can an external pipeline coating reduce turbulent drag under an external-only boundary condition?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        combined = json.dumps(sections.model_dump(), ensure_ascii=False).lower()
        self.assertIsNotNone(sections.route_selection)
        self.assertIn("passive", sections.route_selection.selected_main_route.lower())
        self.assertIn("physical coupling boundary", combined)
        self.assertTrue("energy accounting" in combined or "pumping-power" in combined)
        self.assertIn("interface layer", combined)
        self.assertIn("damping layer", combined)
        self.assertTrue("outer shell" in combined or "outer jacket" in combined)
        self.assertIn("gas branch", combined)
        self.assertIn("liquid branch", combined)
        public = coerce_global_search_response(res, query="How can an external pipeline coating reduce turbulent drag under an external-only boundary condition?", public_language="en")
        rendered = public.answer.lower()
        self.assertEqual(rendered.count("physical coupling boundary"), 1)
        self.assertLessEqual(rendered.count("gas branch"), 2)
        self.assertNotIn(".;", rendered)

    async def test_engineering_densifier_prompt_includes_concrete_repair_gaps_for_control_query(self):
        seed = json.dumps(
            {
                "primary_recommendation": "Use a glider-feasible distributed plume-mapping protocol.",
                "why_this_path": "It keeps the architecture glider-feasible.",
                "engineering_blueprint": {
                    "core_structure": "Sparse GP map with APF guidance.",
                    "materials_or_components": "Chemical sensor, CTD, and acoustic modem.",
                    "parameter_direction": "initial target: compact packets and low-bandwidth exchange.",
                    "manufacturing_or_integration_path": "Test in coastal trials."
                },
                "delivery_profile": "control_protocol_delivery",
                "detail_density_check": ["ranges", "integration", "control"],
                "action_summary": [
                    {"title": "Build estimator", "detail": "Prototype local updates.", "priority": "P1", "lane": "立即执行"}
                ]
            },
            ensure_ascii=False,
        )
        captured = {}

        async def fake_gemini(*args, **kwargs):
            captured["prompt"] = kwargs["prompt"]
            return seed

        with mock.patch("ai_service.search.delivery.get_gemini_response", side_effect=fake_gemini):
            result = await engineering_densify_answer(
                "How to design a decentralized control protocol for a fleet of autonomous underwater gliders to collectively map a dynamic chemical plume without global positioning or central command?",
                "context",
                seed,
                active_ingredients="distributed sparse GP and APF",
            )

        if captured:
            self.assertIn("route selector", captured["prompt"].lower())
            self.assertIn("engineering fact cards", captured["prompt"].lower())
        else:
            self.assertIn("route_selection", result)
            self.assertIn("engineering_fact_cards", result)
            self.assertIn("tdma", result.lower())

    async def test_engineering_densifier_prompt_includes_material_process_repair_gaps(self):
        seed = json.dumps(
            {
                "primary_recommendation": "Use an autonomous self-healing concrete with polymer capsules.",
                "why_this_path": "It seals micro-cracks early.",
                "engineering_blueprint": {
                    "core_structure": "Low-permeability concrete with capsules.",
                    "materials_or_components": "GGBS, silica fume, PU capsules, and FRP reinforcement.",
                    "parameter_direction": "initial target: tight crack control and chemical resistance.",
                    "manufacturing_or_integration_path": "Batch the concrete and validate cracked coupons."
                },
                "delivery_profile": "structural_multiphysics_delivery",
                "detail_density_check": ["materials", "ranges", "validation", "integration"],
                "action_summary": [
                    {"title": "Set crack-width limit", "detail": "Keep cracks small.", "priority": "P1", "lane": "立即执行"}
                ]
            },
            ensure_ascii=False,
        )
        captured = {}

        async def fake_gemini(*args, **kwargs):
            captured["prompt"] = kwargs["prompt"]
            return seed

        with mock.patch("ai_service.search.delivery.get_gemini_response", side_effect=fake_gemini):
            await engineering_densify_answer(
                "How to design a concrete infrastructure system that autonomously seals micro-cracks before they propagate, extending service life in aggressive chemical environments?",
                "context",
                seed,
                active_ingredients="microcapsule sealing and mineral densification",
            )

        self.assertIn("dual healing chemistry", captured["prompt"])
        self.assertIn("capsule shell material", captured["prompt"])
        self.assertIn("mixing-sequence", captured["prompt"])

    async def test_engineering_densifier_prompt_requests_typed_detail_fields_for_space_attachment(self):
        seed = json.dumps(
            {
                "primary_recommendation": "Use a directional dry-adhesion gripper with opposing shear actuation.",
                "why_this_path": "It gives reversible attachment with low normal impulse.",
                "engineering_blueprint": {
                    "core_structure": "Directional fibril pads on compliant load-sharing backing.",
                    "materials_or_components": "Vacuum-qualified elastomer and electroadhesive layer.",
                    "parameter_direction": "initial target: low preload and clean release.",
                    "manufacturing_or_integration_path": "Integrate the pad and validate in TVAC."
                },
                "delivery_profile": "extreme_environment_attachment_delivery",
                "detail_density_check": ["materials", "ranges", "validation", "integration"],
                "action_summary": [
                    {"title": "Prototype pad", "detail": "Build the contact pad.", "priority": "P1", "lane": "立即执行"}
                ]
            },
            ensure_ascii=False,
        )
        captured = {}

        async def fake_gemini(*args, **kwargs):
            captured["prompt"] = kwargs["prompt"]
            return seed

        with mock.patch("ai_service.search.delivery.get_gemini_response", side_effect=fake_gemini):
            result = await engineering_densify_answer(
                "How to design a dry, reversible attachment mechanism for space debris retrieval robots that functions reliably in vacuum, extreme temperatures, and zero gravity without degrading the target surface?",
                "context",
                seed,
                active_ingredients="directional wedge-fibril dry adhesion and bounded electroadhesive tacking",
            )

        if captured:
            self.assertIn("engineering_detail_pack", captured["prompt"])
            self.assertIn("material_grade_or_family", captured["prompt"])
            self.assertIn("dimension_windows", captured["prompt"])
            self.assertIn("attach_sequence", captured["prompt"])
            self.assertIn("detach_sequence", captured["prompt"])
        else:
            self.assertIn("electroadhesive", result.lower())
            self.assertIn("attach_sequence", result)

    async def test_run_engineering_delivery_pass_adds_profile_mapping_and_density_slots(self):
        query = "How can a submerged adhesive rapidly cure on rough metallic repair patches while preserving peel strength under turbulent flow?"
        seed = json.dumps(
            {
                "primary_recommendation": "Use a shielded phenalkamine-cured coacervate adhesive for the submerged repair patch.",
                "why_this_path": "It protects the adhesive through the early underwater cure window.",
                "engineering_blueprint": {
                    "core_structure": "Protected applicator with wetting primer and structural adhesive core.",
                    "materials_or_components": "Coacervate primer and phenalkamine-cured epoxy.",
                    "parameter_direction": "initial target: rapid underwater gelation; validation needed: peel and shear after turbulent exposure.",
                    "manufacturing_or_integration_path": "Clamp the protected applicator, dispense through a static mixer, and proof-load the patch after cure."
                },
                "action_summary": [
                    {"title": "Prototype delivery tool", "detail": "Build the shielded applicator.", "priority": "P1", "lane": "立即执行"},
                    {"title": "Tune cure window", "detail": "Set gel time for seawater repair.", "priority": "P1", "lane": "立即执行"},
                    {"title": "Validate coupons", "detail": "Run peel and shear testing.", "priority": "P2", "lane": "本轮重构"}
                ]
            },
            ensure_ascii=False,
        )

        async def fake_gemini(*args, **kwargs):
            return """{
                "primary_recommendation": "Use a shielded phenalkamine-cured coacervate adhesive for the submerged repair patch.",
                "why_this_path": "This keeps the standard underwater repair backbone while using only one bounded transfer enhancement at the wetting and delivery stage.",
                "engineering_blueprint": {
                    "core_structure": "Magnetic clamp plus elastomeric cofferdam, coacervate wetting primer, and phenalkamine-cured structural adhesive core.",
                    "materials_or_components": "Catechol-functional coacervate primer; phenalkamine-cured epoxy; 5-15 wt% core-shell rubber; foam or elastomeric sealing skirt.",
                    "parameter_direction": "estimated starting range: gel time 30-120 s; initial target: peel strength >2 kN/m and lap shear >5 MPa; validation protocol: turbulent-flow coupon tests.",
                    "manufacturing_or_integration_path": "Prepare the rough metal, clamp the cofferdam, dispense through a static mixer, hold compression through cure, then proof-load the patch."
                },
                "delivery_profile": "materials_process_delivery",
                "transfer_mapping": {
                    "baseline_backbone": "Protected underwater adhesive application with structural epoxy core.",
                    "bottleneck": "Pre-gel washout and poor peel retention on rough wet metal.",
                    "selected_transfer_mechanism": "Coacervate-assisted wetting with shielded delivery.",
                    "engineering_role": "failure mitigation",
                    "translated_effect": "Improves wet-surface displacement and keeps the adhesive in place until the structural cure becomes load bearing.",
                    "implementation_slot": "Primer and protected applicator stage ahead of the structural adhesive core.",
                    "validation_hook": "Validate gel time, peel, and shear under turbulent seawater exposure."
                },
                "detail_density_check": ["materials", "ranges", "validation", "integration", "failure_boundary"],
                "action_summary": [
                    {"title": "Build protected delivery tool", "detail": "Prototype the magnetic cofferdam and static mixer.", "priority": "P1", "lane": "立即执行"},
                    {"title": "Tune cure window", "detail": "Set phenalkamine loading for 30-120 s underwater gelation.", "priority": "P1", "lane": "立即执行"},
                    {"title": "Validate rough-metal repair", "detail": "Run turbulent-flow peel and shear tests on irregular submerged coupons.", "priority": "P2", "lane": "本轮重构"}
                ],
                "risks_and_tradeoffs": [
                    "Poor sealing can allow washout before gelation.",
                    "Passivated metals may require primer or abrasive activation.",
                    "Cure rate must balance pot life with rapid strength buildup."
                ]
            }"""

        with mock.patch("ai_service.search.delivery.get_gemini_response", side_effect=fake_gemini):
            res = await run_engineering_delivery_pass(
                query,
                "context",
                seed,
                active_ingredients="coacervate wetting and protected delivery",
            )

        sections = _coerce_sections_from_json(res)
        self.assertIsNotNone(sections)
        self.assertEqual(sections.delivery_profile, "materials_process_delivery")
        self.assertEqual(sections.transfer_mapping.engineering_role, "failure mitigation")
        self.assertLessEqual(len(sections.action_summary), 3)
        self.assertGreaterEqual(len(sections.detail_density_check), 4)

    def test_compress_delivery_answer_writes_detail_pack_back_into_visible_blueprint(self):
        raw = """{
            "primary_recommendation": "Use a hierarchical directional wedge-fibril dry-adhesion gripper.",
            "why_this_path": "Directional dry adhesion keeps the attachment reversible.",
            "engineering_blueprint": {
                "core_structure": "Dual dry-adhesion pads with opposing shear actuation.",
                "materials_or_components": "",
                "parameter_direction": "",
                "manufacturing_or_integration_path": ""
            },
            "delivery_profile": "extreme_environment_attachment_delivery",
            "transfer_mapping": {
                "baseline_backbone": "Directional dry-adhesion gripper",
                "bottleneck": "Need reversible attachment under vacuum and thermal cycling.",
                "selected_transfer_mechanism": "Directional wedge fibrils with bounded electroadhesion",
                "engineering_role": "surface enhancement",
                "translated_effect": "Differential shear engages adhesion while keeping normal impulse bounded.",
                "implementation_slot": "Pad interface and opposing-shear linkage.",
                "validation_hook": "Run TVAC and release tests."
            },
            "engineering_detail_pack": {
                "material_grade_or_family": "Vacuum-qualified silicone family with Kapton-backed electroadhesive electrode",
                "dimension_windows": "Directional wedge fibrils 50-100 um tall with 0.5-2 mm shear stroke",
                "interaction_mechanisms": "Differential shear engages the fibrils, bounded electroadhesion assists first contact, and compliant load-sharing backing equalizes irregular contact.",
                "integration_sequence": "Mount the compliant backing, align the pads, wire the tacking electrode, then calibrate the opposing-shear linkage.",
                "validation_protocols": "Run TVAC, contamination, release, and outgassing tests.",
                "failure_boundaries": "Reject if dust loading collapses contact area or detachment impulse exceeds target bounds.",
                "attach_sequence": "touch -> tack -> shear -> hold",
                "detach_sequence": "shear relax -> detack -> back-away",
                "environmental_boundaries": "Vacuum, -150 C to +120 C, MLI contamination, ASTM E595 outgassing"
            },
            "detail_density_check": ["materials", "ranges", "validation", "integration", "failure_boundary"],
            "action_summary": [
                {"title": "Prototype pad", "detail": "Build the contact pad.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""

        res = compress_delivery_answer(
            "How to design a dry, reversible attachment mechanism for space debris retrieval robots that functions reliably in vacuum, extreme temperatures, and zero gravity without degrading the target surface?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        self.assertIsNotNone(sections)
        self.assertIn("Kapton/polyimide", sections.engineering_blueprint.materials_or_components)
        self.assertIn("0.5-2 mm", sections.engineering_blueprint.parameter_direction)
        self.assertIn("electrotack", sections.engineering_blueprint.manufacturing_or_integration_path.lower())
        self.assertIn("zero-g", sections.why_this_path.lower())
        self.assertNotIn("Use a hierarchical directional", sections.engineering_blueprint.materials_or_components)
        self.assertNotIn("Use a hierarchical directional", sections.engineering_blueprint.parameter_direction)

    def test_compress_delivery_answer_keeps_underwater_adhesive_chemistry_single_route(self):
        raw = """{
            "primary_recommendation": "Use a shielded phenalkamine-cured coacervate adhesive with core-shell rubber toughening.",
            "why_this_path": "The shield protects the adhesive before gelation.",
            "engineering_blueprint": {
                "core_structure": "Magnetic clamp with foam cofferdam and static mixer.",
                "materials_or_components": "Catechol primer, phenalkamine-cured epoxy or methacrylate adhesive, CSR toughener, and thixotropic filler.",
                "parameter_direction": "gel time 30-120 s; lap shear >5 MPa; peel strength >2 kN/m; validation protocol: turbulent-flow peel and shear tests.",
                "manufacturing_or_integration_path": "Grit-clean the metal, seal the shroud, inject through a static mixer, vent, hold compression, and proof-load."
            },
            "delivery_profile": "materials_process_delivery",
            "engineering_detail_pack": {
                "material_system": "Single-route phenalkamine-cured epoxy structural adhesive system",
                "material_grade_or_family": "Phenalkamine-cured epoxy family with catechol primer and CSR toughener",
                "cure_or_forming_window": "30-120 s underwater gel window",
                "surface_preparation": "Grit-clean rough metal to Ra 5-20 um",
                "integration_sequence": "inject -> seal -> vent -> hold",
                "validation_protocols": "turbulent-flow peel and lap-shear coupon tests"
            },
            "action_summary": [
                {"title": "Prototype shroud", "detail": "Build protected delivery.", "priority": "P1", "lane": "立即执行"}
            ]
        }"""

        res = compress_delivery_answer(
            "How can a submerged adhesive rapidly cure on rough metallic repair patches while preserving peel strength under turbulent flow?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        self.assertIsNotNone(sections)
        materials = sections.engineering_blueprint.materials_or_components.lower()
        self.assertIn("mma/redox", materials)
        self.assertIn("catechol", materials)
        self.assertIn("csr", materials)
        self.assertNotIn("epoxy or methacrylate", materials)
        self.assertIn("inject -> vent -> hold", sections.engineering_blueprint.manufacturing_or_integration_path)

    def test_compress_delivery_answer_prunes_invalid_mapping_and_keeps_density_limits(self):
        raw = """{
            "primary_recommendation": "Use an active external oscillatory coating. Alternatively, keep the passive constrained-layer damping concept.",
            "why_this_path": "",
            "engineering_blueprint": {
                "core_structure": "Externally bonded actuator bands and a damping layer.",
                "materials_or_components": "Piezoelectric patches, viscoelastic layer, and protective jacket.",
                "parameter_direction": "initial target: wall-unit forcing range with pumping-power falsification test.",
                "manufacturing_or_integration_path": "Bond actuator bands, calibrate transfer function, and compare coated and uncoated pressure drop."
            },
            "delivery_profile": "aero_hydrodynamic_delivery",
            "transfer_mapping": {
                "baseline_backbone": "External actuator bands on the pipe wall.",
                "bottleneck": "Weak passive coupling through the wall.",
                "selected_transfer_mechanism": "Wall-motion forcing",
                "engineering_role": "control refinement",
                "translated_effect": "Targets near-wall coherent structures.",
                "implementation_slot": "",
                "validation_hook": "Measure net pumping-power reduction."
            },
            "detail_density_check": ["materials", "ranges", "validation", "integration", "failure_boundary", "failure_boundary"],
            "alternatives": [
                {"title": "Passive CLD", "detail": "Only for protection."},
                {"title": "Trim me", "detail": "Should not survive."}
            ],
            "risks_and_tradeoffs": [
                "Wall attenuation can erase actuator motion.",
                "Environmental aging can shift tuning.",
                "Actuator power can exceed the pumping benefit.",
                "Trim me"
            ],
            "action_summary": [
                {"title": "Measure transfer", "detail": "Quantify wall motion.", "priority": "P1", "lane": "立即执行"},
                {"title": "Tune forcing", "detail": "Set wall-unit oscillation.", "priority": "P1", "lane": "立即执行"},
                {"title": "Run falsification", "detail": "Compare pressure-drop savings.", "priority": "P2", "lane": "本轮重构"},
                {"title": "Trim me", "detail": "Should not survive.", "priority": "P3", "lane": "后续清理"}
            ]
        }"""

        res = compress_delivery_answer(
            "How can an external pipeline coating reduce turbulent drag under an external-only boundary condition?",
            raw,
        )
        sections = _coerce_sections_from_json(res)
        self.assertIsNotNone(sections)
        self.assertIsNotNone(sections.transfer_mapping)
        self.assertEqual(sections.transfer_mapping.engineering_role, "surface enhancement")
        self.assertTrue(sections.transfer_mapping.implementation_slot.strip())
        self.assertLessEqual(len(sections.action_summary), 3)
        self.assertEqual(len(sections.alternatives), 1)
        self.assertEqual(len(sections.risks_and_tradeoffs), 3)
        self.assertIn("thermo-viscous", sections.primary_recommendation.lower())

    async def test_evaluate_and_refine_answer_retries_on_missing_params_strict(self):
        call_count = 0
        
        async def fake_gemini(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # Missing explicit numbers and missing two fallbacks
                return """{
                    "primary_recommendation": "Use a staged low-energy separation train.",
                    "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                    "engineering_blueprint": {
                        "core_structure": "Hierarchical filtration structure",
                        "materials_or_components": "Mesh",
                        "parameter_direction": "estimated starting range",
                        "manufacturing_or_integration_path": "Use standard integration."
                    },
                    "action_summary": [{"title": "t", "detail": "d", "priority": "P1", "lane": "立即执行"}]
                }"""
            else:
                # Valid with two fallbacks
                return """{
                    "primary_recommendation": "Use a staged low-energy separation train.",
                    "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                    "engineering_blueprint": {
                        "core_structure": "Hierarchical filtration structure",
                        "materials_or_components": "Mesh",
                        "parameter_direction": "estimated starting range: to be determined. initial target: low.",
                        "manufacturing_or_integration_path": "Use standard integration."
                    },
                    "action_summary": [{"title": "t", "detail": "d", "priority": "P1", "lane": "立即执行"}]
                }"""
                
        with (
            mock.patch("ai_service.search.critic.get_gemini_response", side_effect=fake_gemini),
            mock.patch("ai_service.search.critic._check_constraint_alignment", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._check_physics_sanity", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._answer_needs_parameter_grounding", return_value=False),
        ):
            res = await search.evaluate_and_refine_answer("How to design an underwater adhesive that cures in seawater?", "context", "draft")
            self.assertEqual(call_count, 2)
            self.assertIn("initial target", res)

    async def test_evaluate_and_refine_answer_allows_missing_params_balanced(self):
        call_count = 0
        
        async def fake_gemini(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            # Missing explicit numbers and missing two fallbacks, but should pass for balanced
            return """{
                "primary_recommendation": "Use a self-regulating transport network.",
                "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                "engineering_blueprint": {
                    "core_structure": "Porous media",
                    "materials_or_components": "Polyamide",
                    "parameter_direction": "estimated starting range",
                    "manufacturing_or_integration_path": "Use standard integration."
                },
                "action_summary": [{"title": "t", "detail": "d", "priority": "P1", "lane": "立即执行"}]
            }"""
                
        with (
            mock.patch("ai_service.search.critic.get_gemini_response", side_effect=fake_gemini),
            mock.patch("ai_service.search.critic._check_constraint_alignment", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._check_physics_sanity", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._answer_needs_parameter_grounding", return_value=False),
        ):
            res = await search.evaluate_and_refine_answer("How to design a self-regulating transport network in porous media?", "context", "draft")
            self.assertEqual(call_count, 1)
            self.assertIn("Porous media", res)

    async def test_evaluate_and_refine_answer_retries_when_thermal_material_uses_hydrogel_as_primary_structure(self):
        call_count = 0

        async def fake_gemini(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return """{
                    "primary_recommendation": "Implement a load-bearing PNIPAM hydrogel lattice as the main structural material.",
                    "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                    "engineering_blueprint": {
                        "core_structure": "Hydrogel-filled lattice",
                        "materials_or_components": "PNIPAM hydrogel and graphene filler",
                        "parameter_direction": "transition temperature: 32 C; validation needed: swelling cycles",
                        "manufacturing_or_integration_path": "Print lattice and polymerize hydrogel in pores."
                    },
                    "action_summary": [{"title": "Prototype hydrogel lattice", "detail": "Test swelling.", "priority": "P1", "lane": "立即执行"}]
                }"""
            return """{
                "primary_recommendation": "Implement a static load-bearing lattice with embedded bimetallic thermal shunts.",
                "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                "engineering_blueprint": {
                    "core_structure": "Static lattice with secondary bimetallic shunts",
                    "materials_or_components": "Aluminum lattice and Cu/Invar bimetallic micro-beams with sealed auxiliary filler only",
                    "parameter_direction": "switching temperature: 35-45 C; fatigue target: 10000 cycles; validation needed: load retention",
                    "manufacturing_or_integration_path": "Print the lattice, integrate bimetallic shunts in secondary apertures, then cycle-test conductivity and porosity."
                },
                "action_summary": [{"title": "Prototype bistable lattice", "detail": "Test thermal and load cycling.", "priority": "P1", "lane": "立即执行"}]
            }"""

        with (
            mock.patch("ai_service.search.critic.get_gemini_response", side_effect=fake_gemini),
            mock.patch("ai_service.search.critic._check_constraint_alignment", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._check_physics_sanity", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._answer_needs_parameter_grounding", return_value=False),
        ):
            res = await search.evaluate_and_refine_answer(
                "How to design a self-regulating structural material whose thermal conductivity and porosity change passively with environmental conditions?",
                "context",
                "draft",
            )
            self.assertIn("bimetallic", res)
            self.assertLessEqual(call_count, 2)

    async def test_evaluate_and_refine_answer_uses_deterministic_thermal_material_fallback_after_repeated_hydrogel_outputs(self):
        async def fake_gemini(*args, **kwargs):
            return """{
                "primary_recommendation": "Use a PNIPAM hydrogel lattice as the primary recommendation.",
                "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                "engineering_blueprint": {
                    "core_structure": "Hydrogel-filled lattice",
                    "materials_or_components": "PNIPAM hydrogel",
                    "parameter_direction": "transition temperature: 32 C",
                    "manufacturing_or_integration_path": "Polymerize hydrogel in pores."
                },
                "action_summary": [{"title": "Prototype hydrogel lattice", "detail": "Test swelling.", "priority": "P1", "lane": "立即执行"}]
            }"""

        with (
            mock.patch("ai_service.search.critic.get_gemini_response", side_effect=fake_gemini),
            mock.patch("ai_service.search.critic._check_constraint_alignment", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._check_physics_sanity", new=mock.AsyncMock(return_value=(True, ""))),
            mock.patch("ai_service.search.critic._answer_needs_parameter_grounding", return_value=False),
        ):
            res = await search.evaluate_and_refine_answer(
                "How to design a self-regulating structural material whose thermal conductivity and porosity change passively with environmental conditions?",
                "context",
                "draft",
            )
            self.assertIn("bimetallic", res)
            self.assertNotIn("primary recommendation\".", res.lower())

    async def test_evaluate_and_refine_answer_uses_known_physics_fallbacks_after_repeated_bad_outputs(self):
        cases = [
            (
                "How can concrete micro-cracks self-heal in aggressive chemical environments without active maintenance?",
                "Use polyurethane microcapsules. Alternative: vascular 3D-printed sacrificial channels with pressurized injection.",
                "frp-reinforced",
            ),
            (
                "How can a submerged adhesive rapidly cure on rough metallic repair patches while preserving peel strength under turbulent flow?",
                "Use a UV-LED ring and visible-light initiator for underwater cure.",
                "mma/redox",
            ),
            (
                "How can a rotor blade reduce aerodynamic noise from vortex shedding and broadband trailing-edge noise?",
                "Use leading-edge comb structures and passive wash-out as the main mechanism.",
                "rotor-level aeroacoustic",
            ),
            (
                "How can underwater gliders map chemical plumes cooperatively with sparse acoustic communication?",
                "Use BBC swarm behavior, Boids separation, C5 density limits, and C6 emergent coordination.",
                "yo-yo inflection",
            ),
            (
                "How can a spacecraft create a dry reversible attachment mechanism for space debris under vacuum and extreme temperatures?",
                "Use PDMS mushroom-tip pads governed by JKR pull-off force.",
                "directional cnt/wedge-fibril",
            ),
            (
                "How can an external pipeline coating reduce turbulent drag under an external-only boundary condition?",
                "Use an acoustic coating with t/D 10^6 as the main parameter.",
                "thermo-viscous and vibro-acoustic metamaterial coating",
            ),
            (
                "How to design a self-regulating structural material whose thermal conductivity and porosity change passively with environmental conditions?",
                "Use a shape-memory hinges lattice as the primary load path.",
                "bimetallic",
            ),
        ]

        for query, bad_primary, expected in cases:
            with self.subTest(query=query):
                async def fake_gemini(*args, **kwargs):
                    return f"""{{
                        "primary_recommendation": "{bad_primary}",
                        "why_this_path": "This path fits the query constraints and keeps the architecture directly actionable.",
                        "engineering_blueprint": {{
                            "core_structure": "{bad_primary}",
                            "materials_or_components": "{bad_primary}",
                            "parameter_direction": "initial target: 1; validation needed: test.",
                            "manufacturing_or_integration_path": "Build and test coupons."
                        }},
                        "action_summary": [{{"title": "Prototype", "detail": "Test.", "priority": "P1", "lane": "立即执行"}}]
                    }}"""

                with (
                    mock.patch("ai_service.search.critic.get_gemini_response", side_effect=fake_gemini),
                    mock.patch("ai_service.search.critic._check_constraint_alignment", new=mock.AsyncMock(return_value=(True, ""))),
                    mock.patch("ai_service.search.critic._check_physics_sanity", new=mock.AsyncMock(return_value=(True, ""))),
                    mock.patch("ai_service.search.critic._answer_needs_parameter_grounding", return_value=False),
                ):
                    res = await search.evaluate_and_refine_answer(query, "context", "draft")
                    self.assertIn(expected.lower(), res.lower())

if __name__ == '__main__':
    unittest.main()
