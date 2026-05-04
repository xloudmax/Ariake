# AI Service - Cross-Domain Reasoning Engine

## Project Overview
This service is the reasoning sidecar for the C404 project. It implements a
mechanism-first cross-domain reasoning stack built around:

- **MTGCR / DRR:** tree-guided mechanism decomposition and retrieval
- **GraphRAG:** community-level search over a cross-domain knowledge graph
- **Critique and refinement:** converting retrieved evidence into actionable engineering guidance

The runtime, prompts, and benchmark tooling should be written for general
**source-domain mechanisms -> target engineering problem** transfer. Specific
application scenarios are allowed, but they should not redefine the default
system framing.

## Core Architecture
1. **Mechanism Tree Engine**
   - decomposes queries into functional mechanisms and active ingredients
   - organizes reasoning by transferable function rather than topic labels
2. **Cross-Domain Knowledge Graph**
   - stores entities, relationships, communities, summaries, and technical details
   - supports community-level retrieval and evidence packing
3. **Asymmetric Compute Routing**
   - lighter model for routing/drafting
   - stronger model for critique/refinement
4. **Mechanism-First Output Layer**
   - prioritizes one primary recommendation
   - preserves formulas, parameters, algorithms, materials, and manufacturing details

## Engineering Constraints
- Prefer mechanism-first language over any domain-specific framing.
- Preserve technical details at every stage; do not collapse formulas or
  parameter ranges into slogans.
- Keep ultra-divergence barriers intact. If there is no defensible physical,
  structural, or functional homology, the system should reject the transfer.
- Output should emphasize engineering actionability: structure, materials,
  parameters, manufacturing path, risks, and alternatives.

## Development Notes
- **Model configuration:** keep task-level model IDs and temperatures in
  `model_config.yaml`.
- **Prompts:** keep complex prompt files in `prompts/`.
- **Knowledge persistence:** use `upsert_knowledge` for deduplicated writes and
  embedding generation.
- **Legacy compatibility:** older stored communities may still contain the
  `sparks` field. New writes should use `transfer_insights`; fallback support
  for `sparks` is legacy-only.

## Key Files
- `main.py`: FastAPI entrypoint
- `ai_service/`: runtime package
- `model_config.yaml`: model and task routing
- `prompts/`: XML/Markdown prompts
- `scripts/`: ingestion, benchmark, and analysis utilities
- `doc/`: archived drafts and project documentation
