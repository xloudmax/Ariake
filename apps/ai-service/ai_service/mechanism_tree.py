from __future__ import annotations

import hashlib
import json
from typing import Any

from .config import logger
from .llm import client_configured, get_gemini_response, stream_gemini_response
from .models import (
    CrossDomainApplication,
    FlattenedMechanismResponse,
    MechanismNode,
    ReactFlowEdge,
    ReactFlowNode,
    ReactFlowNodeData,
    TreeMetadata,
)
from .prompts import MECHANISM_TREE_PROMPT


def get_fallback_mock_data(query: str) -> FlattenedMechanismResponse:
    root_title = f"Mechanism: {query}"
    root_id = "mock-root"

    nodes = [
        ReactFlowNode(
            id=root_id,
            data=ReactFlowNodeData(
                title=root_title,
                active_ingredient="Core coordinating mechanism for efficiency",
                level=1,
                applications=[
                    CrossDomainApplication(
                        domain="Close",
                        context="Domestic Laundry",
                        example="Optimizing detergent timing",
                        strategy="Apply precise dose targeting to reduce waste",
                    ),
                    CrossDomainApplication(
                        domain="Distant",
                        context="Aerospace Cleaning",
                        example="Ultrasonic decontamination of sensors",
                        strategy="Use ultrasonic vibration principles for fabric stain removal",
                    ),
                ],
            ),
            position={"x": 250, "y": 0},
        ),
        ReactFlowNode(
            id="mock-child-1",
            data=ReactFlowNodeData(
                title="Core Process",
                active_ingredient="Executing primary transformation",
                level=2,
                applications=[],
            ),
            position={"x": 500, "y": -50},
        ),
        ReactFlowNode(
            id="mock-child-2",
            data=ReactFlowNodeData(
                title="Regulatory Feedback",
                active_ingredient="Maintaining system homeostasis",
                level=2,
                applications=[],
            ),
            position={"x": 500, "y": 50},
        ),
    ]
    edges = [
        ReactFlowEdge(id=f"edge-{root_id}-c1", source=root_id, target="mock-child-1"),
        ReactFlowEdge(id=f"edge-{root_id}-c2", source=root_id, target="mock-child-2"),
    ]
    return FlattenedMechanismResponse(
        tree_metadata=TreeMetadata(query=query, root_mechanism=root_title),
        nodes=nodes,
        edges=edges,
    )


def generate_deterministic_id(path: str, title: str) -> str:
    content = f"{path}:{title.strip().lower()}"
    hash_val = hashlib.md5(content.encode()).hexdigest()[:8]
    slug = "".join(char if char.isalnum() else "-" for char in title.lower())[
        :20
    ].strip("-")
    return f"mech-{hash_val}-{slug}"


def analyze_tree_topology(nodes: list[ReactFlowNode], edges: list[ReactFlowEdge], orphan_count: int = 0) -> dict[str, Any]:
    if not nodes:
        return {
            "max_depth": 0,
            "average_branching_factor": 0.0,
            "leaf_count": 0,
            "orphan_count": orphan_count,
        }
        
    max_depth = max(node.data.level for node in nodes)
    
    # Calculate branching factor
    # Count how many children each node has
    children_counts = {node.id: 0 for node in nodes}
    for edge in edges:
        if edge.source in children_counts:
            children_counts[edge.source] += 1
            
    # Nodes with > 0 children are non-leaf nodes
    non_leaf_nodes = [count for count in children_counts.values() if count > 0]
    avg_branching_factor = sum(non_leaf_nodes) / len(non_leaf_nodes) if non_leaf_nodes else 0.0
    
    # Leaf nodes are those with 0 children
    leaf_count = sum(1 for count in children_counts.values() if count == 0)
    
    return {
        "max_depth": max_depth,
        "average_branching_factor": round(avg_branching_factor, 2),
        "leaf_count": leaf_count,
        "orphan_count": orphan_count,
    }


def flatten_tree(
    node: MechanismNode,
    level: int = 1,
    path: str = "root",
    nodes: list[ReactFlowNode] | None = None,
    edges: list[ReactFlowEdge] | None = None,
) -> dict[str, list[ReactFlowNode] | list[ReactFlowEdge]]:
    nodes = nodes or []
    edges = edges or []

    current_id = generate_deterministic_id(path, node.title)
    
    # Simple heuristic for critical path: 
    # If the node has a "Distant" application, we consider it critical
    is_critical = any(app.domain.lower() == "distant" for app in node.applications)
    
    nodes.append(
        ReactFlowNode(
            id=current_id,
            data=ReactFlowNodeData(
                title=node.title,
                active_ingredient=node.active_ingredient,
                reasoning_trace=getattr(node, "reasoning_trace", ""),
                level=level,
                applications=node.applications,
                is_critical=is_critical,
            ),
            position={"x": level * 250, "y": len(nodes) * 100},
        )
    )

    if node.children:
        for child in node.children:
            child_id = generate_deterministic_id(f"{path}/{current_id}", child.title)
            child_is_critical = any(app.domain.lower() == "distant" for app in child.applications)
            edges.append(
                ReactFlowEdge(
                    id=f"edge-{current_id}-{child_id}",
                    source=current_id,
                    target=child_id,
                    is_critical=child_is_critical and is_critical
                )
            )
            flatten_tree(child, level + 1, f"{path}/{current_id}", nodes, edges)

    return {"nodes": nodes, "edges": edges}


def export_tree_to_dot(nodes: list[ReactFlowNode], edges: list[ReactFlowEdge]) -> str:
    lines = [
        'digraph MechanismTree {',
        '  node [shape=box, style=filled, fillcolor=white, fontname="Helvetica,Arial,sans-serif"];',
        '  edge [fontname="Helvetica,Arial,sans-serif"];',
        '  rankdir=TB;',
    ]
    
    for node in nodes:
        title = node.data.title.replace('"', '\\"').replace('\n', ' ')
        ingredient = node.data.active_ingredient.replace('"', '\\"').replace('\n', ' ')
        label = f"{title}\\n({ingredient})"
        
        node_style = ""
        if node.data.is_critical:
            node_style = ', color="red", penwidth=2'
            
        lines.append(f'  "{node.id}" [label="{label}"{node_style}];')
        
    for edge in edges:
        edge_style = ""
        if edge.is_critical:
            edge_style = ' [color="red", penwidth=2]'
            
        lines.append(f'  "{edge.source}" -> "{edge.target}"{edge_style};')
        
    lines.append('}')
    return '\n'.join(lines)


def _sse(payload: dict[str, Any] | str) -> str:
    if isinstance(payload, str):
        return f"data: {payload}\n\n"
    return f"data: {json.dumps(payload)}\n\n"


def _iter_flattened_response_events(response: FlattenedMechanismResponse):
    yield _sse(
        {
            "type": "metadata",
            "query": response.tree_metadata.query,
            "root_mechanism": response.tree_metadata.root_mechanism,
        }
    )
    for node in response.nodes:
        yield _sse({"type": "node", "data": node.model_dump()})
    for edge in response.edges:
        yield _sse({"type": "edge", "data": edge.model_dump()})
    yield _sse("[DONE]")


def _resolve_stream_node(
    raw_node: dict[str, Any],
    *,
    path_by_raw_id: dict[str, str],
    deterministic_id_by_raw_id: dict[str, str],
    level_by_raw_id: dict[str, int],
    node_index: int,
) -> tuple[dict[str, Any], dict[str, Any] | None] | None:
    raw_id = obj_id = raw_node.get("id")
    title = raw_node.get("title")
    if not raw_id or not title:
        return None

    parent_raw_id = raw_node.get("parentId")
    if parent_raw_id:
        parent_id = deterministic_id_by_raw_id.get(parent_raw_id)
        parent_path = path_by_raw_id.get(parent_raw_id)
        parent_level = level_by_raw_id.get(parent_raw_id)
        if parent_id is None or parent_path is None or parent_level is None:
            # Handle orphan nodes by attaching to a virtual root or treating as root
            logger.warning("Orphan node detected in stream: %s. Missing parent: %s", title, parent_raw_id)
            parent_id = None
            current_path = "root"
            level = 1
        else:
            current_path = f"{parent_path}/{parent_id}"
            level = parent_level + 1
    else:
        parent_id = None
        current_path = "root"
        level = 1

    deterministic_id = generate_deterministic_id(current_path, title)
    path_by_raw_id[obj_id] = current_path
    deterministic_id_by_raw_id[obj_id] = deterministic_id
    level_by_raw_id[obj_id] = level
    
    applications = [
        item.model_dump()
        for item in _normalize_applications(
            raw_node.get("applications", [])
        )
    ]
    
    is_critical = any(app.get("domain", "").lower() == "distant" for app in applications)

    node_payload = {
        "type": "node",
        "data": {
            "id": deterministic_id,
            "type": "customMechanismNode",
            "data": {
                "title": title,
                "active_ingredient": raw_node.get("active_ingredient", ""),
                "reasoning_trace": raw_node.get("reasoning_trace", ""),
                "level": level,
                "applications": applications,
                "is_critical": is_critical,
            },
            "position": {"x": level * 250, "y": node_index * 100},
        },
    }

    edge_payload = None
    if parent_id is not None:
        edge_payload = {
            "type": "edge",
            "data": {
                "id": f"edge-{parent_id}-{deterministic_id}",
                "source": parent_id,
                "target": deterministic_id,
                "is_critical": is_critical
            },
        }
    return node_payload, edge_payload


def _flush_pending_stream_nodes(
    pending_nodes: list[dict[str, Any]],
    *,
    path_by_raw_id: dict[str, str],
    deterministic_id_by_raw_id: dict[str, str],
    level_by_raw_id: dict[str, int],
    emitted_edge_ids: set[str],
    next_node_index: int,
) -> tuple[list[str], int]:
    emitted: list[str] = []
    progress = True
    while progress:
        progress = False
        for raw_node in pending_nodes[:]:
            resolved = _resolve_stream_node(
                raw_node,
                path_by_raw_id=path_by_raw_id,
                deterministic_id_by_raw_id=deterministic_id_by_raw_id,
                level_by_raw_id=level_by_raw_id,
                node_index=next_node_index,
            )
            if resolved is None:
                continue
            node_payload, edge_payload = resolved
            emitted.append(_sse(node_payload))
            next_node_index += 1
            if (
                edge_payload is not None
                and edge_payload["data"]["id"] not in emitted_edge_ids
            ):
                emitted_edge_ids.add(edge_payload["data"]["id"])
                emitted.append(_sse(edge_payload))
            pending_nodes.remove(raw_node)
            progress = True
    return emitted, next_node_index


def _normalize_applications(raw_apps: list[dict]) -> list[CrossDomainApplication]:
    valid_apps: list[CrossDomainApplication] = []
    for app in raw_apps:
        if isinstance(app, dict):
            valid_apps.append(
                CrossDomainApplication(
                    domain=app.get("domain")
                    or app.get("example", "Distance Not Specified"),
                    example=app.get("example", "Unknown Example"),
                    context=app.get("context", "Unknown Context"),
                    strategy=app.get("strategy")
                    or app.get("Transfer Strategy")
                    or "No strategy provided",
                )
            )
    return valid_apps


def parse_mechanism_tree_content(
    query: str, content: str
) -> FlattenedMechanismResponse:
    flat_nodes: list[dict] = []
    root_mechanism = "Analyzing..."

    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("```"):
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if obj.get("type") == "metadata":
            root_mechanism = obj.get("root_mechanism", root_mechanism)
        elif obj.get("type") == "node":
            flat_nodes.append(obj)

    node_map: dict[str, MechanismNode] = {}
    for node in flat_nodes:
        node_map[node["id"]] = MechanismNode(
            id=node["id"],
            title=node["title"],
            active_ingredient=node.get("active_ingredient", ""),
            reasoning_trace=node.get("reasoning_trace", ""),
            applications=_normalize_applications(node.get("applications", [])),
            children=[],
        )

    root = None
    orphan_count = 0
    for node in flat_nodes:
        parent_id = node.get("parentId")
        if parent_id and parent_id in node_map:
            node_map[parent_id].children.append(node_map[node["id"]])
        elif parent_id and parent_id not in node_map:
            orphan_count += 1
            # Add to root to prevent data loss
            if root:
                root.children.append(node_map[node["id"]])
            else:
                root = node_map[node["id"]]
        elif not parent_id:
            root = node_map[node["id"]]

    if root is None and node_map:
        root = list(node_map.values())[0]

    if root is None:
        return FlattenedMechanismResponse(
            tree_metadata=TreeMetadata(query=query, root_mechanism=root_mechanism),
            nodes=[],
            edges=[],
        )

    flattened = flatten_tree(root)
    topology = analyze_tree_topology(flattened["nodes"], flattened["edges"], orphan_count)
    
    return FlattenedMechanismResponse(
        tree_metadata=TreeMetadata(
            query=query, 
            root_mechanism=root_mechanism,
            max_depth=topology["max_depth"],
            average_branching_factor=topology["average_branching_factor"],
            leaf_count=topology["leaf_count"],
            orphan_count=topology["orphan_count"]
        ),
        nodes=flattened["nodes"],
        edges=flattened["edges"],
    )


async def generate_mechanism_tree_response(query: str) -> FlattenedMechanismResponse:
    logger.info("Received tree query: %s", query)
    if not client_configured():
        return get_fallback_mock_data(query)

    content = await get_gemini_response(
        prompt=f"Query: {query}",
        system_instruction=MECHANISM_TREE_PROMPT,
        json_mode=False,
        task="mechanism_tree",
    )
    return parse_mechanism_tree_content(query, content)


async def stream_mechanism_tree_events(query: str):
    logger.info("Received streaming tree query: %s", query)
    if not client_configured():
        for event in _iter_flattened_response_events(get_fallback_mock_data(query)):
            yield event
        return

    buffer = ""
    pending_nodes: list[dict[str, Any]] = []
    path_by_raw_id: dict[str, str] = {}
    deterministic_id_by_raw_id: dict[str, str] = {}
    level_by_raw_id: dict[str, int] = {}
    emitted_edge_ids: set[str] = set()
    next_node_index = 0
    async for text in stream_gemini_response(
        prompt=f"Query: {query}",
        system_instruction=MECHANISM_TREE_PROMPT,
        json_mode=True,
        task="mechanism_tree",
    ):
        buffer += text or ""
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            line = line.strip()
            if not line or line.startswith("```"):
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("type") == "metadata":
                yield _sse(
                    {
                        "type": "metadata",
                        "query": query,
                        "root_mechanism": obj.get("root_mechanism", "Analyzing..."),
                    }
                )
            elif obj.get("type") == "node":
                pending_nodes.append(obj)
                emitted, next_node_index = _flush_pending_stream_nodes(
                    pending_nodes,
                    path_by_raw_id=path_by_raw_id,
                    deterministic_id_by_raw_id=deterministic_id_by_raw_id,
                    level_by_raw_id=level_by_raw_id,
                    emitted_edge_ids=emitted_edge_ids,
                    next_node_index=next_node_index,
                )
                for event in emitted:
                    yield event

    for raw_node in pending_nodes:
        raw_node.pop("parentId", None)
    emitted, next_node_index = _flush_pending_stream_nodes(
        pending_nodes,
        path_by_raw_id=path_by_raw_id,
        deterministic_id_by_raw_id=deterministic_id_by_raw_id,
        level_by_raw_id=level_by_raw_id,
        emitted_edge_ids=emitted_edge_ids,
        next_node_index=next_node_index,
    )
    for event in emitted:
        yield event

    yield _sse("[DONE]")
