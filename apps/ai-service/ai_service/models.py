from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class CrossDomainApplication(BaseModel):
    domain: str = Field(
        ..., description="Distance level: 'Close', 'Somewhat Far', or 'Distant'"
    )
    example: str = Field(..., description="The concrete application example")
    context: str = Field(..., description="The domain/field of this example")
    strategy: str = Field(
        ..., description="Actionable transfer strategy for this example"
    )


class MechanismNode(BaseModel):
    id: str = ""
    title: str
    active_ingredient: str = Field(
        ...,
        description="A concise (max 15 words) description of the mechanism including a verb.",
    )
    reasoning_trace: str = Field(
        default="",
        description="A brief explanation of why this mechanism is necessary for the parent node.",
    )
    applications: list[CrossDomainApplication] = Field(default_factory=list)
    children: list["MechanismNode"] | None = None


class LLMMechanismNode(BaseModel):
    id: str
    title: str
    active_ingredient: str
    reasoning_trace: str = ""
    parentId: str | None = None
    applications: list[CrossDomainApplication] = Field(default_factory=list)


class LLMMechanismEdge(BaseModel):
    source: str
    target: str


class LLMMechanismTree(BaseModel):
    root_mechanism: str
    nodes: list[LLMMechanismNode]
    edges: list[LLMMechanismEdge]


class GenerateTreeRequest(BaseModel):
    query: str


class ReactFlowNodeData(BaseModel):
    title: str
    active_ingredient: str
    reasoning_trace: str = ""
    level: int
    applications: list[CrossDomainApplication] = Field(default_factory=list)
    is_critical: bool = False


class ReactFlowNode(BaseModel):
    id: str
    type: str = "customMechanismNode"
    data: ReactFlowNodeData
    position: dict[str, float] = {"x": 0, "y": 0}


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    is_critical: bool = False


class TreeMetadata(BaseModel):
    query: str
    root_mechanism: str
    max_depth: int = 0
    average_branching_factor: float = 0.0
    leaf_count: int = 0
    orphan_count: int = 0


class FlattenedMechanismResponse(BaseModel):
    tree_metadata: TreeMetadata
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]


class Entity(BaseModel):
    name: str = Field(..., description="The name of the entity.")
    type: str = Field(
        ..., description="The type of the entity (e.g., framework, concept, language)."
    )
    description: str = Field(..., description="A clear description of the entity.")


class Relationship(BaseModel):
    source: str = Field(..., description="Name of the source entity.")
    target: str = Field(..., description="Name of the target entity.")
    relation_type: str = Field(
        ..., description="The type of relationship (e.g., implements, depends_on)."
    )
    description: str = Field(..., description="Brief description of the relationship.")


class KnowledgeExtractionResponse(BaseModel):
    entities: list[Entity]
    relationships: list[Relationship]


class KnowledgeExtractionRequest(BaseModel):
    text: str
    manual_data: dict[str, Any] | None = None
    source_metadata: dict[str, Any] | None = None


class EmbeddingRequest(BaseModel):
    text: str


class EmbeddingResponse(BaseModel):
    embedding: list[float]


class GlobalSearchRequest(BaseModel):
    query: str
    search_mode: Literal["hybrid", "vector"] = "hybrid"
    active_ingredients: str = ""
    bypass_critic: bool = False


class MechanismCheckSection(BaseModel):
    body: str
    verdict: Literal["sound", "warning", "fail"] | None = None


class FeasibilityCheckSection(BaseModel):
    body: str
    verdict: Literal["high", "medium", "low"] | None = None


class SearchDiagnosticsSection(BaseModel):
    intent_type: Literal["divergent", "convergent"] = "divergent"
    recommended_vector_weight: float = 0.7
    barrier_triggered: bool = False


class SupportingCommunity(BaseModel):
    community_id: int
    title: str
    summary: str
    score: float = 0.0
    representative_posts: list[str] = Field(default_factory=list)
    top_terms: list[str] = Field(default_factory=list)
    summary_confidence: float = 0.0


class SupportingPost(BaseModel):
    title: str
    excerpt: str = ""
    slug: str | None = None
    community_id: int | None = None
    source: str = "community_summary"


class RetrievalDiagnostics(BaseModel):
    search_mode: Literal["hybrid", "vector"] = "hybrid"
    communities_considered: int = 0
    communities_retained: int = 0
    bridge_strength: Literal["strong", "weak"] = "strong"
    ranking_formula: str = ""


class GlobalInsightSection(BaseModel):
    summary: str
    details: list[str] = Field(default_factory=list)


class ActionSummaryItem(BaseModel):
    title: str
    detail: str
    priority: Literal["P1", "P2", "P3"] = "P2"
    lane: Literal["立即执行", "本轮重构", "后续清理"] = "本轮重构"


class DecisionAlternative(BaseModel):
    title: str
    detail: str


class EngineeringBlueprint(BaseModel):
    core_structure: str = ""
    materials_or_components: str = ""
    parameter_direction: str = ""
    manufacturing_or_integration_path: str = ""


class TransferMapping(BaseModel):
    baseline_backbone: str = ""
    bottleneck: str = ""
    selected_transfer_mechanism: str = ""
    engineering_role: Literal[
        "surface enhancement",
        "control refinement",
        "material substitution",
        "failure mitigation",
    ] | None = None
    translated_effect: str = ""
    implementation_slot: str = ""
    validation_hook: str = ""


class EngineeringDetailPack(BaseModel):
    component_choices: str = ""
    dimension_windows: str = ""
    interaction_mechanisms: str = ""
    integration_sequence: str = ""
    validation_protocols: str = ""
    failure_boundaries: str = ""
    material_system: str = ""
    material_grade_or_family: str = ""
    cure_or_forming_window: str = ""
    surface_preparation: str = ""
    dosage_or_mix_window: str = ""
    state_variables: str = ""
    message_schema: str = ""
    update_cadence: str = ""
    trigger_conditions: str = ""
    fallback_policy: str = ""
    application_zone: str = ""
    scaling_metrics: str = ""
    system_level_constraints: str = ""
    validation_stack: str = ""
    pad_interface_stack: str = ""
    load_distribution_mechanism: str = ""
    attach_sequence: str = ""
    detach_sequence: str = ""
    environmental_boundaries: str = ""


class RouteSelection(BaseModel):
    selected_main_route: str = ""
    rejected_routes: list[str] = Field(default_factory=list)
    route_rationale: str = ""
    transfer_enhancement_slot: str = ""


class EngineeringFactCard(BaseModel):
    mechanism: str = ""
    component_or_material: str = ""
    parameter_or_range: str = ""
    validation_method: str = ""
    failure_boundary: str = ""
    source_hint: str = ""


class GlobalInsightSections(BaseModel):
    thinking_summary: list[str] = Field(default_factory=list)
    mechanism_check: MechanismCheckSection | None = None
    feasibility_check: FeasibilityCheckSection | None = None
    search_diagnostics: SearchDiagnosticsSection | None = None
    global_insight: GlobalInsightSection | None = None
    primary_recommendation: str = ""
    why_this_path: str = ""
    engineering_blueprint: EngineeringBlueprint | None = None
    delivery_profile: str = ""
    transfer_mapping: TransferMapping | None = None
    engineering_detail_pack: EngineeringDetailPack | None = None
    route_selection: RouteSelection | None = None
    engineering_fact_cards: list[EngineeringFactCard] = Field(default_factory=list)
    detail_density_check: list[str] = Field(default_factory=list)
    review_answer: str = ""
    alternatives: list[DecisionAlternative] = Field(default_factory=list)
    risks_and_tradeoffs: list[str] = Field(default_factory=list)
    action_summary: list[ActionSummaryItem] = Field(default_factory=list)


class GlobalSearchResponse(BaseModel):
    answer: str
    sections: GlobalInsightSections | None = None
    format_version: Literal["v2"] = "v2"
    format_kind: Literal["structured_json", "legacy_text"] = "legacy_text"
    sanitized: bool = False
    is_draft: bool = False
    supporting_communities: list[SupportingCommunity] = Field(default_factory=list)
    supporting_posts: list[SupportingPost] = Field(default_factory=list)
    retrieval_diagnostics: RetrievalDiagnostics | None = None


MechanismNode.model_rebuild()
