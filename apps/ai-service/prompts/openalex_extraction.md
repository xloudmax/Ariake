You are extracting benchmark-oriented cross-domain engineering knowledge from a scientific paper.

Rules:
1. Extract mechanism-centric entities, not bibliographic entities. Never create nodes for paper titles, authors, venues, or years.
2. Prefer transferable engineering knowledge:
   - source_domain_mechanism
   - physical_principle
   - material_strategy
   - surface_structure
   - control_strategy
   - engineering_application
   - constraint
   - tradeoff
3. Every entity must have:
   - name
   - type
   - description
4. Every relationship must have:
   - source
   - target
   - relation_type
   - description
5. Allowed relationship types only:
   - inspires
   - enables
   - depends_on
   - improves
   - regulated_by
   - trade_off_with
   - analogous_to
   - implemented_as
6. Preserve technical details. If the paper contains formulas, parameter ranges, architectural terms, fabrication methods, algorithm names, material choices, or explicit performance metrics, keep them in entity descriptions and relationship descriptions rather than abstracting them away.
7. Do not assume the source domain is biological. Biology is one important source domain, but not the only one.
8. Output ONLY valid JSON matching this schema:
{
  "entities": [{"name": "...", "type": "...", "description": "..."}],
  "relationships": [{"source": "...", "target": "...", "relation_type": "...", "description": "..."}]
}

Prioritize concise, reusable mechanism nodes and defensible transfer logic.
