"""HTML / XML / JSON parsing utilities for structured search responses.

All functions in this module are pure (no I/O, no LLM calls).
"""

from __future__ import annotations

import json
import re
from typing import Any

from ..models import (
    ActionSummaryItem,
    DecisionAlternative,
    EngineeringDetailPack,
    EngineeringBlueprint,
    EngineeringFactCard,
    FeasibilityCheckSection,
    GlobalInsightSection,
    GlobalInsightSections,
    MechanismCheckSection,
    RouteSelection,
    SearchDiagnosticsSection,
)

# ---------------------------------------------------------------------------
# Constants & compiled patterns
# ---------------------------------------------------------------------------

SECTION_ALIASES = {
    "Mechanism Check": "mechanism_check",
    "机制校验": "mechanism_check",
    "Feasibility Check": "feasibility_check",
    "可行性评估": "feasibility_check",
    "Search Diagnostics": "search_diagnostics",
    "搜索诊断": "search_diagnostics",
    "Global Insight": "global_insight",
    "全局洞察": "global_insight",
    "Action Summary": "action_summary",
    "行动摘要": "action_summary",
}
SECTION_TAGS = set(SECTION_ALIASES.values())
ARTICLE_PATTERN = re.compile(r'<article class="[^"]*insight-xml-card[^"]*"[\s\S]*?</article>')
XML_SECTION_PATTERN = re.compile(r"<([a-z_]+)>([\s\S]*?)</\1>")
ACTION_HEADING_WITH_DETAIL_PATTERN = re.compile(
    r'<div class="insight-xml-action-heading">([\s\S]*?)</div>[\s\S]*?<div class="insight-xml-action-detail">([\s\S]*?)</div>'
)
ACTION_HEADING_ONLY_PATTERN = re.compile(
    r'<div class="insight-xml-action-heading">([\s\S]*?)</div>'
)
DIAGNOSTIC_ENTRY_PATTERN = re.compile(
    r'<div class="insight-xml-diagnostic-key">([\s\S]*?)</div>\s*<div class="insight-xml-diagnostic-value">([\s\S]*?)</div>'
)


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------


def _strip_html(value: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    text = re.sub(r"</(p|div|article|section|details|summary|li|ul|ol|h3)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = (
        text.replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&gt;", ">")
        .replace("&lt;", "<")
        .replace("&amp;", "&")
    )
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _canonical_render_clause(value: str) -> str:
    text = re.sub(r"\s+", " ", value or "").strip(" ;,")
    text = text.replace("–", "-").replace("—", "-")
    return text.rstrip(".").lower()


def _render_clause_parts(value: str) -> list[str]:
    text = re.sub(r"\s+", " ", value or "").strip()
    if not text:
        return []
    return [part.strip(" ;,") for part in re.split(r"\s*;\s*", text) if part.strip(" ;,")]


def _render_clauses_equivalent(candidate: str, seen_clause: str) -> bool:
    a = _canonical_render_clause(candidate)
    b = _canonical_render_clause(seen_clause)
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    a_words = set(a.replace("->", " ").split())
    b_words = set(b.replace("->", " ").split())
    if not a_words or not b_words:
        return False
    overlap = len(a_words & b_words) / min(len(a_words), len(b_words))
    return overlap >= 0.8


def _finalize_render_text(value: str, *, sentence_mode: bool) -> str:
    text = re.sub(r"\s+", " ", value or "").strip(" ;,")
    if not text:
        return ""
    if sentence_mode:
        text = text.replace("; ", ". ")
        text = re.sub(r"\.\s*\.", ".", text)
    text = text.replace(".;", ".").replace(";.", ".")
    return text.strip()


def _normalize_render_field(
    value: str,
    *,
    field_kind: str,
    seen_clauses: list[str],
) -> str:
    parts = _render_clause_parts(value)
    filtered: list[str] = []
    for part in parts:
        if (
            field_kind in {"parameter_direction", "manufacturing_or_integration_path"}
            and any("gas branch" in seen.lower() or "liquid branch" in seen.lower() for seen in seen_clauses)
        ):
            part = re.sub(r"(?i)\bgas branch\b", "air-loop path", part)
            part = re.sub(r"(?i)\bliquid branch\b", "water-loop path", part)
            part = re.sub(r"(?i)\bgas-branch\b", "air-loop", part)
            part = re.sub(r"(?i)\bliquid-branch\b", "water-loop", part)
            if not part:
                continue
        if (
            field_kind == "parameter_direction"
            and "physical coupling boundary" in part.lower()
            and any("physical coupling boundary" in seen.lower() for seen in seen_clauses)
        ):
            part = re.sub(r"(?i)\b(?:and\s+)?(?:an?\s+explicit\s+)?physical coupling boundary[: ]*", "", part).strip(" ;,")
            if not part:
                continue
        if field_kind == "parameter_direction" and "->" in part:
            continue
        if any(_render_clauses_equivalent(part, seen) for seen in seen_clauses):
            continue
        filtered.append(part)
        seen_clauses.append(part)
    if not filtered:
        text = re.sub(r"\s+", " ", value or "").strip()
        return _finalize_render_text(text, sentence_mode=field_kind in {"why_this_path", "parameter_direction", "manufacturing_or_integration_path"})
    joiner = ". " if field_kind in {"why_this_path", "parameter_direction", "manufacturing_or_integration_path"} else "; "
    return _finalize_render_text(joiner.join(filtered), sentence_mode=field_kind in {"why_this_path", "parameter_direction", "manufacturing_or_integration_path"})


def _extract_json_candidate(raw: str) -> dict[str, Any] | None:
    candidates = [raw.strip()]
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw, re.I)
    if fenced:
        candidates.append(fenced.group(1).strip())

    first_brace = raw.find("{")
    last_brace = raw.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidates.append(raw[first_brace:last_brace + 1].strip())

    for candidate in candidates:
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except Exception:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


# ---------------------------------------------------------------------------
# Verdict inference
# ---------------------------------------------------------------------------


def _infer_mechanism_verdict(body: str) -> str:
    lower = body.lower()
    if "not viable" in lower or "不可行" in body:
        return "fail"
    if "warning" in lower or "需注意" in body:
        return "warning"
    return "sound"


def _infer_feasibility_verdict(body: str) -> str:
    lower = body.lower()
    if "low feasibility" in lower or "可行性较低" in body:
        return "low"
    if "medium" in lower or "需要重构" in body or "仍需重构" in body:
        return "medium"
    return "high"


def _infer_action_priority(text: str, index: int) -> str:
    lower = text.lower()
    if any(token in lower for token in ("cleanup", "archive", "documentation", "note")):
        return "P3"
    if any(token in lower for token in ("form", "modernization", "refactor")) or "状态" in text:
        return "P2"
    if any(token in lower for token in ("root", "migration", "compiler", "entry")) or "调度" in text:
        return "P1"
    return f"P{min(index + 1, 3)}"


def _lane_for_priority(priority: str) -> str:
    if priority == "P1":
        return "立即执行"
    if priority == "P2":
        return "本轮重构"
    return "后续清理"


# ---------------------------------------------------------------------------
# Diagnostics extraction
# ---------------------------------------------------------------------------


def _extract_diagnostics_from_html(content: str) -> dict[str, Any] | None:
    entries = list(DIAGNOSTIC_ENTRY_PATTERN.finditer(content))
    if not entries:
        return None

    parsed: dict[str, Any] = {}
    for match in entries:
        key = _strip_html(match.group(1)).lower().replace(" ", "_")
        value = _strip_html(match.group(2))
        if key == "recommended_vector_weight":
            try:
                parsed[key] = float(value)
            except ValueError:
                parsed[key] = 0.7
            continue
        if key == "barrier_triggered":
            parsed[key] = value.lower() == "true"
            continue
        parsed[key] = value.lower() if key == "intent_type" else value
    return parsed


def _parse_diagnostics(content: str) -> SearchDiagnosticsSection | None:
    cleaned = re.sub(r'<h3 class="insight-xml-title">[\s\S]*?</h3>', "", content).strip()
    parsed = _extract_json_candidate(cleaned)
    if parsed is None:
        parsed = _extract_diagnostics_from_html(cleaned)
    if parsed is None:
        return None
    intent_type = str(parsed.get("intent_type", "divergent")).lower()
    if intent_type not in {"divergent", "convergent"}:
        intent_type = "divergent"
    weight = parsed.get("recommended_vector_weight", 0.7)
    try:
        weight_value = float(weight)
    except (TypeError, ValueError):
        weight_value = 0.7
    return SearchDiagnosticsSection(
        intent_type=intent_type,
        recommended_vector_weight=weight_value,
        barrier_triggered=bool(parsed.get("barrier_triggered", False)),
    )


# ---------------------------------------------------------------------------
# Action summary extraction
# ---------------------------------------------------------------------------


def _collect_action_items(content: str) -> list[str]:
    html_items = [
        (
            _strip_html(match.group(1)),
            _strip_html(match.group(2)),
        )
        for match in ACTION_HEADING_WITH_DETAIL_PATTERN.finditer(content)
    ]
    if not html_items:
        html_items = [
            (
                _strip_html(match.group(1)),
                "",
            )
            for match in ACTION_HEADING_ONLY_PATTERN.finditer(content)
        ]
    if html_items:
        return [f"{title}: {detail}".strip(": ") for title, detail in html_items]

    paragraphs = [item.strip() for item in re.split(r"\n{2,}", content) if item.strip()]
    items: list[str] = []
    for paragraph in paragraphs:
        lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
        current = ""
        for line in lines:
            starts_new = current and (
                re.match(r"^\d+[.)]\s+", line)
                or re.match(r"^[-*]\s+", line)
                or ("：" in line or ":" in line)
            )
            if starts_new:
                items.append(current)
                current = line
            else:
                current = f"{current} {line}".strip()
        if current:
            items.append(current)
    return items


def _normalize_action_title(value: str) -> str:
    return re.sub(r"^\d+[.)]\s*", "", value).strip()


def _parse_action_summary(content: str) -> list[ActionSummaryItem]:
    items = _collect_action_items(content)
    parsed: list[ActionSummaryItem] = []
    for index, item in enumerate(items):
        split_at = min(
            [pos for pos in [item.find(":"), item.find("：")] if pos != -1] or [-1]
        )
        if split_at != -1:
            title = _normalize_action_title(item[:split_at].strip())
            detail = item[split_at + 1 :].strip()
        else:
            title = _normalize_action_title(item)
            detail = ""
        priority = _infer_action_priority(item, index)
        parsed.append(
            ActionSummaryItem(
                title=title,
                detail=detail,
                priority=priority,
                lane=_lane_for_priority(priority),
            )
        )
    return parsed


# ---------------------------------------------------------------------------
# Section normalization & coercion
# ---------------------------------------------------------------------------


def _split_paragraphs(content: str) -> list[str]:
    return [paragraph.strip() for paragraph in re.split(r"\n{2,}", content) if paragraph.strip()]


def _normalize_legacy_articles(raw: str) -> str:
    def replace_article(match: re.Match[str]) -> str:
        article = match.group(0)
        raw_title = re.search(r'<h3 class="insight-xml-title">([\s\S]*?)</h3>', article)
        raw_eyebrow = re.search(r'<span class="insight-xml-eyebrow">([\s\S]*?)</span>', article)
        title = _strip_html(raw_title.group(1)) if raw_title else ""
        eyebrow = _strip_html(raw_eyebrow.group(1)) if raw_eyebrow else ""
        section_tag = SECTION_ALIASES.get(title) or SECTION_ALIASES.get(eyebrow)
        if not section_tag:
            return article
        raw_body_match = re.search(r'<div class="insight-xml-body">([\s\S]*?)</div>\s*</article>', article)
        raw_body = raw_body_match.group(1) if raw_body_match else article
        if section_tag == "search_diagnostics":
            diagnostics = _extract_diagnostics_from_html(raw_body)
            body = json.dumps(diagnostics, ensure_ascii=False) if diagnostics else _strip_html(raw_body)
        elif section_tag == "action_summary":
            body = "\n\n".join(_collect_action_items(raw_body))
        else:
            body = _strip_html(raw_body)
        return f"<{section_tag}>\n{body}\n</{section_tag}>"

    return ARTICLE_PATTERN.sub(replace_article, raw)


def _promote_plain_heading_sections(raw: str) -> str:
    lines = raw.splitlines()
    sections: list[tuple[str, list[str]]] = []
    current_tag: str | None = None
    current_lines: list[str] = []
    prefix_lines: list[str] = []

    def flush_current() -> None:
        nonlocal current_tag, current_lines
        if current_tag:
            sections.append((current_tag, current_lines[:]))
        current_tag = None
        current_lines = []

    for line in lines:
        stripped = line.strip()
        section_tag = SECTION_ALIASES.get(stripped)
        if section_tag:
            flush_current()
            current_tag = section_tag
            continue
        if current_tag:
            current_lines.append(line)
        else:
            prefix_lines.append(line)

    flush_current()
    if not sections:
        return raw

    rebuilt = "\n".join(prefix_lines).strip()
    payload = "\n\n".join(
        f"<{tag}>\n{chr(10).join(body).strip()}\n</{tag}>" for tag, body in sections
    )
    return f"{rebuilt}\n\n{payload}".strip()


def _extract_xml_sections(raw: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    for match in XML_SECTION_PATTERN.finditer(raw):
        tag = match.group(1)
        if tag in SECTION_TAGS:
            sections[tag] = match.group(2).strip()
    return sections


def _split_embedded_plain_sections(content: str) -> tuple[str, str]:
    lines = content.splitlines()
    for index, line in enumerate(lines):
        if SECTION_ALIASES.get(line.strip()):
            return "\n".join(lines[:index]).strip(), "\n".join(lines[index:]).strip()
    return content.strip(), ""


def _coerce_sections_from_text(raw: str) -> GlobalInsightSections | None:
    working = _normalize_legacy_articles(raw)
    working = _promote_plain_heading_sections(working)
    extracted = _extract_xml_sections(working)
    if not extracted:
        return None

    sections = GlobalInsightSections()

    thinking_raw = extracted.get("thinking")
    if thinking_raw:
        sections.thinking_summary = [
            item.strip()[2:].strip()
            for item in thinking_raw.splitlines()
            if item.strip().startswith("- ")
        ]

    mechanism_raw = extracted.get("mechanism_check")
    if mechanism_raw:
        mechanism_body, trailing = _split_embedded_plain_sections(mechanism_raw)
        sections.mechanism_check = MechanismCheckSection(
            body=_strip_html(mechanism_body),
            verdict=_infer_mechanism_verdict(_strip_html(mechanism_body)),
        )
        if trailing:
            nested = _coerce_sections_from_text(trailing)
            if nested:
                if nested.search_diagnostics:
                    sections.search_diagnostics = nested.search_diagnostics
                if nested.global_insight:
                    sections.global_insight = nested.global_insight
                if nested.action_summary:
                    sections.action_summary = nested.action_summary

    feasibility_raw = extracted.get("feasibility_check")
    if feasibility_raw:
        feasibility_body, trailing = _split_embedded_plain_sections(feasibility_raw)
        stripped = _strip_html(feasibility_body)
        sections.feasibility_check = FeasibilityCheckSection(
            body=stripped,
            verdict=_infer_feasibility_verdict(stripped),
        )
        if trailing:
            nested = _coerce_sections_from_text(trailing)
            if nested:
                if nested.search_diagnostics:
                    sections.search_diagnostics = nested.search_diagnostics
                if nested.global_insight:
                    sections.global_insight = nested.global_insight
                if nested.action_summary:
                    sections.action_summary = nested.action_summary

    diagnostics_raw = extracted.get("search_diagnostics")
    if diagnostics_raw and not sections.search_diagnostics:
        sections.search_diagnostics = _parse_diagnostics(diagnostics_raw)

    global_raw = extracted.get("global_insight")
    if global_raw and not sections.global_insight:
        cleaned = _strip_html(re.sub(r'<h3 class="insight-xml-title">[\s\S]*?</h3>', "", global_raw))
        paragraphs = _split_paragraphs(cleaned)
        if paragraphs:
            sections.global_insight = GlobalInsightSection(
                summary=paragraphs[0],
                details=paragraphs[1:],
            )

    action_raw = extracted.get("action_summary")
    if action_raw and not sections.action_summary:
        sections.action_summary = _parse_action_summary(action_raw)

    if not any(
        [
            sections.mechanism_check,
            sections.feasibility_check,
            sections.search_diagnostics,
            sections.global_insight,
            sections.action_summary,
            sections.thinking_summary,
        ]
    ):
        return None
    return sections


def _coerce_sections_from_json(raw: str) -> GlobalInsightSections | None:
    parsed = _extract_json_candidate(raw)
    if not parsed:
        return None
    if not any(key in parsed for key in SECTION_TAGS | {"thinking_summary"}):
        return None
    try:
        return GlobalInsightSections.model_validate(parsed)
    except Exception:
        return None


def _normalize_sections(sections: GlobalInsightSections) -> GlobalInsightSections:
    allowed_profiles = {
        "materials_process_delivery",
        "structural_multiphysics_delivery",
        "control_protocol_delivery",
        "aero_hydrodynamic_delivery",
        "extreme_environment_attachment_delivery",
    }
    allowed_density_slots = {
        "materials",
        "ranges",
        "validation",
        "integration",
        "control",
        "failure_boundary",
    }
    allowed_roles = {
        "surface enhancement",
        "control refinement",
        "material substitution",
        "failure mitigation",
    }
    sections.action_summary = [
        ActionSummaryItem(
            title=item.title,
            detail=item.detail,
            priority=item.priority,
            lane=_lane_for_priority(item.priority),
        )
        for item in sections.action_summary
    ]
    sections.action_summary = sections.action_summary[:3]
    if sections.delivery_profile not in allowed_profiles:
        sections.delivery_profile = ""
    sections.detail_density_check = [
        slot
        for slot in dict.fromkeys(
            item.strip()
            for item in sections.detail_density_check
            if isinstance(item, str) and item.strip()
        )
        if slot in allowed_density_slots
    ]
    sections.alternatives = [
        DecisionAlternative(title=item.title, detail=item.detail)
        for item in sections.alternatives[:1]
        if item.title.strip() or item.detail.strip()
    ]
    sections.risks_and_tradeoffs = [
        item.strip() for item in sections.risks_and_tradeoffs if item.strip()
    ][:3]
    sections.review_answer = sections.review_answer.strip()
    if sections.engineering_blueprint is not None:
        sections.engineering_blueprint = EngineeringBlueprint(
            core_structure=sections.engineering_blueprint.core_structure.strip(),
            materials_or_components=sections.engineering_blueprint.materials_or_components.strip(),
            parameter_direction=sections.engineering_blueprint.parameter_direction.strip(),
            manufacturing_or_integration_path=sections.engineering_blueprint.manufacturing_or_integration_path.strip(),
        )
    if sections.engineering_detail_pack is not None:
        raw_pack = sections.engineering_detail_pack.model_dump()
        cleaned_pack = {
            key: value.strip()
            for key, value in raw_pack.items()
            if isinstance(value, str) and value.strip()
        }
        sections.engineering_detail_pack = (
            EngineeringDetailPack.model_validate(cleaned_pack) if cleaned_pack else None
        )
    if sections.route_selection is not None:
        route = sections.route_selection
        cleaned_rejected = [
            item.strip()
            for item in route.rejected_routes
            if isinstance(item, str) and item.strip()
        ][:4]
        cleaned_route = RouteSelection(
            selected_main_route=route.selected_main_route.strip(),
            rejected_routes=cleaned_rejected,
            route_rationale=route.route_rationale.strip(),
            transfer_enhancement_slot=route.transfer_enhancement_slot.strip(),
        )
        if not cleaned_route.selected_main_route and not cleaned_route.route_rationale:
            sections.route_selection = None
        else:
            sections.route_selection = cleaned_route
    cleaned_cards: list[EngineeringFactCard] = []
    for card in sections.engineering_fact_cards[:6]:
        cleaned = EngineeringFactCard(
            mechanism=card.mechanism.strip(),
            component_or_material=card.component_or_material.strip(),
            parameter_or_range=card.parameter_or_range.strip(),
            validation_method=card.validation_method.strip(),
            failure_boundary=card.failure_boundary.strip(),
            source_hint=card.source_hint.strip(),
        )
        if any(cleaned.model_dump().values()):
            cleaned_cards.append(cleaned)
    sections.engineering_fact_cards = cleaned_cards
    if sections.transfer_mapping is not None:
        mapping = sections.transfer_mapping
        if (
            mapping.engineering_role not in allowed_roles
            or not mapping.baseline_backbone.strip()
            or not mapping.selected_transfer_mechanism.strip()
            or not mapping.implementation_slot.strip()
        ):
            sections.transfer_mapping = None
    if not sections.primary_recommendation.strip():
        if sections.global_insight and sections.global_insight.summary.strip():
            sections.primary_recommendation = sections.global_insight.summary.strip()
        elif sections.action_summary:
            first = sections.action_summary[0]
            sections.primary_recommendation = f"{first.title}: {first.detail}".strip(": ")
    if not sections.why_this_path.strip() and sections.mechanism_check:
        sections.why_this_path = sections.mechanism_check.body.strip()
    return sections


def _render_legacy_answer_from_sections(
    sections: GlobalInsightSections,
    *,
    public_language: str = "zh",
) -> str:
    if sections.review_answer.strip():
        return sections.review_answer.strip()

    parts: list[str] = []
    english = public_language.lower().startswith("en")
    seen_clauses: list[str] = []
    if sections.primary_recommendation:
        heading = "Primary Recommendation" if english else "主推荐方案"
        primary = _normalize_render_field(
            sections.primary_recommendation,
            field_kind="primary_recommendation",
            seen_clauses=seen_clauses,
        )
        parts.append(f"## {heading}\n{primary}")
    if sections.why_this_path:
        heading = "Why This Path" if english else "为什么选择这一路径"
        why = _normalize_render_field(
            sections.why_this_path,
            field_kind="why_this_path",
            seen_clauses=seen_clauses,
        )
        parts.append(f"## {heading}\n{why}")
    if sections.engineering_blueprint:
        blueprint_parts = []
        if sections.engineering_blueprint.core_structure:
            label = "Core structure" if english else "核心结构"
            sep = ":" if english else "："
            core = _normalize_render_field(
                sections.engineering_blueprint.core_structure,
                field_kind="core_structure",
                seen_clauses=seen_clauses,
            )
            if core:
                blueprint_parts.append(f"{len(blueprint_parts) + 1}. {label}{sep} {core}")
        if sections.engineering_blueprint.materials_or_components:
            label = "Materials/components" if english else "材料/组件"
            sep = ":" if english else "："
            materials = _normalize_render_field(
                sections.engineering_blueprint.materials_or_components,
                field_kind="materials_or_components",
                seen_clauses=seen_clauses,
            )
            if materials:
                blueprint_parts.append(f"{len(blueprint_parts) + 1}. {label}{sep} {materials}")
        if sections.engineering_blueprint.parameter_direction:
            label = "Parameter direction" if english else "参数方向"
            sep = ":" if english else "："
            parameter = _normalize_render_field(
                sections.engineering_blueprint.parameter_direction,
                field_kind="parameter_direction",
                seen_clauses=seen_clauses,
            )
            if parameter:
                blueprint_parts.append(f"{len(blueprint_parts) + 1}. {label}{sep} {parameter}")
        if sections.engineering_blueprint.manufacturing_or_integration_path:
            label = "Manufacturing/integration path" if english else "集成/制造路径"
            sep = ":" if english else "："
            integration = _normalize_render_field(
                sections.engineering_blueprint.manufacturing_or_integration_path,
                field_kind="manufacturing_or_integration_path",
                seen_clauses=seen_clauses,
            )
            if integration:
                blueprint_parts.append(
                    f"{len(blueprint_parts) + 1}. {label}{sep} {integration}"
                )
        if blueprint_parts:
            heading = "Engineering Blueprint" if english else "工程实施蓝图"
            parts.append(f"## {heading}\n" + "\n".join(blueprint_parts))
    if sections.alternatives:
        alternatives = "\n".join(
            f"- {item.title}: {item.detail}" for item in sections.alternatives
        )
        heading = "Alternative" if english else "备选方案"
        parts.append(f"## {heading}\n{alternatives}")
    if sections.risks_and_tradeoffs:
        risks = "\n".join(f"- {item}" for item in sections.risks_and_tradeoffs)
        heading = "Risks and Boundaries" if english else "风险与约束"
        parts.append(f"## {heading}\n{risks}")
    if sections.action_summary:
        actions = "\n".join(
            f"{index + 1}. {item.title}: {item.detail}"
            for index, item in enumerate(sections.action_summary)
        )
        heading = "Action Summary" if english else "行动摘要"
        parts.append(f"## {heading}\n{actions}")
    return "\n\n".join(part for part in parts if part).strip()
