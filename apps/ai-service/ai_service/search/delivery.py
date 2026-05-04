"""Engineering delivery densification and compression helpers."""

from __future__ import annotations

import json
import re

from ..config import logger
from ..llm import get_gemini_response
from ..models import (
    EngineeringBlueprint,
    EngineeringDetailPack,
    EngineeringFactCard,
    GlobalInsightSections,
    RouteSelection,
    TransferMapping,
)
from .parsing import _coerce_sections_from_json, _coerce_sections_from_text, _normalize_sections
from .rules import (
    _is_external_pipeline_drag_query,
    _is_low_noise_rotor_query,
    _is_self_healing_concrete_query,
    _is_self_regulating_thermal_material_query,
    _is_space_debris_dry_attachment_query,
    _is_underwater_curing_adhesive_query,
    _is_underwater_glider_plume_query,
)

DELIVERY_PROFILES = {
    "materials_process_delivery",
    "structural_multiphysics_delivery",
    "control_protocol_delivery",
    "aero_hydrodynamic_delivery",
    "extreme_environment_attachment_delivery",
}

ENGINEERING_ROLES = {
    "surface enhancement",
    "control refinement",
    "material substitution",
    "failure mitigation",
}

DETAIL_DENSITY_SLOTS = {
    "materials",
    "ranges",
    "validation",
    "integration",
    "control",
    "failure_boundary",
}

DETAIL_PACK_DESCRIPTIONS = {
    "component_choices": "Name the concrete subsystems or component choices, not just abstract mechanism labels.",
    "dimension_windows": "Provide dimension, stroke, preload, or bounded range guidance instead of vague sizing language.",
    "interaction_mechanisms": "Explain how the chosen parts interact physically inside the final engineering stack.",
    "integration_sequence": "State the assembly, deployment, or calibration order as an explicit sequence.",
    "validation_protocols": "Name the first-round validation protocol or test stack.",
    "failure_boundaries": "State the concrete reject criterion, failure boundary, or operational limit.",
    "material_system": "Lock the main material or chemistry family instead of mixing multiple routes.",
    "material_grade_or_family": "Name the material family or grade-level choice when available.",
    "cure_or_forming_window": "Specify the curing, forming, or operating window.",
    "surface_preparation": "Describe the surface preparation or interface conditioning step.",
    "dosage_or_mix_window": "Give dosage, loading, or mix-window guidance.",
    "state_variables": "List the main state variables the controller carries.",
    "message_schema": "Describe the packet payload or communication schema.",
    "update_cadence": "State the update period or event-driven refresh cadence.",
    "trigger_conditions": "Name the conditions that trigger state transitions or control updates.",
    "fallback_policy": "Describe the local fallback behavior when communication or sensing degrades.",
    "application_zone": "State where along the geometry the treatment applies.",
    "scaling_metrics": "Include the relevant scaling, wall-unit, Mach, or penalty metric.",
    "system_level_constraints": "State the system-level tradeoff or penalty bound.",
    "validation_stack": "Specify the simulation and experiment stack used to validate the design.",
    "pad_interface_stack": "Describe the contact pad interface stack or contact-layer buildup.",
    "load_distribution_mechanism": "Explain how irregular loads are distributed across the contact interface.",
    "attach_sequence": "Write the attach sequence as explicit ordered actions.",
    "detach_sequence": "Write the detach sequence as explicit ordered actions.",
    "environmental_boundaries": "State the vacuum, temperature, contamination, or outgassing limits.",
}

_VALIDATION_TERMS = (
    "validate",
    "validation",
    "test",
    "tvac",
    "fatigue",
    "aging",
    "cycle",
    "proof-load",
    "falsification",
    "anechoic",
    "fw-h",
    "les",
    "flow tank",
    "chloride",
    "sulfate",
    "outgassing",
)
_FAILURE_TERMS = (
    "risk",
    "tradeoff",
    "fatigue",
    "creep",
    "corrosion",
    "dropout",
    "erosion",
    "aging",
    "drift",
    "washout",
    "outgassing",
    "boundary",
    "fouling",
)
_CONTROL_TERMS = (
    "control",
    "heading",
    "depth",
    "threshold",
    "trigger",
    "state",
    "update",
    "packet",
    "neighbor",
    "fallback",
    "apf",
    "guidance",
)


def _serialize_sections(sections: GlobalInsightSections) -> str:
    return sections.model_dump_json(exclude_none=True)


def _parse_sections(answer: str) -> GlobalInsightSections | None:
    sections = _coerce_sections_from_json(answer) or _coerce_sections_from_text(answer)
    if sections is None:
        return None
    return _normalize_sections(sections)


def _infer_delivery_profile(query: str, sections: GlobalInsightSections | None = None) -> str:
    lower = query.lower()
    if _is_underwater_curing_adhesive_query(query):
        return "materials_process_delivery"
    if _is_self_healing_concrete_query(query) or _is_self_regulating_thermal_material_query(query):
        return "structural_multiphysics_delivery"
    if _is_underwater_glider_plume_query(query):
        return "control_protocol_delivery"
    if _is_low_noise_rotor_query(query) or _is_external_pipeline_drag_query(query):
        return "aero_hydrodynamic_delivery"
    if _is_space_debris_dry_attachment_query(query):
        return "extreme_environment_attachment_delivery"
    if any(token in lower for token in ("adhesive", "coating", "coated", "membrane", "epoxy", "material", "surface")):
        return "materials_process_delivery"
    if any(token in lower for token in ("control", "controller", "state", "robot", "swarm", "trajectory", "coordination")):
        return "control_protocol_delivery"
    if any(token in lower for token in ("drag", "rotor", "blade", "noise", "boundary layer", "flow", "hydrodynamic", "aerodynamic")):
        return "aero_hydrodynamic_delivery"
    if any(token in lower for token in ("vacuum", "temperature", "orbital", "debris", "space", "attachment")):
        return "extreme_environment_attachment_delivery"
    if sections and sections.engineering_blueprint and sections.engineering_blueprint.materials_or_components:
        return "materials_process_delivery"
    return "structural_multiphysics_delivery"


def _compact_text(value: str, *, max_len: int = 220) -> str:
    normalized = re.sub(r"\s+", " ", value or "").strip()
    if len(normalized) <= max_len:
        return normalized
    return normalized[: max_len - 3].rstrip() + "..."


def _canonicalize_clause(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value or "").strip(" ;,")
    normalized = normalized.rstrip(".")
    return normalized.lower()


def _join_nonempty(*values: str) -> str:
    seen: set[str] = set()
    parts: list[str] = []
    for value in values:
        normalized = re.sub(r"\s+", " ", value or "").strip(" ;,")
        if not normalized:
            continue
        lowered = _canonicalize_clause(normalized)
        if lowered in seen:
            continue
        seen.add(lowered)
        parts.append(normalized)
    return "; ".join(parts)


def _dedupe_semicolon_clauses(value: str) -> str:
    if not value:
        return value
    parts = [part.strip(" ;,") for part in value.split(";") if part.strip(" ;,")]
    return _join_nonempty(*parts)


_INTERNAL_REVIEW_LABELS = (
    "Primary Recommendation",
    "Why This Path",
    "Engineering Blueprint",
    "Action Summary",
    "Parameter direction",
    "Manufacturing/integration path",
    "Core structure",
    "Materials/components",
    "review_answer",
    "engineering_detail_pack",
    "transfer_mapping",
)


def _sentence_key(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip(" 。；;,.，").lower()


def _dedupe_sentence_stream(value: str) -> str:
    """Remove repeated sentence-like fragments while preserving order."""
    text = re.sub(r"\s+", " ", value or "").strip()
    if not text:
        return ""
    chunks = [
        chunk.strip()
        for chunk in re.split(r"(?<=[。.!?])\s*", text)
        if chunk.strip()
    ]
    if len(chunks) <= 1:
        chunks = [chunk.strip() for chunk in re.split(r"\s*;\s*", text) if chunk.strip()]
    seen: set[str] = set()
    kept: list[str] = []
    for chunk in chunks:
        key = _sentence_key(chunk)
        key_variants = {key}
        for separator in ("：", ":"):
            if separator in key:
                tail = key.split(separator, 1)[1].strip()
                if tail:
                    key_variants.add(tail)
        if not key or any(variant in seen for variant in key_variants):
            continue
        if any(
            variant in prev or prev in variant
            for variant in key_variants
            for prev in seen
            if len(variant) > 16 and len(prev) > 16
        ):
            continue
        seen.update(key_variants)
        kept.append(chunk)
    return " ".join(kept).strip()


def _limit_phrase_occurrences(text: str, phrase: str, max_count: int, replacement: str) -> str:
    """Keep the first N visible mentions of a phrase and rewrite later repeats."""
    if not text or not phrase:
        return text
    count = 0
    pattern = re.compile(re.escape(phrase), re.I)

    def replace(match: re.Match[str]) -> str:
        nonlocal count
        count += 1
        if count <= max_count:
            return match.group(0)
        return replacement

    return pattern.sub(replace, text)


def dedupe_review_text(text: str) -> str:
    """Code-level cleanup for reader-facing review answers.

    This deliberately removes internal prompt/schema labels and repeated
    sentence fragments. It does not add new mechanisms or facts.
    """
    cleaned = (text or "").replace("\\n", "\n")
    for label in _INTERNAL_REVIEW_LABELS:
        cleaned = re.sub(rf"(?im)^\s*#*\s*{re.escape(label)}\s*:?\s*$", "", cleaned)
        cleaned = re.sub(rf"(?i)\b{re.escape(label)}\b\s*:?", "", cleaned)
    cleaned = cleaned.replace("；", ";")
    lines: list[str] = []
    seen_lines: set[str] = set()
    for raw_line in cleaned.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            if lines and lines[-1] != "":
                lines.append("")
            continue
        line = _dedupe_sentence_stream(line)
        key = _sentence_key(line)
        if not key or key in seen_lines:
            continue
        seen_lines.add(key)
        lines.append(line)
    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    result = result.replace(".;", ".").replace(";.", ".")
    result = _limit_phrase_occurrences(result, "update sparse gp", 1, "update the sparse estimator")
    result = _limit_phrase_occurrences(result, "gas branch", 2, "air-loop path")
    result = _limit_phrase_occurrences(result, "liquid branch", 2, "water-loop path")
    return result.strip()


def _clean_review_value(value: str, *, max_len: int = 520) -> str:
    text = _dedupe_sentence_stream(value)
    text = re.sub(r"\s+", " ", text).strip(" ;,")
    if len(text) > max_len:
        text = text[: max_len - 3].rstrip(" ;,.") + "..."
    return text


def _numbered_lines(items: list[str], *, max_items: int = 3) -> str:
    kept = [_clean_review_value(item, max_len=380) for item in items if _clean_review_value(item, max_len=380)]
    return "\n".join(f"{index}. {item}" for index, item in enumerate(kept[:max_items], start=1))


def build_review_answer(
    sections: GlobalInsightSections,
    *,
    public_language: str = "zh",
) -> str:
    """Render a human-facing engineering brief from structured DRR sections.

    The writer is deterministic: it only reorders, compresses, and deduplicates
    existing structured content. It never introduces a new mechanism family.
    """
    english = public_language.lower().startswith("en")
    blueprint = sections.engineering_blueprint or EngineeringBlueprint()
    primary = _clean_review_value(sections.primary_recommendation, max_len=420)
    why = _clean_review_value(sections.why_this_path, max_len=520)
    core = _clean_review_value(blueprint.core_structure, max_len=420)
    materials = _clean_review_value(blueprint.materials_or_components, max_len=420)
    params = _clean_review_value(blueprint.parameter_direction, max_len=520)
    integration = _clean_review_value(blueprint.manufacturing_or_integration_path, max_len=560)
    validation_candidates = [
        card.validation_method for card in sections.engineering_fact_cards if card.validation_method.strip()
    ]
    if sections.engineering_detail_pack:
        validation_candidates.extend(
            [
                sections.engineering_detail_pack.validation_protocols,
                sections.engineering_detail_pack.validation_stack,
            ]
        )
    validation = _numbered_lines(validation_candidates or [integration], max_items=3)
    actions = _numbered_lines(
        [f"{item.title}: {item.detail}" for item in sections.action_summary],
        max_items=3,
    )
    risks = _numbered_lines(
        [
            *sections.risks_and_tradeoffs,
            *[card.failure_boundary for card in sections.engineering_fact_cards if card.failure_boundary.strip()],
        ],
        max_items=3,
    )

    if english:
        blocks = [
            ("Recommendation:", " ".join(part for part in [primary, why] if part)),
            ("Engineering implementation:", "\n".join(part for part in [
                f"1. Structure and components: {_join_nonempty(core, materials)}" if _join_nonempty(core, materials) else "",
                f"2. Parameters: {params}" if params else "",
                f"3. Manufacturing/integration: {integration}" if integration else "",
            ] if part)),
            ("Validation path:", validation or actions),
            ("Risk boundaries:", risks),
        ]
    else:
        blocks = [
            ("推荐方案：", " ".join(part for part in [primary, why] if part)),
            ("工程实现：", "\n".join(part for part in [
                f"1. 结构与组件：{_join_nonempty(core, materials)}" if _join_nonempty(core, materials) else "",
                f"2. 材料与参数：{params}" if params else "",
                f"3. 制造/集成步骤：{integration}" if integration else "",
            ] if part)),
            ("验证路径：", validation or actions),
            ("风险边界：", risks),
        ]
    rendered: list[str] = []
    for heading, body in blocks:
        body = dedupe_review_text(body)
        if body:
            rendered.append(f"{heading}\n{body}")
    return dedupe_review_text("\n\n".join(rendered))


def _detail_pack_has_value(pack: EngineeringDetailPack | None, field_name: str) -> bool:
    return bool(pack and getattr(pack, field_name, "").strip())


def _set_detail_if_missing(pack: EngineeringDetailPack, field_name: str, value: str) -> None:
    if getattr(pack, field_name, "").strip():
        return
    normalized = re.sub(r"\s+", " ", value or "").strip()
    if normalized:
        setattr(pack, field_name, normalized)


def _extract_validation_hint(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text or "").strip()
    if not normalized:
        return ""
    lower = normalized.lower()
    for marker in ("validation protocol", "validation needed", "validate", "test", "tvac", "proof-load"):
        idx = lower.find(marker)
        if idx != -1:
            return normalized[idx:].strip(" ;,")
    return ""


def _compact_environmental_boundary(text: str) -> str:
    lower = text.lower()
    parts: list[str] = []
    if "vacuum" in lower or "tvac" in lower:
        parts.append("vacuum/TVAC operation")
    if "-150" in text or "+120" in text or "thermal" in lower:
        parts.append("thermal-vacuum cycling from -150 C to +120 C")
    if "mli" in lower or "dust" in lower:
        parts.append("dust/MLI contamination tolerance")
    if "e595" in lower or "outgassing" in lower:
        parts.append("ASTM E595 outgassing compliance")
    return "; ".join(dict.fromkeys(parts))


def _rewrite_adhesive_route(value: str, material_system: str) -> str:
    if not value:
        return value
    if "phenalkamine" in material_system.lower() or "epoxy" in material_system.lower():
        return re.sub(
            r"phenalkamine-cured epoxy or methacrylate adhesive",
            "phenalkamine-cured epoxy adhesive",
            value,
            flags=re.I,
        )
    if "methacrylate" in material_system.lower() or "mma" in material_system.lower():
        return re.sub(
            r"phenalkamine-cured epoxy or methacrylate adhesive",
            "methacrylate/MMA adhesive",
            value,
            flags=re.I,
        )
    return value


def _seed_detail_pack_from_sections(query: str, sections: GlobalInsightSections) -> EngineeringDetailPack:
    pack = sections.engineering_detail_pack or EngineeringDetailPack()
    blueprint = sections.engineering_blueprint
    if blueprint:
        _set_detail_if_missing(pack, "component_choices", blueprint.materials_or_components)
        _set_detail_if_missing(pack, "dimension_windows", blueprint.parameter_direction)
        _set_detail_if_missing(pack, "integration_sequence", blueprint.manufacturing_or_integration_path)
    _set_detail_if_missing(pack, "interaction_mechanisms", sections.why_this_path)
    if sections.risks_and_tradeoffs:
        _set_detail_if_missing(pack, "failure_boundaries", "; ".join(sections.risks_and_tradeoffs))

    combined = " ".join(
        [
            sections.primary_recommendation,
            sections.why_this_path,
            blueprint.core_structure if blueprint else "",
            blueprint.materials_or_components if blueprint else "",
            blueprint.parameter_direction if blueprint else "",
            blueprint.manufacturing_or_integration_path if blueprint else "",
        ]
    )

    if _is_underwater_curing_adhesive_query(query):
        route_basis = " ".join(
            [
                sections.primary_recommendation,
                blueprint.materials_or_components if blueprint else "",
                blueprint.core_structure if blueprint else "",
            ]
        )
        if re.search(r"\bphenalkamine\b|\bepoxy\b", route_basis, re.I):
            _set_detail_if_missing(pack, "material_system", "Single-route phenalkamine-cured epoxy structural adhesive system")
        elif re.search(r"\bmethacrylate\b|\bmma\b", route_basis, re.I):
            _set_detail_if_missing(pack, "material_system", "Single-route methacrylate/MMA structural adhesive system")
        _set_detail_if_missing(pack, "surface_preparation", blueprint.manufacturing_or_integration_path if blueprint else "")
        if blueprint:
            _set_detail_if_missing(
                pack,
                "validation_protocols",
                _extract_validation_hint(
                    _join_nonempty(blueprint.parameter_direction, blueprint.manufacturing_or_integration_path)
                ),
            )
    if _is_low_noise_rotor_query(query):
        if blueprint:
            _set_detail_if_missing(pack, "scaling_metrics", blueprint.parameter_direction)
            _set_detail_if_missing(pack, "validation_stack", blueprint.manufacturing_or_integration_path)
    if _is_space_debris_dry_attachment_query(query):
        if blueprint:
            _set_detail_if_missing(pack, "pad_interface_stack", blueprint.materials_or_components)
            if re.search(r"touch|tack|shear|hold", blueprint.manufacturing_or_integration_path, re.I):
                _set_detail_if_missing(pack, "attach_sequence", "touch -> tack -> opposing shear -> hold")
            if re.search(r"relax|detack|back-away|release", blueprint.manufacturing_or_integration_path, re.I):
                _set_detail_if_missing(pack, "detach_sequence", "shear-relax -> detack -> back-away")
        if re.search(r"whiffletree|load-sharing|load distribution|compliant backing", combined, re.I):
            _set_detail_if_missing(
                pack,
                "load_distribution_mechanism",
                "Compliant load-sharing backing or whiffletree-style load distributor equalizes irregular contact patches.",
            )
        if re.search(r"vacuum|tvac|outgassing|mli|dust|-150|120", combined, re.I):
            _set_detail_if_missing(pack, "environmental_boundaries", _compact_environmental_boundary(combined))
    return pack


def _profile_required_detail_fields(profile: str) -> list[str]:
    if profile == "materials_process_delivery":
        return [
            "material_system",
            "material_grade_or_family",
            "cure_or_forming_window",
            "surface_preparation",
            "integration_sequence",
            "validation_protocols",
        ]
    if profile == "control_protocol_delivery":
        return [
            "state_variables",
            "message_schema",
            "update_cadence",
            "trigger_conditions",
            "fallback_policy",
        ]
    if profile == "aero_hydrodynamic_delivery":
        return [
            "application_zone",
            "scaling_metrics",
            "system_level_constraints",
            "validation_stack",
        ]
    if profile == "extreme_environment_attachment_delivery":
        return [
            "material_grade_or_family",
            "dimension_windows",
            "interaction_mechanisms",
            "attach_sequence",
            "detach_sequence",
            "environmental_boundaries",
        ]
    if profile == "structural_multiphysics_delivery":
        return [
            "material_system",
            "dimension_windows",
            "integration_sequence",
            "validation_protocols",
            "failure_boundaries",
        ]
    return []


def _query_specific_required_detail_fields(query: str) -> list[str]:
    if _is_underwater_curing_adhesive_query(query):
        return [
            "material_system",
            "cure_or_forming_window",
            "surface_preparation",
            "integration_sequence",
            "validation_protocols",
        ]
    if _is_underwater_glider_plume_query(query):
        return [
            "state_variables",
            "message_schema",
            "update_cadence",
            "trigger_conditions",
            "fallback_policy",
        ]
    if _is_low_noise_rotor_query(query):
        return [
            "application_zone",
            "scaling_metrics",
            "system_level_constraints",
            "validation_stack",
        ]
    if _is_space_debris_dry_attachment_query(query):
        return [
            "material_grade_or_family",
            "dimension_windows",
            "interaction_mechanisms",
            "attach_sequence",
            "detach_sequence",
            "environmental_boundaries",
        ]
    return []


def _query_specific_route_selection(query: str) -> RouteSelection | None:
    if _is_underwater_curing_adhesive_query(query):
        return RouteSelection(
            selected_main_route="MMA/redox underwater snap-cure adhesive with catechol wetting primer, CSR peel toughening, and shrouded delivery",
            rejected_routes=[
                "phenalkamine epoxy as the 1-3 min fast-cure primary route",
                "UV/light curing under opaque turbulent water",
                "hydrogel carrier as primary underwater repair architecture",
            ],
            route_rationale=(
                "The hard constraint is rapid underwater green strength on rough metal. "
                "Acrylic/MMA redox chemistry is the main snap-cure route; catechol/coacervate chemistry is only a wetting primer, "
                "CSR is only peel toughening, and the shroud/cofferdam controls washout."
            ),
            transfer_enhancement_slot="wetting primer, peel-toughening additive, and protected delivery stage",
        )
    if _is_low_noise_rotor_query(query):
        return RouteSelection(
            selected_main_route="rotor-level aeroacoustic package with trailing-edge serration/porosity, LSB control, spanwise sizing, and bounded aero penalty",
            rejected_routes=[
                "trailing-edge-only local treatment",
                "leading-edge feature as the main noise-control route",
                "decorative serration without tip-Mach or penalty accounting",
            ],
            route_rationale=(
                "The problem combines tonal and broadband noise. A defensible route must split LSB/tonal and broadband components, "
                "size treatment spanwise against tip Mach and local boundary-layer thickness, and keep aerodynamic penalty within budget."
            ),
            transfer_enhancement_slot="replaceable trailing-edge/porous insert and local spanwise planform tuning",
        )
    if _is_underwater_glider_plume_query(query):
        return RouteSelection(
            selected_main_route="glider-specific sparse plume-mapping protocol with yo-yo inflection updates, sparse inducing points, low-bandwidth acoustic MAC, and UCB + APF guidance",
            rejected_routes=[
                "generic AUV swarm route",
                "high-frequency closed-loop acoustic coordination",
                "DVL-dependent or Lévy-flight exploration as the primary route",
            ],
            route_rationale=(
                "Long-endurance gliders are slow, communicate sparsely, and update heading/depth mainly at yo-yo inflection points. "
                "The main route must therefore be event-driven, low-bandwidth, and robust to GPS-denied relative localization."
            ),
            transfer_enhancement_slot="onboard estimator and event-driven heading/depth decision loop",
        )
    if _is_space_debris_dry_attachment_query(query):
        return RouteSelection(
            selected_main_route="hybrid electroadhesive plus directional CNT/wedge-fibril dry-adhesion gripper with opposing-shear engagement",
            rejected_routes=[
                "ordinary elastomer gecko pad without zero-g preload strategy",
                "normal-force-first push-on attachment that imparts debris delta-v",
                "residue-forming adhesive or abrasive clamp route",
            ],
            route_rationale=(
                "The main route must solve the zero-g push-away problem first. "
                "Electroadhesion provides non-impact pre-tack, while directional CNT or wedge-fibril dry adhesion carries shear load after controlled engagement."
            ),
            transfer_enhancement_slot="electroadhesive preload stage and directional shear-engagement interface",
        )
    if _is_external_pipeline_drag_query(query):
        return RouteSelection(
            selected_main_route="passive thermo-viscous and vibro-acoustic metamaterial coating, with active forcing demoted to an instrumented falsification route",
            rejected_routes=[
                "active wall forcing as the default long-distance coating solution without energy accounting",
                "external riblet/compliant coating presented as a direct internal drag-reduction mechanism",
                "passive coating claim without a physical coupling boundary",
            ],
            route_rationale=(
                "A long-distance exterior coating is judged primarily on deployability and zero/low operating energy. "
                "The main route should therefore be a passive, physically bounded thermo-viscous or vibro-acoustic coating; active forcing can only remain as an experimental validation route if actuator energy and pumping-power accounting are explicit."
            ),
            transfer_enhancement_slot="metamaterial thermal/acoustic coating stack or instrumented validation insert",
        )
    return None


def _query_specific_fact_cards(query: str) -> list[EngineeringFactCard]:
    if _is_underwater_curing_adhesive_query(query):
        return [
            EngineeringFactCard(
                mechanism="redox-initiated underwater snap cure",
                component_or_material="MMA/acrylic adhesive family with catechol-functional wetting primer and CSR toughener",
                parameter_or_range="1-3 min green-strength target; 5-15 wt% CSR; Ra 5-20 um rough-metal preparation",
                validation_method="turbulent-flow lap-shear, peel, washout, and proof-load coupon tests",
                failure_boundary="reject if washout occurs before gelation or peel strength falls below repair target",
                source_hint="route selector template",
            ),
            EngineeringFactCard(
                mechanism="protected delivery against pre-gel washout",
                component_or_material="magnetic shroud/cofferdam, static mixer, one-way vent or outlet",
                parameter_or_range="inject -> seal -> vent -> hold sequence through the 1-3 min snap-cure window",
                validation_method="flow exposure during cure followed by rough-metal peel/lap-shear testing",
                failure_boundary="poor skirt seal or trapped bubbles invalidate the route",
                source_hint="route selector template",
            ),
        ]
    if _is_low_noise_rotor_query(query):
        return [
            EngineeringFactCard(
                mechanism="rotor-level tonal-broadband split",
                component_or_material="spanwise trailing-edge serration/porous insert with leading-edge only auxiliary if needed",
                parameter_or_range="track LSB, tip Mach, local boundary-layer thickness, serration span zone, h about 2-3 delta, lambda about 0.5-1.0 delta, and <2-3% aero penalty budget",
                validation_method="LES/FW-H prediction plus anechoic rotor or wind-tunnel acoustic validation",
                failure_boundary="reject if tonal suppression increases broadband noise or exceeds aero penalty budget",
                source_hint="route selector template",
            )
        ]
    if _is_underwater_glider_plume_query(query):
        return [
            EngineeringFactCard(
                mechanism="event-driven glider plume coordination",
                component_or_material="sparse GP with 3-5 inducing points per local window, range-only EKF, TDMA acoustic MAC, UCB + APF decision loop",
                parameter_or_range="yo-yo inflection-point updates; compact packets; low-duty-cycle acoustic communication; listen -> update EKF -> update sparse GP -> choose UCB + APF waypoint -> actuate next glide segment",
                validation_method="flow-tank replay and coastal two-glider trials under packet dropout, including execution-cycle timing and fallback checks",
                failure_boundary="fallback to line-abreast search if packet loss or localization uncertainty exceeds plume-cell scale",
                source_hint="route selector template",
            )
        ]
    if _is_space_debris_dry_attachment_query(query):
        return [
            EngineeringFactCard(
                mechanism="electroadhesive pre-tack for zero-g preload",
                component_or_material="Kapton/polyimide electroadhesive layer plus directional CNT or wedge-fibril dry-adhesion surface on a compliant load-sharing backing",
                parameter_or_range="bounded kV-class low-current pre-tack, low-newton preload, 0.5-2 mm opposing-shear stroke, TVAC-compatible operation window",
                validation_method="TVAC, dust/MLI contamination, release, and outgassing tests with force/torque monitoring",
                failure_boundary="reject if pre-tack induces push-away, arcing risk, or contamination-driven loss of contact area",
                source_hint="route selector template",
            )
        ]
    if _is_external_pipeline_drag_query(query):
        return [
            EngineeringFactCard(
                mechanism="thermo-viscous and vibro-acoustic indirect coupling",
                component_or_material="thermally conductive interface, tuned viscoelastic damping layer, and radiative-cooling or solar-thermal metamaterial outer shell with protective jacket",
                parameter_or_range="three-layer stack with gas branch (thermal-conditioning dominated) and liquid branch (vibro-acoustic damping dominated); thermal-viscous wall-conditioning window; matched-Re pressure-drop comparison; physical coupling boundary; active route energy accounting if tested",
                validation_method="coated/uncoated pressure-drop, wall temperature, vibration response, gas-branch airflow verification, liquid-branch water-loop verification, and pumping-power accounting",
                failure_boundary="reject if wall coupling is below threshold, roughness/fouling penalty dominates, or active inserts consume more energy than saved",
                source_hint="route selector template",
            )
        ]
    return []


def _merge_fact_cards(existing: list[EngineeringFactCard], additions: list[EngineeringFactCard]) -> list[EngineeringFactCard]:
    merged: list[EngineeringFactCard] = []
    seen: set[str] = set()
    for card in [*existing, *additions]:
        key = "|".join(
            [
                card.mechanism.strip().lower(),
                card.component_or_material.strip().lower(),
                card.parameter_or_range.strip().lower(),
            ]
        )
        if not key.strip("|") or key in seen:
            continue
        seen.add(key)
        merged.append(card)
    return merged[:6]


def _apply_route_selection_to_sections(query: str, sections: GlobalInsightSections) -> GlobalInsightSections:
    route = _query_specific_route_selection(query)
    if route is None:
        return sections
    sections.route_selection = route
    blueprint = sections.engineering_blueprint or EngineeringBlueprint()
    pack = sections.engineering_detail_pack or EngineeringDetailPack()

    if _is_underwater_curing_adhesive_query(query):
        sections.primary_recommendation = route.selected_main_route
        sections.why_this_path = route.route_rationale
        blueprint.core_structure = "Protected shroud/cofferdam delivery on rough submerged metal with an MMA/redox structural adhesive core, catechol wetting-primer stage, CSR peel toughening, and one-way vented static mixing."
        blueprint.materials_or_components = "MMA/redox acrylic adhesive family; catechol/coacervate wetting primer; 5-15 wt% core-shell rubber toughener; magnetic shroud/cofferdam; static mixer; one-way vent; dense filler and thixotropic anti-sag package."
        blueprint.parameter_direction = "Estimated starting range: 1-3 min green-strength window, 5-15 wt% CSR, rough-metal preparation around Ra 5-20 um, and density/rheology tuned to resist washout. Initial target: lap shear >5 MPa, peel strength >2 kN/m, and no visible washout before snap cure."
        blueprint.manufacturing_or_integration_path = "Grit-clean -> seat and seal shroud/cofferdam -> inject MMA/redox adhesive through static mixer -> vent bubbles -> hold through snap cure -> proof-load peel/lap-shear coupons after turbulent-flow exposure."
        pack.material_system = "Single-route MMA/redox acrylic structural adhesive system"
        pack.material_grade_or_family = "MMA/acrylic adhesive family with catechol-functional primer and CSR toughener"
        pack.cure_or_forming_window = "1-3 min underwater green-strength snap-cure window"
        pack.surface_preparation = "Grit-clean rough metal to about Ra 5-20 um and keep a sealed shroud during cure"
        pack.integration_sequence = "grit-clean -> seat shroud -> inject -> vent -> hold -> proof-load"
        pack.validation_protocols = "turbulent-flow washout, peel, lap-shear, and proof-load coupon tests"
    elif _is_low_noise_rotor_query(query):
        sections.primary_recommendation = route.selected_main_route
        sections.why_this_path = route.route_rationale
        blueprint.core_structure = "Rotor-level aeroacoustic package with LSB/tonal-broadband split, tip-Mach accounting, spanwise trailing-edge serration and porosity sizing, impedance gradation, and bounded planform/twist adjustments while preserving the primary spar."
        blueprint.materials_or_components = "CFRP blade skin; replaceable porous polymer/composite trailing-edge insert; erosion-resistant coating; conventional spar retained for stiffness."
        blueprint.parameter_direction = "Estimated starting range: serration amplitude about 2-3 local boundary-layer thicknesses, wavelength about 0.5-1.0 local delta, porous insert coverage over the outboard 30-40% span, and aero penalty/L-D loss <2-3%. Track tip Mach, LSB onset, tonal-broadband split, and spanwise treatment zone."
        blueprint.manufacturing_or_integration_path = "Map spanwise LSB and tonal hot spots -> compute local boundary-layer thickness -> size serration and porosity by span station -> verify tip Mach and aero penalty budget -> validate with LES/FW-H and anechoic rotor tests."
        pack.application_zone = "outboard span and trailing-edge zones sized spanwise, not a trailing-edge-only patch"
        pack.scaling_metrics = "tip Mach, LSB onset, tonal-broadband split, local boundary-layer thickness, and aero penalty budget"
        pack.system_level_constraints = "cap lift/drag or thrust penalty while reducing both tonal and broadband components"
        pack.validation_stack = "LES/FW-H simulation plus anechoic rotor or wind-tunnel acoustic testing"
    elif _is_underwater_glider_plume_query(query):
        sections.primary_recommendation = route.selected_main_route
        sections.why_this_path = route.route_rationale
        blueprint.core_structure = "Glider-specific protocol: yo-yo inflection updates, sparse GP map with sparse inducing points, range-only EKF or equivalent relative localization, TDMA/low-bandwidth acoustic MAC, and UCB + APF heading/depth decisions."
        blueprint.materials_or_components = "Chemical sensor; CTD/current sensor; acoustic modem with TDMA or low-bandwidth MAC; compact packet schema; range-only EKF; sparse GP estimator; UCB + APF controller on the glider flight computer."
        blueprint.parameter_direction = "Estimated starting range: compact acoustic packets, updates only at yo-yo inflection points, 3-5 sparse inducing points per local map window, and local fallback when localization uncertainty exceeds plume-cell scale. Initial target: bounded relative localization, plume gradient tracking, and no high-frequency acoustic control loop."
        blueprint.manufacturing_or_integration_path = "Calibrate sensor lag and acoustic ranging -> define TDMA packets carrying timestamp/range/concentration/gradient/covariance -> listen for neighbor packets at each yo-yo inflection point -> update EKF with range observations -> update sparse GP plume map -> choose UCB + APF waypoint/heading/depth command -> actuate next glide segment -> fallback to line-abreast reacquisition on dropout."
        pack.state_variables = "relative pose, concentration gradient, current estimate, localization covariance, energy budget"
        pack.message_schema = "compact TDMA acoustic packet carrying timestamp, range, concentration, gradient, covariance, and waypoint intent"
        pack.update_cadence = "event-driven updates at yo-yo inflection points, with no high-frequency swarm control"
        pack.trigger_conditions = "new plume gradient, covariance growth, packet dropout, or inflection-point decision epoch"
        pack.fallback_policy = "execution cycle = listen -> update EKF -> update sparse GP -> choose UCB + APF waypoint -> actuate next glide segment; revert to line-abreast or lawnmower reacquisition when packets drop or uncertainty exceeds plume-cell scale"
    elif _is_space_debris_dry_attachment_query(query):
        sections.primary_recommendation = route.selected_main_route
        sections.why_this_path = route.route_rationale
        blueprint.core_structure = "Hybrid electroadhesive pre-tack layer on a compliant load-sharing backing, directional CNT or wedge-fibril dry-adhesion pads, and differential opposing-shear actuation with force/torque sensing."
        blueprint.materials_or_components = "Kapton/polyimide electroadhesive dielectric with interdigitated electrodes; directional CNT or wedge-fibril dry-adhesion layer; compliant load-sharing backing or whiffletree distributor; lead-screw or voice-coil opposing-shear actuator; dust/MLI standoff frame."
        blueprint.parameter_direction = "Estimated starting range: bounded kV-class low-current electroadhesive pre-tack, low-newton preload, 0.5-2 mm opposing-shear stroke, ASTM E595 outgassing compliance, and TVAC operation from -150 C to +120 C. Initial target: near-zero push-away impulse, stable shear hold, and clean commanded release."
        blueprint.manufacturing_or_integration_path = "Hover near target -> apply electroadhesive pre-tack without push-on impact -> engage opposing shear to lock directional dry adhesion -> hold towing load -> shear-relax -> power off pre-tack -> back-away release -> validate in TVAC and contamination tests."
        pack.material_grade_or_family = "Directional CNT or wedge-fibril dry-adhesion family with Kapton/polyimide electroadhesive pre-tack"
        pack.dimension_windows = "low-newton preload and 0.5-2 mm opposing-shear stroke under TVAC-compatible operation"
        pack.interaction_mechanisms = "Electroadhesion provides non-impact pre-tack for zero-g preload; directional dry adhesion carries shear load after controlled engagement; compliant backing equalizes irregular contact."
        pack.attach_sequence = "hover -> electrotack -> opposing shear -> hold"
        pack.detach_sequence = "shear-relax -> power-off detack -> back-away"
        pack.environmental_boundaries = "vacuum/TVAC operation; thermal-vacuum cycling from -150 C to +120 C; dust/MLI contamination tolerance; ASTM E595 outgassing compliance"
    elif _is_external_pipeline_drag_query(query):
        sections.primary_recommendation = route.selected_main_route
        sections.why_this_path = route.route_rationale
        blueprint.core_structure = "Passive three-layer thermo-viscous and vibro-acoustic metamaterial coating: interface layer, tuned viscoelastic damping layer, and radiative-cooling or solar-thermal outer shell with a protective jacket. Gas branch emphasizes thermal wall conditioning; liquid branch emphasizes wall-vibration damping and fouling-bounded coupling. Active forcing remains an instrumented validation insert only."
        blueprint.materials_or_components = "Interface layer: thermally conductive primer or metallic-filled bond coat; damping layer: viscoelastic constrained-layer damping polymer tuned to wall vibration; outer shell: radiative-cooling or solar-thermal metamaterial jacket with environmental protection; optional actuator coupons for validation only."
        blueprint.parameter_direction = "Estimated starting range: wall temperature shift and vibration-damping window large enough to modify the internal viscous sublayer indirectly, matched-Re pressure-drop comparison, and an explicit physical coupling boundary. Gas branch: prioritize thermal-conditioning window, wall-temperature shift, and external convection balance. Liquid branch: prioritize vibro-acoustic damping window, roughness/fouling penalty budget, and fluid-structure coupling under water service. Active inserts must include actuator-energy and pumping-power accounting."
        blueprint.manufacturing_or_integration_path = "Apply the three-layer passive stack to coated and uncoated coupons -> verify gas branch with wall temperature, surface heat-flux, and pressure-drop measurements in an air loop -> verify liquid branch with vibration response, pressure-drop, and fouling-bounded water-loop tests -> keep active inserts only for falsification if coupling and net energy balance remain positive."
        pack.application_zone = "exterior coating coupons or pipeline sections under external-only access"
        pack.scaling_metrics = "matched Reynolds number, pressure-drop delta, wall temperature shift, wall vibration response, gas-branch thermal-conditioning metric, liquid-branch vibro-acoustic damping metric, and pumping-power plus actuator-energy accounting"
        pack.system_level_constraints = "physical coupling boundary: gas branch must show thermal-conditioning benefit without roughness penalty; liquid branch must show vibro-acoustic benefit that exceeds fouling and roughness penalties while remaining deployable over long-distance lines"
        pack.validation_stack = "gas branch: coated/uncoated airflow pressure-drop, wall temperature, and heat-flux verification; liquid branch: coated/uncoated water-loop pressure-drop, wall vibration response, and fouling-bounded verification; optional active coupon falsification with energy accounting"

    sections.engineering_blueprint = blueprint
    sections.engineering_detail_pack = pack
    sections.engineering_fact_cards = _merge_fact_cards(sections.engineering_fact_cards, _query_specific_fact_cards(query))
    return sections


def _query_specific_transfer_mapping(
    query: str,
    sections: GlobalInsightSections,
) -> TransferMapping | None:
    blueprint = sections.engineering_blueprint
    baseline = blueprint.core_structure if blueprint else sections.primary_recommendation
    validation_hook = ""
    if blueprint:
        validation_hook = blueprint.parameter_direction or blueprint.manufacturing_or_integration_path
    if _is_self_healing_concrete_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Rapid watertight crack closure in chemically aggressive environments without corroding the reinforcement path.",
            selected_transfer_mechanism="Rupture-triggered microcapsule release paired with slower crystalline densification.",
            engineering_role="failure mitigation",
            translated_effect="Immediate polymer sealing restores barrier performance while crystalline growth densifies residual pores during long exposure.",
            implementation_slot="Disperse capsules and crystalline admixture inside the cementitious matrix while keeping FRP/PVA crack-width control in the primary structure.",
            validation_hook=_compact_text(validation_hook or "Measure watertightness recovery and residual strength after chloride, sulfate, and acid cycling."),
        )
    if _is_underwater_curing_adhesive_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Prevent pre-gel washout and preserve peel strength on irregular wet metal during turbulent exposure.",
            selected_transfer_mechanism="MMA/redox snap-cure backbone with catechol wetting primer, CSR peel toughening, and shielded underwater delivery.",
            engineering_role="failure mitigation",
            translated_effect="The main route supplies fast green strength; the transfer enhancement improves wet-surface displacement and keeps the adhesive in place until the acrylic cure becomes load bearing.",
            implementation_slot="Add the transfer enhancement at the primer, CSR toughener, and protected applicator stage around the MMA/redox structural adhesive core.",
            validation_hook=_compact_text(validation_hook or "Validate gel time, peel strength, and turbulent-flow retention on rough submerged metallic coupons."),
        )
    if _is_low_noise_rotor_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Broadband trailing-edge noise and tonal shedding are driven by different flow structures.",
            selected_transfer_mechanism="Boundary-layer-thickness-tuned serration and porous-edge scattering.",
            engineering_role="surface enhancement",
            translated_effect="The enhancement weakens coherent pressure fluctuations at the edge while preserving the main lifting structure.",
            implementation_slot="Restrict the transfer enhancement to replaceable trailing-edge inserts and local planform spacing features, not the primary spar.",
            validation_hook=_compact_text(validation_hook or "Use LES/FW-H and anechoic rotor testing to separate broadband and tonal noise reduction."),
        )
    if _is_underwater_glider_plume_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Sparse acoustic bandwidth and glider kinematics limit classic swarm coordination strategies.",
            selected_transfer_mechanism="Distributed sparse-map estimation coupled to explicit APF-style heading/depth guidance.",
            engineering_role="control refinement",
            translated_effect="The transfer mechanism compresses shared plume state into low-bandwidth updates while keeping the vehicle motion policy glider-feasible.",
            implementation_slot="Apply the enhancement inside the onboard execution cycle: listen for packets, update EKF, update sparse GP, choose the next UCB + APF waypoint, and actuate the next glide segment.",
            validation_hook=_compact_text(validation_hook or "Validate packet budget, execution-cycle timing, guidance stability, and plume reacquisition in tank or coastal trials."),
        )
    if _is_space_debris_dry_attachment_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Reversible attachment must survive vacuum, thermal cycling, dust, and zero-net-impulse engagement.",
            selected_transfer_mechanism="Directional wedge-fibril dry adhesion actuated through differential shear.",
            engineering_role="surface enhancement",
            translated_effect="The transfer mechanism creates high shear-controlled attachment without relying on bulk adhesives or large normal preload.",
            implementation_slot="Confine the enhancement to the pad/contact interface and link it to a differential-shear actuation stage with bounded electroadhesive assist.",
            validation_hook=_compact_text(validation_hook or "Run TVAC, dust/MLI contamination, release, and outgassing validation before on-orbit use."),
        )
    if _is_external_pipeline_drag_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Exterior coating access cannot assume strong active coupling through long rigid pipe runs.",
            selected_transfer_mechanism="Passive three-layer thermo-viscous and vibro-acoustic coating with gas-branch thermal conditioning and liquid-branch damping checks, while active forcing stays a falsification insert.",
            engineering_role="surface enhancement",
            translated_effect="The transfer mechanism keeps the main route deployable as a passive coating while making any active claim falsifiable through pumping-power and energy accounting.",
            implementation_slot="Place the enhancement in a three-layer exterior coating stack: interface layer, damping layer, and outer shell, with separate gas-branch and liquid-branch validation rather than an always-on active pipeline system.",
            validation_hook=_compact_text(validation_hook or "Measure gas-branch thermal conditioning, liquid-branch vibration damping, pressure drop, fouling, and net pumping-power accounting against coated/uncoated controls."),
        )
    if _is_self_regulating_thermal_material_query(query):
        return TransferMapping(
            baseline_backbone=_compact_text(baseline),
            bottleneck="Thermal regulation must not weaken the main structural load path.",
            selected_transfer_mechanism="CTE-mismatched bimetallic thermal-shunt actuation in secondary apertures.",
            engineering_role="material substitution",
            translated_effect="The transfer mechanism changes thermal contact and porosity passively while leaving the primary lattice members continuous and load bearing.",
            implementation_slot="Embed the enhancement in secondary shunt apertures and contact gaps instead of the primary truss members.",
            validation_hook=_compact_text(validation_hook or "Validate switching window, load retention, porosity change, and fatigue across coupled thermal-mechanical cycling."),
        )
    return None


def _guess_engineering_role(sections: GlobalInsightSections) -> str:
    combined = " ".join(
        [
            sections.primary_recommendation.lower(),
            sections.why_this_path.lower(),
            str(sections.engineering_blueprint).lower() if sections.engineering_blueprint else "",
        ]
    )
    if any(term in combined for term in ("control", "guidance", "state", "threshold", "feedback", "packet", "neighbor")):
        return "control refinement"
    if any(term in combined for term in ("failure", "shield", "sealing", "mitigation", "corrosion", "washout", "repair")):
        return "failure mitigation"
    if any(term in combined for term in ("material", "coating", "adhesive", "bimetal", "alloy", "polymer", "composite")):
        return "material substitution"
    return "surface enhancement"


def _infer_transfer_mapping(
    query: str,
    sections: GlobalInsightSections,
    *,
    active_ingredients: str = "",
) -> TransferMapping | None:
    mapping = _query_specific_transfer_mapping(query, sections)
    if mapping:
        return mapping
    blueprint = sections.engineering_blueprint
    if blueprint is None:
        return None
    selected = active_ingredients.strip() or sections.why_this_path.strip()
    if not selected:
        return None
    validation_hook = blueprint.parameter_direction or blueprint.manufacturing_or_integration_path
    implementation_slot = blueprint.materials_or_components or blueprint.core_structure
    if not implementation_slot.strip():
        return None
    return TransferMapping(
        baseline_backbone=_compact_text(blueprint.core_structure or sections.primary_recommendation),
        bottleneck=_compact_text(sections.why_this_path or sections.primary_recommendation),
        selected_transfer_mechanism=_compact_text(selected),
        engineering_role=_guess_engineering_role(sections),
        translated_effect=_compact_text(sections.global_insight.summary if sections.global_insight else sections.why_this_path),
        implementation_slot=_compact_text(implementation_slot),
        validation_hook=_compact_text(validation_hook),
    )


def _compute_detail_density_check(sections: GlobalInsightSections) -> list[str]:
    slots: list[str] = []
    blueprint = sections.engineering_blueprint
    pack = sections.engineering_detail_pack
    combined = " ".join(
        [
            sections.primary_recommendation,
            sections.why_this_path,
            " ".join(value for value in (pack.model_dump().values() if pack else []) if isinstance(value, str)),
            str(blueprint.core_structure) if blueprint else "",
            str(blueprint.materials_or_components) if blueprint else "",
            str(blueprint.parameter_direction) if blueprint else "",
            str(blueprint.manufacturing_or_integration_path) if blueprint else "",
            " ".join(sections.risks_and_tradeoffs or []),
            " ".join(item.detail for item in sections.action_summary),
        ]
    ).lower()
    if (blueprint and blueprint.materials_or_components.strip()) or any(
        _detail_pack_has_value(pack, field_name)
        for field_name in ("component_choices", "material_system", "material_grade_or_family", "pad_interface_stack")
    ):
        slots.append("materials")
    if (
        blueprint
        and (
            any(ch.isdigit() for ch in blueprint.parameter_direction)
            or any(
                token in blueprint.parameter_direction.lower()
                for token in ("estimated starting range", "initial target", "window", "target", "wall units")
            )
        )
    ) or any(
        _detail_pack_has_value(pack, field_name)
        for field_name in ("dimension_windows", "cure_or_forming_window", "dosage_or_mix_window", "scaling_metrics")
    ):
        slots.append("ranges")
    if any(term in combined for term in _VALIDATION_TERMS) or any(
        _detail_pack_has_value(pack, field_name)
        for field_name in ("validation_protocols", "validation_stack")
    ):
        slots.append("validation")
    if (blueprint and blueprint.manufacturing_or_integration_path.strip()) or any(
        _detail_pack_has_value(pack, field_name)
        for field_name in ("integration_sequence", "attach_sequence", "detach_sequence")
    ):
        slots.append("integration")
    if any(term in combined for term in _CONTROL_TERMS) or any(
        _detail_pack_has_value(pack, field_name)
        for field_name in ("state_variables", "message_schema", "update_cadence", "trigger_conditions", "fallback_policy")
    ):
        slots.append("control")
    if any(term in combined for term in _FAILURE_TERMS) or any(
        _detail_pack_has_value(pack, field_name)
        for field_name in ("failure_boundaries", "environmental_boundaries", "system_level_constraints")
    ):
        slots.append("failure_boundary")
    return [slot for slot in dict.fromkeys(slots) if slot in DETAIL_DENSITY_SLOTS]


def _required_density_slots(profile: str) -> set[str]:
    if profile == "materials_process_delivery":
        return {"materials", "ranges", "validation", "integration", "failure_boundary"}
    if profile == "structural_multiphysics_delivery":
        return {"materials", "ranges", "validation", "integration", "failure_boundary"}
    if profile == "control_protocol_delivery":
        return {"ranges", "validation", "integration", "control"}
    if profile == "aero_hydrodynamic_delivery":
        return {"ranges", "validation", "integration"}
    if profile == "extreme_environment_attachment_delivery":
        return {"materials", "ranges", "validation", "integration", "failure_boundary"}
    return {"materials", "ranges", "validation", "integration"}


def _query_specific_density_gaps(
    query: str,
    sections: GlobalInsightSections,
) -> list[str]:
    pack = sections.engineering_detail_pack or EngineeringDetailPack()
    blueprint = sections.engineering_blueprint
    combined = " ".join(
        [
            sections.primary_recommendation,
            sections.why_this_path,
            " ".join(value for value in pack.model_dump().values() if isinstance(value, str)),
            str(blueprint.core_structure) if blueprint else "",
            str(blueprint.materials_or_components) if blueprint else "",
            str(blueprint.parameter_direction) if blueprint else "",
            str(blueprint.manufacturing_or_integration_path) if blueprint else "",
            " ".join(item.detail for item in sections.action_summary),
        ]
    ).lower()
    gaps: list[str] = []
    required_fields = [
        *_profile_required_detail_fields(sections.delivery_profile),
        *_query_specific_required_detail_fields(query),
    ]
    for field_name in dict.fromkeys(required_fields):
        if not _detail_pack_has_value(pack, field_name):
            gaps.append(f"Fill engineering_detail_pack.{field_name}: {DETAIL_PACK_DESCRIPTIONS[field_name]}")
    if _is_self_healing_concrete_query(query):
        if not any(term in combined for term in ("sodium silicate", "dual capsule", "dual capsules")):
            gaps.append("State the dual healing chemistry explicitly, not just generic capsules.")
        if not any(term in combined for term in ("puf", "pmma", "shell")):
            gaps.append("Add capsule shell material or shell design guidance.")
        if not any(term in combined for term in ("2-4", "2 to 4", "dosage", "vol%")):
            gaps.append("Add capsule dosage or volume fraction guidance.")
        if "mix" not in combined and "shear" not in combined:
            gaps.append("Add a mixing-sequence or shear-window instruction.")
    if _is_underwater_curing_adhesive_query(query):
        if re.search(r"\bepoxy\b", combined) and re.search(r"\bmethacrylate\b|\bmma\b", combined):
            gaps.append("Use one adhesive chemistry family only; do not mix epoxy and methacrylate routes in the same recommendation.")
        if not any(term in combined for term in ("thix", "sg", "specific gravity", "density")):
            gaps.append("Add rheology or density-matching guidance against washout.")
        if not any(term in combined for term in ("roughness", "grit", "surface prep", "surface roughness")):
            gaps.append("Add substrate preparation or roughness window.")
        if not any(term in combined for term in ("shroud", "cofferdam", "one-way", "seal")):
            gaps.append("Add local flow-isolation mechanics for the delivery tool.")
    if _is_low_noise_rotor_query(query):
        if not any(term in combined for term in ("outboard", "outer", "span", "30-40%")):
            gaps.append("Add the spanwise application zone for the treatment.")
        if not any(term in combined for term in ("tip mach", "mach", "penalty", "l/d")):
            gaps.append("Add system-level acoustic or aerodynamic penalty bounds.")
    if _is_underwater_glider_plume_query(query):
        if not any(term in combined for term in ("ekf", "relative", "tof", "time-of-flight")):
            gaps.append("Add a relative localization mechanism for GPS-denied operation.")
        if not any(term in combined for term in ("packet", "payload", "message", "tdma", "sync")):
            gaps.append("Add packet schema or low-bandwidth communication scheduling.")
        if not any(term in combined for term in ("inflection", "trigger", "update", "fallback")):
            gaps.append("Add explicit control update timing or local fallback behavior.")
    if _is_space_debris_dry_attachment_query(query):
        if not any(term in combined for term in ("whiffletree", "load-sharing", "load distribution", "compliant backing")):
            gaps.append("Add a load-distribution mechanism for irregular contact.")
        if not any(term in combined for term in ("touch", "tack", "shear", "release", "back-away")):
            gaps.append("Add the attachment and detachment sequence explicitly.")
    if _is_self_regulating_thermal_material_query(query):
        if not any(term in combined for term in ("batch", "insert", "bond", "capture", "co-fabricat", "stamp")):
            gaps.append("Add a scalable manufacturing or assembly route.")
        if not any(term in combined for term in ("primary", "secondary", "load path", "non-primary")):
            gaps.append("Clarify separation between the structural path and the regulating path.")
    if _is_external_pipeline_drag_query(query):
        if not any(term in combined for term in ("coating stack", "outer jacket", "protective outer", "laminate")):
            gaps.append("Explain why the active architecture still qualifies as an exterior coating system.")
        if not any(term in combined for term in ("reject", "falsify", "net energy", "transfer function")):
            gaps.append("Add the reject criterion and transfer-function validation.")
    return gaps


def _apply_delivery_diagnostics(
    sections: GlobalInsightSections,
    query: str,
    *,
    active_ingredients: str = "",
) -> GlobalInsightSections:
    sections = _normalize_sections(sections)
    if not sections.delivery_profile:
        sections.delivery_profile = _infer_delivery_profile(query, sections)
    if sections.delivery_profile not in DELIVERY_PROFILES:
        sections.delivery_profile = _infer_delivery_profile(query, sections)
    sections = _apply_route_selection_to_sections(query, sections)
    mapping = _infer_transfer_mapping(query, sections, active_ingredients=active_ingredients)
    if mapping and mapping.engineering_role in ENGINEERING_ROLES and mapping.implementation_slot.strip():
        sections.transfer_mapping = mapping
    else:
        sections.transfer_mapping = None
    sections.engineering_detail_pack = _seed_detail_pack_from_sections(query, sections)
    sections.engineering_fact_cards = _merge_fact_cards(sections.engineering_fact_cards, _query_specific_fact_cards(query))
    sections.detail_density_check = _compute_detail_density_check(sections)
    if not sections.why_this_path.strip() and sections.transfer_mapping is not None:
        sections.why_this_path = sections.transfer_mapping.translated_effect or sections.transfer_mapping.bottleneck
    return _normalize_sections(sections)


def _needs_densification(sections: GlobalInsightSections, query: str = "") -> bool:
    has_complete_blueprint = bool(
        sections.primary_recommendation.strip()
        and sections.why_this_path.strip()
        and sections.engineering_blueprint is not None
        and sections.engineering_blueprint.core_structure.strip()
        and sections.engineering_blueprint.materials_or_components.strip()
        and sections.engineering_blueprint.parameter_direction.strip()
        and sections.engineering_blueprint.manufacturing_or_integration_path.strip()
    )
    if (
        sections.route_selection is None
        and sections.transfer_mapping is None
        and not _query_specific_required_detail_fields(query)
        and has_complete_blueprint
    ):
        return False
    required = _required_density_slots(sections.delivery_profile)
    slots = set(sections.detail_density_check)
    if len(slots) < 4:
        return True
    if not required.issubset(slots):
        return True
    if sections.transfer_mapping is None:
        return True
    for field_name in _profile_required_detail_fields(sections.delivery_profile):
        if not _detail_pack_has_value(sections.engineering_detail_pack, field_name):
            return True
    return False


def _densifier_prompt(
    query: str,
    context: str,
    sections: GlobalInsightSections,
    *,
    active_ingredients: str = "",
) -> tuple[str, str]:
    profile_requirements = {
        "materials_process_delivery": "Must cover material stack, cure/forming window, surface preparation, validation protocol, and failure mode boundary.",
        "structural_multiphysics_delivery": "Must cover primary load path, auxiliary regulation path, geometry or displacement range, life-cycle target, and coupled load/thermal validation.",
        "control_protocol_delivery": "Must cover state variables, control law, thresholds or triggers, update cadence, communications budget, and local fallback behavior.",
        "aero_hydrodynamic_delivery": "Must cover target flow quantity, dimensional or wall-unit range, geometry constraint, and simulation/experimental validation method.",
        "extreme_environment_attachment_delivery": "Must cover contact mechanism, actuation chain, contamination or outgassing boundary, and TVAC/release validation.",
    }
    mapping = sections.transfer_mapping.model_dump() if sections.transfer_mapping else {}
    route = sections.route_selection.model_dump() if sections.route_selection else {}
    fact_cards = [card.model_dump() for card in sections.engineering_fact_cards]
    gap_list = _query_specific_density_gaps(query, sections)
    typed_fields = list(
        dict.fromkeys(
            [
                *_profile_required_detail_fields(sections.delivery_profile),
                *_query_specific_required_detail_fields(query),
            ]
        )
    )
    typed_field_block = ""
    if typed_fields:
        typed_field_block = "engineering_detail_pack fields to fill:\n" + "\n".join(
            f"- {field_name}: {DETAIL_PACK_DESCRIPTIONS[field_name]}"
            for field_name in typed_fields
        ) + "\n\n"
    gap_block = ""
    if gap_list:
        gap_block = "Current missing delivery details that must be repaired:\n" + "\n".join(
            f"- {gap}" for gap in gap_list
        ) + "\n\n"
    prompt = (
        f"Engineering Query: {query}\n\n"
        f"Current Structured Answer:\n{sections.model_dump_json(exclude_none=True, indent=2)}\n\n"
        f"Route selector decision (overrides transfer_mapping if they conflict):\n{json.dumps(route, ensure_ascii=False, indent=2)}\n\n"
        f"Candidate transfer mapping:\n{json.dumps(mapping, ensure_ascii=False, indent=2)}\n\n"
        f"Engineering fact cards to prefer before estimating details:\n{json.dumps(fact_cards, ensure_ascii=False, indent=2)}\n\n"
        f"Mechanism hint:\n{active_ingredients[:1200]}\n\n"
        f"Context excerpt:\n{context[:2200]}\n\n"
        f"{typed_field_block}"
        f"{gap_block}"
        "Rewrite the structured answer into an engineering-delivery version.\n"
        "Hard rules:\n"
        "- Keep exactly one primary recommendation.\n"
        "- Keep at most one transfer enhancement point, and bind it to a real engineering slot.\n"
        "- Preserve the same core physics and main architecture; do not invent a new mechanism family.\n"
        "- If route_selection is present, treat selected_main_route as mandatory and rejected_routes as forbidden primary routes.\n"
        "- Prefer engineering_fact_cards over free-form estimates; if fact cards are absent, mark uncertain values as estimated starting range / validation needed.\n"
        "- Make the answer read like an engineering decision memo, not a mechanism survey.\n"
        "- Populate engineering_detail_pack with the most concrete material, dimension, interaction, sequence, and validation data you can defend.\n"
        "- Fill at least four of these slots: recommended component/material, estimated starting range, initial target, validation protocol, failure boundary, integration sequence.\n"
        "- If a brand-grade choice is not defensible, use a family-level material name; do not invent vendor claims.\n"
        "- Output valid JSON only, using the same top-level schema plus delivery_profile, transfer_mapping, engineering_detail_pack, and detail_density_check.\n\n"
        f"Delivery profile requirement: {profile_requirements.get(sections.delivery_profile, 'Provide concrete engineering slots and validation details.')}"
    )
    system_instruction = (
        "You are an engineering delivery specialist. "
        "Convert a critic-approved architecture into a denser, handbook-like engineering decision draft. "
        "Do not add meta commentary, prompt artifacts, or source-domain storytelling. "
        "Keep the single main recommendation and express the cross-domain mechanism only as one bounded enhancement module."
    )
    return prompt, system_instruction


async def engineering_densify_answer(
    query: str,
    context: str,
    answer: str,
    *,
    active_ingredients: str = "",
) -> str:
    sections = _parse_sections(answer)
    if sections is None:
        return answer
    if sections.engineering_blueprint is None:
        return _serialize_sections(sections)
    if not sections.primary_recommendation.strip() or not sections.why_this_path.strip():
        return _serialize_sections(sections)
    sections = _apply_delivery_diagnostics(sections, query, active_ingredients=active_ingredients)
    if not _needs_densification(sections, query) and not _query_specific_density_gaps(query, sections):
        return _serialize_sections(sections)
    prompt, system_instruction = _densifier_prompt(
        query,
        context,
        sections,
        active_ingredients=active_ingredients,
    )
    try:
        enriched = await get_gemini_response(
            prompt=prompt,
            system_instruction=system_instruction,
            task="engineering_delivery",
        )
        enriched_sections = _parse_sections(enriched)
        if enriched_sections is None:
            return _serialize_sections(sections)
        enriched_sections = _apply_delivery_diagnostics(
            enriched_sections,
            query,
            active_ingredients=active_ingredients,
        )
        return _serialize_sections(enriched_sections)
    except Exception as exc:
        logger.warning("Engineering densifier failed: %s. Falling back to seed.", exc)
        return _serialize_sections(sections)


def _merge_detail_pack_into_sections(sections: GlobalInsightSections) -> GlobalInsightSections:
    pack = sections.engineering_detail_pack
    fact_cards = sections.engineering_fact_cards or []
    if pack is None and not fact_cards:
        return sections
    blueprint = sections.engineering_blueprint or EngineeringBlueprint()
    fact_components = "; ".join(
        card.component_or_material for card in fact_cards if card.component_or_material.strip()
    )
    fact_parameters = "; ".join(
        card.parameter_or_range for card in fact_cards if card.parameter_or_range.strip()
    )
    fact_validation = "; ".join(
        card.validation_method for card in fact_cards if card.validation_method.strip()
    )
    fact_failures = [
        card.failure_boundary for card in fact_cards if card.failure_boundary.strip()
    ]
    if pack is None:
        pack = EngineeringDetailPack()
        sections.engineering_detail_pack = pack
    if pack.material_system and " or " in blueprint.materials_or_components.lower():
        blueprint.materials_or_components = _rewrite_adhesive_route(
            blueprint.materials_or_components,
            pack.material_system,
        )
    if pack.material_system:
        for field_name in (
            "component_choices",
            "material_grade_or_family",
            "pad_interface_stack",
            "integration_sequence",
            "validation_protocols",
        ):
            setattr(
                pack,
                field_name,
                _rewrite_adhesive_route(getattr(pack, field_name), pack.material_system),
            )
    blueprint.materials_or_components = _join_nonempty(
        blueprint.materials_or_components,
        pack.material_system,
        pack.material_grade_or_family,
        pack.component_choices,
        pack.pad_interface_stack,
        pack.load_distribution_mechanism,
        fact_components,
    )
    blueprint.parameter_direction = _join_nonempty(
        blueprint.parameter_direction,
        pack.dimension_windows,
        pack.cure_or_forming_window,
        pack.dosage_or_mix_window,
        pack.application_zone,
        pack.scaling_metrics,
        pack.system_level_constraints,
        pack.environmental_boundaries,
        fact_parameters,
    )
    blueprint.manufacturing_or_integration_path = _join_nonempty(
        blueprint.manufacturing_or_integration_path,
        pack.integration_sequence,
        pack.attach_sequence,
        pack.detach_sequence,
        pack.validation_protocols,
        pack.validation_stack,
        pack.surface_preparation,
        fact_validation,
    )
    blueprint.core_structure = _dedupe_semicolon_clauses(blueprint.core_structure)
    blueprint.materials_or_components = _dedupe_semicolon_clauses(blueprint.materials_or_components)
    blueprint.parameter_direction = _dedupe_semicolon_clauses(blueprint.parameter_direction)
    blueprint.manufacturing_or_integration_path = _dedupe_semicolon_clauses(blueprint.manufacturing_or_integration_path)
    sections.engineering_blueprint = blueprint
    sections.why_this_path = _dedupe_semicolon_clauses(
        _join_nonempty(
            sections.why_this_path,
            pack.interaction_mechanisms,
        )
    )
    if pack.failure_boundaries:
        combined_risks = sections.risks_and_tradeoffs + [pack.failure_boundaries]
        sections.risks_and_tradeoffs = [item for item in dict.fromkeys(combined_risks) if item][:3]
    if fact_failures:
        combined_risks = sections.risks_and_tradeoffs + fact_failures
        sections.risks_and_tradeoffs = [item for item in dict.fromkeys(combined_risks) if item][:3]
    return sections


def compress_delivery_answer(
    query: str,
    answer: str,
    *,
    active_ingredients: str = "",
) -> str:
    sections = _parse_sections(answer)
    if sections is None:
        return answer
    primary = sections.primary_recommendation.strip()
    for marker in (" Alternatively", " alternatively", "\nAlternative", "\nOption 2"):
        if marker in primary:
            primary = primary.split(marker, 1)[0].strip(" ;,")
    sections.primary_recommendation = primary
    if not sections.why_this_path.strip() and sections.transfer_mapping is not None:
        sections.why_this_path = (
            sections.transfer_mapping.translated_effect
            or sections.transfer_mapping.bottleneck
        )
    sections = _apply_delivery_diagnostics(sections, query, active_ingredients=active_ingredients)
    sections = _merge_detail_pack_into_sections(sections)
    sections = _normalize_sections(sections)
    latin = sum(1 for ch in query if ("a" <= ch.lower() <= "z"))
    cjk = sum(1 for ch in query if "\u4e00" <= ch <= "\u9fff")
    public_language = "en" if latin > cjk * 2 and latin > 20 else "zh"
    sections.review_answer = build_review_answer(sections, public_language=public_language)
    return _serialize_sections(sections)


async def run_engineering_delivery_pass(
    query: str,
    context: str,
    answer: str,
    *,
    active_ingredients: str = "",
) -> str:
    densified = await engineering_densify_answer(
        query,
        context,
        answer,
        active_ingredients=active_ingredients,
    )
    return compress_delivery_answer(
        query,
        densified,
        active_ingredients=active_ingredients,
    )
