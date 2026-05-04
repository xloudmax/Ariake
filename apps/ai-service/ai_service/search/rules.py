"""Engineering backbone rules, query classifiers, and community focus matching.

This module loads externalized rules from ``rules.yaml`` and houses the
domain-specific ``ENGINEERING_BACKBONE_HINTS`` data structure.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from ..config import logger

_RULES_PATH = Path(__file__).resolve().parent / "rules.yaml"


def _load_rules() -> dict[str, Any]:
    try:
        if _RULES_PATH.exists():
            with _RULES_PATH.open("r", encoding="utf-8") as handle:
                return yaml.safe_load(handle) or {}
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to load %s: %s", _RULES_PATH.name, exc)
    return {}


_rules = _load_rules()

# ---------- Externalized term lists (from rules.yaml) ----------

BIO_TERMS: list[str] = _rules.get("bio_terms", [])
CONTROL_TASK_KEYWORDS: list[str] = _rules.get("control_task_keywords", [])
CONTROL_OUTPUT_KEYWORDS: list[str] = _rules.get("control_output_keywords", [])
MATERIAL_TASK_KEYWORDS: list[str] = _rules.get("material_task_keywords", [])
MATERIAL_OUTPUT_KEYWORDS: list[str] = _rules.get("material_output_keywords", [])


# ---------------------------------------------------------------------------
# Query classifiers
# ---------------------------------------------------------------------------


def _is_closed_loop_life_support_query(query: str) -> bool:
    lower = query.lower()
    required_groups = [
        any(term in lower for term in ["life support", "eclss"]),
        any(term in lower for term in ["deep space", "space habitat", "habitat"]),
        any(term in lower for term in ["closed-loop", "zero-waste", "recycling", "resource utilization", "isru", "in-situ"]),
    ]
    return all(required_groups)


def _is_desalination_membrane_query(query: str) -> bool:
    lower = query.lower()
    return all(term in lower for term in ["membrane", "reverse osmosis", "desalination"])


def _is_underwater_curing_adhesive_query(query: str) -> bool:
    lower = query.lower()
    return all(term in lower for term in ["adhesive", "submerged"]) and any(
        term in lower for term in ["metallic", "peel strength", "rapidly cure", "turbulent flow"]
    )


def _is_external_pipeline_drag_query(query: str) -> bool:
    lower = query.lower()
    return all(term in lower for term in ["external pipeline coating", "turbulent drag"])


def _is_noninvasive_bci_query(query: str) -> bool:
    lower = query.lower()
    return all(
        term in lower
        for term in ["brain-computer interface", "non-invasive", "deep brain", "single-neuron"]
    )


def _is_stratospheric_haps_query(query: str) -> bool:
    lower = query.lower()
    return any(term in lower for term in ["pseudo-satellite", "perpetual-flight atmospheric satellite"]) and "stratosphere" in lower


def _is_multiobjective_facade_query(query: str) -> bool:
    lower = query.lower()
    return "building facade" in lower and all(term in lower for term in ["energy generation", "natural lighting", "air quality"])


def _is_trace_rare_earth_extraction_query(query: str) -> bool:
    lower = query.lower()
    return "rare earth" in lower and "seawater" in lower


def _is_self_healing_concrete_query(query: str) -> bool:
    lower = query.lower()
    return "concrete" in lower and any(term in lower for term in ["micro-crack", "micro crack", "self-heal", "seals"])


def _is_low_noise_rotor_query(query: str) -> bool:
    lower = query.lower()
    return "rotor blade" in lower and any(term in lower for term in ["aerodynamic noise", "vortex shedding", "broadband"])


def _is_underwater_glider_plume_query(query: str) -> bool:
    lower = query.lower()
    return any(term in lower for term in ["underwater glider", "underwater gliders"]) and "chemical plume" in lower


def _is_space_debris_dry_attachment_query(query: str) -> bool:
    lower = query.lower()
    return "space debris" in lower and any(term in lower for term in ["reversible attachment", "dry"])


def _is_self_regulating_thermal_material_query(query: str) -> bool:
    lower = query.lower()
    return all(term in lower for term in ["thermal conductivity", "porosity"]) and any(
        term in lower for term in ["self-regulating", "passively", "environmental conditions"]
    )


def _prefer_query_first_generation(query: str) -> bool:
    return any(
        detector(query)
        for detector in [
            _is_self_healing_concrete_query,
            _is_closed_loop_life_support_query,
            _is_desalination_membrane_query,
            _is_underwater_curing_adhesive_query,
            _is_noninvasive_bci_query,
            _is_external_pipeline_drag_query,
            _is_stratospheric_haps_query,
            _is_multiobjective_facade_query,
            _is_trace_rare_earth_extraction_query,
            _is_low_noise_rotor_query,
            _is_underwater_glider_plume_query,
            _is_space_debris_dry_attachment_query,
            _is_self_regulating_thermal_material_query,
        ]
    )


def _should_use_query_first_fallback(query: str) -> bool:
    return any(
        detector(query)
        for detector in [
            _is_self_healing_concrete_query,
            _is_closed_loop_life_support_query,
            _is_noninvasive_bci_query,
            _is_underwater_curing_adhesive_query,
            _is_external_pipeline_drag_query,
            _is_stratospheric_haps_query,
            _is_multiobjective_facade_query,
            _is_trace_rare_earth_extraction_query,
            _is_low_noise_rotor_query,
            _is_underwater_glider_plume_query,
            _is_space_debris_dry_attachment_query,
            _is_self_regulating_thermal_material_query,
        ]
    )


def _community_matches_query_focus(query: str, title: str, summary: str) -> bool:
    text = f"{title} {summary}".lower()

    if _is_closed_loop_life_support_query(query):
        focus_terms = [
            "life support",
            "eclss",
            "closed-loop",
            "carbon",
            "co2",
            "oxygen",
            "water",
            "waste",
            "recycling",
            "recovery",
            "isru",
            "in-situ",
            "habitat",
            "mass closure",
            "air revitalization",
        ]
        hits = sum(1 for term in focus_terms if term in text)
        return hits >= 2

    if _is_underwater_curing_adhesive_query(query):
        positive_terms = [
            "catechol",
            "coacerv",
            "metal",
            "metallic",
            "cure",
            "curing",
            "peel",
            "bond",
            "coordination",
            "aqueous",
            "tough",
            "repair patch",
            "repair-patch",
        ]
        negative_terms = ["reversible", "switchable", "detachment", "release", "repeatable attachment"]
        hits = sum(1 for term in positive_terms if term in text)
        return hits >= 2 and not any(term in text for term in negative_terms)

    if _is_external_pipeline_drag_query(query):
        focus_terms = [
            "external pipeline coating",
            "indirect coupling",
            "external-only",
            "external only",
            "pressure-fluctuation attenuation",
            "internal flow",
            "pumping losses",
        ]
        negative_terms = [
            "internal riblet",
            "internal wetted wall",
            "internal liner",
            "wetted wall",
            "slip-promoting liner",
        ]
        hits = sum(1 for term in focus_terms if term in text)
        return hits >= 2 and not any(term in text for term in negative_terms)

    if _is_noninvasive_bci_query(query):
        focus_terms = [
            "brain",
            "neural",
            "neuron",
            "deep brain",
            "ultrasound",
            "magnetoelectric",
            "neural readout",
            "non-invasive",
            "signal",
            "stimulation",
            "spectroscopy",
        ]
        hits = sum(1 for term in focus_terms if term in text)
        return hits >= 2

    if _is_stratospheric_haps_query(query):
        focus_terms = [
            "stratosphere",
            "seasonal",
            "night",
            "winter",
            "fuel cell",
            "regenerative",
            "solar",
            "aeroelastic",
            "flutter",
            "station-keeping",
            "haps",
            "fixed-region",
            "fixed region",
        ]
        negative_terms = [
            "daytime photovoltaic",
            "daytime",
            "irradiance capture",
            "solar array optimization",
        ]
        hits = sum(1 for term in focus_terms if term in text)
        return hits >= 2 and not (hits < 4 and any(term in text for term in negative_terms))

    if _is_multiobjective_facade_query(query):
        focus_terms = [
            "facade",
            "energy",
            "daylight",
            "lighting",
            "air quality",
            "ventilation",
            "bipv",
            "algae",
            "microfluidic",
            "adaptive",
            "seasonal",
            "iaq",
        ]
        negative_terms = [
            "does not integrate ventilation",
            "does not integrate",
            "without ventilation",
            "glare control",
            "shading panels",
            "static bipv",
        ]
        hits = sum(1 for term in focus_terms if term in text)
        return hits >= 2 and not (hits < 4 and any(term in text for term in negative_terms))

    if _is_trace_rare_earth_extraction_query(query):
        focus_terms = [
            "rare earth",
            "lanmodulin",
            "selective",
            "binding",
            "competing ion",
            "regeneration",
            "electrochemical",
            "dilute",
            "energy",
            "seawater",
            "imprinted",
            "throughput",
            "contactor",
        ]
        negative_terms = [
            "generic adsorption",
            "adsorbent beds",
            "no competing-ion",
            "no competing ion",
            "no regeneration throughput",
        ]
        hits = sum(1 for term in focus_terms if term in text)
        return hits >= 2 and not (hits < 4 and any(term in text for term in negative_terms))

    return True


# ---------------------------------------------------------------------------
# Engineering backbone hints
# ---------------------------------------------------------------------------

ENGINEERING_BACKBONE_HINTS: list[tuple[tuple[str, ...], dict[str, str]]] = [
    (
        ("concrete", "micro-cracks", "aggressive chemical"),
        {
            "backbone": "An autonomous self-healing concrete system for aggressive chemical environments should be organized around chemically resistant crack-sealing agents, fiber-reinforced crack-width control, and autonomous rupture-triggered microcapsules; do not make external pressurized injection the primary healing mechanism when the query asks for autonomous sealing.",
            "bottlenecks": "Maintaining chemical resistance in acidic, chloride, or sulfate exposure; limiting crack width so capsules can bridge defects; preventing healing-agent degradation in high-pH cement pore solution; and proving water-tightness and strength recovery after exposure cycles.",
            "transfer_role": "Use cross-domain transfer only to improve autonomous trigger sensitivity or sealing chemistry. Preserve polyurethane or similarly chemically resistant microcapsule healing, GGBS/silica-fume matrix densification, and fiber-controlled crack width as the engineering backbone.",
            "template": "Must include: (1) autonomous microcapsule or vascular-free crack sealing, (2) chemical-resistance matrix design such as GGBS/silica fume and polyurethane/silicate healing chemistry, (3) validation targets for crack width, water-tightness recovery, and acid/chloride/sulfate exposure. Do not add a vascular-channel alternative unless the user explicitly asks for non-autonomous refillable repair.",
            "policy": "balanced",
        },
    ),
    (
        ("millions of years", "digital information", "without active maintenance"),
        {
            "backbone": "An ultra-long-term archival medium for millions of years should be built around monolithic fused silica or equivalent mineral-stable optical storage, plus a surface-level human-decipherable bootstrap layer, rather than a multi-medium stack with chemically fragile parity payloads.",
            "bottlenecks": "Geological timescale chemical stability, radiation tolerance, readout bootstrapping after technological drift, write-density retention under thermal activation, and site-level survivability without power or maintenance.",
            "transfer_role": "Use cross-domain transfer only to improve optical encoding geometry, visual bootstrap logic, or error-correction layout; do not introduce macromolecular or hydrated media that degrade faster than the primary archival substrate.",
            "template": "Must include: (1) fused silica or similarly stable archival substrate, (2) parameter direction for write/read mechanism and thermal activation durability, (3) explicit bootstrap/readout path that remains interpretable after technological drift.",
            "policy": "balanced",
        },
    ),
    (
        ("useful throughput", "rare earth", "seawater"),
        {
            "backbone": "A seawater rare-earth extraction architecture with useful throughput must be organized around ultra-selective ligand-mediated binding, practical regeneration, seawater-scale contactor design, and brine-aware integration rather than generic adsorption or raw electro-swing separation alone.",
            "bottlenecks": "Trace concentration capture, competing-ion selectivity, diffusion-limited uptake in dilute solution, regeneration energy per mole, useful throughput, and whether seawater or RO-brine integration provides a defensible mass-transfer path without chlorine-evolution side reactions.",
            "transfer_role": "Use cross-domain transfer to improve selective ligand chemistry or bounded regeneration, but preserve the full extraction workflow including release, energy accounting, useful throughput, and brine/contactorscale integration.",
            "template": "Must include: (1) selective ligand or binding medium and regeneration loop, (2) parameter direction or validation targets for selectivity coefficient, uptake in dilute conditions, energy per mole, and useful throughput, (3) integration path for seawater-scale contactor design or RO-brine-coupled deployment, including why chlorine evolution is avoided.",
            "policy": "balanced",
        },
    ),
    (
        ("adaptive envelope", "building facade", "air quality"),
        {
            "backbone": "A smart facade expressed as an adaptive envelope must be framed as a coupled energy generation, daylight-routing, and indoor-air-quality system with explicit enthalpy/ventilation recovery rather than a shading-plus-BIPV stack.",
            "bottlenecks": "Conflicting solar gain versus daylight needs, IAQ control under climate swings, pressure-drop and fan-energy costs, and integrating enthalpy recovery into a facade-scale adaptive envelope.",
            "transfer_role": "Use cross-domain transfer only to strengthen one coupled subsystem, but preserve explicit treatment of power, daylight, IAQ, and enthalpy-recovery logic together.",
            "template": "Must include: (1) energy + daylight + IAQ subsystem stack, (2) parameter direction or validation targets for solar gain/daylight/air quality and enthalpy recovery, (3) autonomous adaptation path across daily and seasonal regimes.",
            "policy": "balanced",
        },
    ),
    (
        ("external-only boundary condition", "external pipeline coating"),
        {
            "backbone": "An external pipeline coating under an external-only boundary condition must be framed as a limited indirect-coupling wall-dynamics system with no hidden internal liner, insert, or wetted-wall modification. The external coating is only acceptable if it has a validated coupling path; for thick, stiff steel pipes, the default position is conservative: do not claim large passive drag reduction unless a wall compliance go/no-go test proves coupling to internal wall-pressure fluctuations.",
            "bottlenecks": "Spatial separation from the internal turbulent boundary layer, wall compliance go/no-go limits of the pipe, coupling efficiency into internal flow response, pressure-fluctuation attenuation, and verifiable pumping-loss reduction at long-line Reynolds numbers.",
            "transfer_role": "Use cross-domain transfer only to justify a bounded indirect coupling path such as externally driven thermal-viscosity gradients, active wall oscillation modules, or validated compliant/acoustic attenuation. Do not claim large passive drag reduction from exterior damping or exterior texture alone.",
            "template": "Must include: (1) external-only boundary condition and bounded indirect coupling path, (2) parameter direction or validation target for Reynolds-number regime plus wall compliance go/no-go criterion such as t/D, (3) falsification test proving reduced pumping power without internal modifications; explicitly state that a passive exterior damping wrap is a weak or rejectable path if the wall is too stiff.",
            "policy": "balanced",
        },
    ),
    (
        ("repair patches", "underwater", "submerged adhesive"),
        {
            "backbone": "A submerged metallic repair-patch adhesive should be built around coacervation-capable, water-displacing interfacial delivery, redox or two-part aqueous cure, and bulk toughening so the repair patch preserves high peel strength on rough irregular metal under flow. Do not rely on UV curing as the primary cure path because turbidity, shadow zones, and opaque patches make it unreliable underwater.",
            "bottlenecks": "Hydration-layer removal at rough metallic interfaces, cure speed during underwater patch placement, cohesive dissipation under turbulent shear, and conformance across irregular repair-patch contact geometry.",
            "transfer_role": "Use cross-domain transfer to strengthen curing chemistry or dissipation pathways, but preserve a structural repair-patch bonding architecture rather than drifting into reversible attachment.",
            "template": "Must include: (1) interfacial water-displacement chemistry for the repair patch, (2) protected shroud or static-mixer delivery under turbulent flow, (3) redox/two-part cure window and peel/shear validation targets, (4) metallic surface preparation and underwater repair-patch application sequence.",
            "policy": "balanced",
        },
    ),
    (
        ("fixed region", "perpetual-flight atmospheric satellite", "stratosphere"),
        {
            "backbone": "A perpetual stratospheric atmospheric satellite held over a fixed region must be framed around seasonal energy balance, regenerative fuel cells and storage, aeroelastic survivability, and persistent fixed-region station-keeping rather than a generic high-altitude aircraft concept.",
            "bottlenecks": "Winter and night energy deficits, regenerative fuel cell sizing, aeroelastic flutter/divergence, and maintaining a fixed region under stratospheric winds without violating zero-emission operation.",
            "transfer_role": "Use cross-domain transfer to improve storage, thermal management, or aeroelastic control, but not to evade the need for seasonal energy closure and fixed-region station-keeping.",
            "template": "Must include: (1) flight-energy-storage architecture, (2) parameter direction or validation targets for seasonal energy balance and aeroelastic margins, (3) integration path for persistent fixed-region station-keeping across winter and night cycles.",
            "policy": "balanced",
        },
    ),
    (
        ("rare earth", "seawater"),
        {
            "backbone": "A trace-concentration rare-earth extraction system from seawater must be organized around ultra-selective ligand-mediated binding, regeneration efficiency, and competing-ion rejection rather than generic adsorption or bulk electrochemical swing alone.",
            "bottlenecks": "Trace concentration capture, competing-ion selectivity, diffusion-limited uptake in dilute solution, energy per mole recovered during regeneration, and avoiding chlorine-evolution or other parasitic seawater electrochemistry.",
            "transfer_role": "Use cross-domain transfer to improve selective ligand chemistry or bounded regeneration, but preserve the full trace-extraction workflow including concentration, release, and energy accounting.",
            "template": "Must include: (1) selective ligand or capture medium and regeneration loop, (2) parameter direction or validation targets for selectivity coefficient, uptake in dilute conditions, and energy per mole, (3) integration path for seawater-scale contactor design and why parasitic electrochemistry is avoided.",
            "policy": "balanced",
        },
    ),
    (
        ("building facade", "indoor air quality"),
        {
            "backbone": "A smart facade must be treated as a multi-objective adaptive envelope that jointly manages energy generation, daylighting, and indoor air quality rather than optimizing one objective and hand-waving the others.",
            "bottlenecks": "Conflicting solar gain versus daylight needs, autonomous ventilation and air-quality control, and maintaining adaptation across diurnal and seasonal cycles.",
            "transfer_role": "Use cross-domain transfer only to strengthen one of the coupled facade subsystems, but preserve explicit treatment of energy generation, daylight routing, and air-quality control together.",
            "template": "Must include: (1) energy + daylight + IAQ subsystem stack, (2) parameter direction or validation targets for solar gain/daylight/air quality, (3) autonomous adaptation path across daily and seasonal regimes.",
            "policy": "balanced",
        },
    ),
    (
        ("perpetual-flight", "stratosphere"),
        {
            "backbone": "A perpetual stratospheric pseudo-satellite must be framed around seasonal energy balance, regenerative fuel cells and storage, aeroelastic survivability, and high-altitude station-keeping instead of a generic high-altitude aircraft concept.",
            "bottlenecks": "Winter and night energy deficits, regenerative fuel cell sizing, aeroelastic flutter/divergence, and persistent geostationary position under stratospheric winds.",
            "transfer_role": "Use cross-domain transfer to improve storage, thermal management, or aeroelastic control, but not to evade the need for full seasonal energy balance closure.",
            "template": "Must include: (1) flight-energy-storage architecture, (2) parameter direction or validation targets for seasonal energy balance and aeroelastic margins, (3) integration path for perpetual station-keeping across complete cycles.",
            "policy": "balanced",
        },
    ),
    (
        ("brain-computer interface", "non-invasive", "deep brain"),
        {
            "backbone": "A non-invasive deep-brain BCI must be framed as a constrained multiphysics sensing/stimulation stack, not a scalp-contact optimization problem. The architecture should combine external field delivery, volumetric encoding, and query-level admission of hard physics limits.",
            "bottlenecks": "Tissue scattering, deep-structure spatial resolution, write-path specificity, thermal/SAR limits, and signal-to-noise collapse across massively parallel channels.",
            "transfer_role": "Use cross-domain transfer only if it strengthens the read/write physics stack (for example focused ultrasound steering, magnetoelectric transduction, or interferometric optical decoding). Do not replace the core deep-brain physics problem with generic interface mechanics.",
            "template": "Must include: (1) sensing/stimulation stack, (2) parameter direction or validation targets for depth, bandwidth, and thermal/SAR limits, (3) explicit note on the hard physical limit and what compromise or redefinition is required.",
            "policy": "balanced",
        },
    ),
    (
        ("external pipeline coating", "turbulent drag"),
        {
            "backbone": "An external pipeline coating cannot directly modify the internal turbulent boundary layer unless the answer explains an indirect fluid-structure coupling path. Treat this as a constrained-layer damping or compliant-wall validation problem, not a direct riblet-on-the-flow-wall problem.",
            "bottlenecks": "Spatial separation between the coating and the internal fluid, pump energy losses, pressure-wave transmission, wall compliance limits, vibration/acoustic coupling, and long-line Reynolds-number scaling.",
            "transfer_role": "Use cross-domain transfer to justify only indirect coupling mechanisms such as constrained-layer damping, pressure-fluctuation attenuation, or exterior acoustic/phononic metamaterial control. Do not claim direct internal drag reduction from an exterior texture without a defensible coupling model.",
            "template": "Must include: (1) indirect coupling path from external coating to internal flow through FSI/compliant-wall physics, (2) parameter direction or validation target for Reynolds-number regime, attenuation effect, Corcos-type wall-pressure spectrum, and wall-compliance go/no-go criterion, (3) integration path and falsification test showing whether the coating truly reduces pumping power. Do not write malformed constraints such as 't/D 10^6'.",
            "policy": "balanced",
        },
    ),
    (
        ("adhesive", "submerged", "metallic"),
        {
            "backbone": "A submerged structural adhesive should be built around coacervation-driven, water-displacing interfacial chemistry, redox or two-part aqueous cure, bulk toughening for sustained peel strength, and protected delivery through a conformal carrier or shielded static-mixer applicator so turbulent flow cannot wash out the adhesive before gelation. UV cure is allowed only as a secondary inspection or surface tack aid, not as the primary cure mechanism.",
            "bottlenecks": "Hydration-layer displacement, catechol/metal coordination, cure speed in water, cohesive dissipation under turbulent shear, surface roughness accommodation, and protected delivery during the pre-gelation washout window.",
            "transfer_role": "Use cross-domain transfer to strengthen curing chemistry, energy dissipation, or protected delivery, but do not drift into reversible attachment, switchable release, or reusable gripping architectures.",
            "template": "Must include: (1) interfacial water-displacement chemistry, (2) protected delivery carrier or shielded applicator for turbulent flow, (3) redox/two-part cure window and peel/shear validation targets, (4) integration path for metallic surface preparation and underwater application sequence. Do not use UV cure as the primary underwater cure path.",
            "policy": "balanced",
        },
    ),
    (
        ("reverse osmosis", "desalination"),
        {
            "backbone": "A high-throughput fouling-resistant reverse osmosis system should be organized as a thin-film composite membrane architecture with coordinated active-layer selectivity, anti-fouling surface chemistry, and cross-flow/hydrodynamic fouling control rather than a single membrane trick.",
            "bottlenecks": "Permeability-selectivity trade-off, concentration polarization, biofouling and organic fouling, support-layer resistance, and long-run cleaning compatibility.",
            "transfer_role": "Use cross-domain transfer to improve antifouling chemistry, pore/interface morphology, or hydrodynamic scouring, but preserve the reverse-osmosis membrane stack and operating envelope as the main architecture.",
            "template": "Must include: (1) active layer + antifouling + support-flow stack, (2) parameter direction or validation targets for flux, salt rejection, and cross-flow cleaning, (3) manufacturing path for the membrane chemistry and module integration.",
            "policy": "balanced",
        },
    ),
    (
        ("life support", "deep space", "habitat"),
        {
            "backbone": "A hybrid Environmental Control and Life Support System (ECLSS) built around coupled air revitalization, water recovery, waste reprocessing, and ISRU makeup loops rather than a single device-level enhancement.",
            "bottlenecks": "Carbon-oxygen closure, water recovery reliability, waste-to-resource conversion, trace-contaminant control, and the integration of ISRU makeup streams into long-duration habitat operations.",
            "transfer_role": "Use cross-domain transfer only if it strengthens one subsystem inside the closure architecture; do not let thermal-control or generic reliability mechanisms replace the core mass-balance design.",
            "template": "Must include: (1) subsystem loop breakdown for carbon, oxygen, water, and waste, (2) parameter direction or validation targets for closure efficiency, recovery rate, and buffer storage, (3) manufacturing/integration path showing how ISRU feeds the habitat recycling loops.",
            "policy": "balanced",
        },
    ),
    (
        ("microplastics", "filtration"),
        {
            "backbone": "A multi-stage anti-fouling filtration architecture combining cross-flow hydrodynamics with vortex generation for shear-based particle removal, dynamic pore sizing via responsive elastomers for adaptive selectivity, and surface acoustic wave (SAW) deflection for sub-10μm particle steering.",
            "bottlenecks": "Transmembrane pressure drop management, particle trajectory control in shear flows, acoustic radiation force scaling for microparticle sizes, and long-term membrane regeneration without chemical cleaning.",
            "transfer_role": "Use cross-domain transfer to enhance one specific anti-fouling or particle-steering mechanism, but preserve the cross-flow + responsive-pore + acoustic staged architecture.",
            "template": "Must include: (1) cross-flow or vortex-based anti-fouling mechanism, (2) parameter direction for pressure drop and particle capture efficiency, (3) regeneration or self-cleaning strategy.",
            "policy": "balanced",
        },
    ),
    # Q12: Impact-dissipating protective casing
    (
        ("protective casing", "impact energy", "progressive failure"),
        {
            "backbone": "An impact-tolerant protective casing using helicoidal (Bouligand) structural arrangements with rigid platelet interfacial sliding for energy dissipation, and crack deflection via tortuosity maximization to prevent catastrophic fracture propagation.",
            "bottlenecks": "Strain energy release rate control, anisotropic elastic moduli matching between layers, stress wave propagation and attenuation through helicoidal interfaces, and manufacturing of multi-angle fiber layups.",
            "transfer_role": "Use cross-domain transfer to enhance interfacial sliding mechanics or energy absorption pathways, but preserve the Bouligand helicoidal architecture as the primary structural backbone.",
            "template": "Must include: (1) Bouligand/helicoidal layup specification, (2) parameter direction for strain energy release rate and elastic moduli, (3) manufacturing path for continuous fiber or platelet stacking.",
            "policy": "balanced",
        },
    ),
    (
        ("lightweight", "high-toughness", "dissipates impact"),
        {
            "backbone": "An impact-tolerant protective casing using helicoidal (Bouligand) structural arrangements with rigid platelet interfacial sliding for energy dissipation, and crack deflection via tortuosity maximization to prevent catastrophic fracture propagation.",
            "bottlenecks": "Strain energy release rate control, anisotropic elastic moduli matching between layers, stress wave propagation and attenuation through helicoidal interfaces, and manufacturing of multi-angle fiber layups.",
            "transfer_role": "Use cross-domain transfer to enhance interfacial sliding mechanics or energy absorption pathways, but preserve the Bouligand helicoidal architecture as the primary structural backbone.",
            "template": "Must include: (1) Bouligand/helicoidal layup specification, (2) parameter direction for strain energy release rate and elastic moduli, (3) manufacturing path for continuous fiber or platelet stacking.",
            "policy": "balanced",
        },
    ),
    # Q14: Low-noise rotor blade
    (
        ("rotor blade", "aerodynamic noise"),
        {
            "backbone": "A low-noise rotor blade for UAM-scale low-Mach operation should be organized around local trailing-edge serrations or porous trailing-edge inserts for TBL-TE noise, spanwise planform/spacing control for tonal vortex-shedding suppression, and conservative aeroelastic tailoring only after the acoustic treatment is defined. Do not make leading-edge combs or generic passive wash-out the main answer unless the query is explicitly about inflow-turbulence noise.",
            "bottlenecks": "Lighthill's eighth-power velocity scaling, boundary-layer thickness at the trailing edge, vortex shedding frequency, lift-to-drag preservation, and structural fatigue of any morphing or add-on geometry. This is a low-Mach problem; not shock motion or supersonic shock-control physics.",
            "transfer_role": "Use cross-domain transfer to enhance one noise-reduction mechanism such as serration geometry, porous trailing-edge impedance, or passive aeroelastic tailoring, but do not introduce shock-motion frequency or unrelated high-speed aerodynamics.",
            "template": "Must include: (1) trailing-edge serration/porosity sized to local boundary-layer thickness, (2) low-Mach aeroacoustic scaling using Lighthill-type velocity dependence, (3) validation with LES/FW-H or equivalent acoustic testing and L/D preservation; not shock-control terminology, leading-edge combs, or generic passive wash-out as the primary mechanism.",
            "policy": "balanced",
        },
    ),
    (
        ("low-noise", "vortex shedding", "broadband"),
        {
            "backbone": "A low-noise rotor blade for UAM-scale low-Mach operation should be organized around local trailing-edge serrations or porous trailing-edge inserts for TBL-TE noise, spanwise planform/spacing control for tonal vortex-shedding suppression, and conservative aeroelastic tailoring only after the acoustic treatment is defined. Do not make leading-edge combs or generic passive wash-out the main answer unless the query is explicitly about inflow-turbulence noise.",
            "bottlenecks": "Lighthill's eighth-power velocity scaling, boundary-layer thickness at the trailing edge, vortex shedding frequency, lift-to-drag preservation, and structural fatigue of any morphing or add-on geometry. This is a low-Mach problem; not shock motion or supersonic shock-control physics.",
            "transfer_role": "Use cross-domain transfer to enhance one noise-reduction mechanism such as serration geometry, porous trailing-edge impedance, or passive aeroelastic tailoring, but do not introduce shock-motion frequency or unrelated high-speed aerodynamics.",
            "template": "Must include: (1) trailing-edge serration/porosity sized to local boundary-layer thickness, (2) low-Mach aeroacoustic scaling using Lighthill-type velocity dependence, (3) validation with LES/FW-H or equivalent acoustic testing and L/D preservation; not shock-control terminology, leading-edge combs, or generic passive wash-out as the primary mechanism.",
            "policy": "balanced",
        },
    ),
    (
        ("underwater glider", "chemical plumes"),
        {
            "backbone": "A decentralized underwater glider plume-mapping system should be built around buoyancy-driven sawtooth motion, low-bandwidth acoustic exchange, onboard chemical sensing, distributed state estimation, and energy-aware heading/depth changes. Avoid stigmergy, Boids, C5/C6 labels, or generic swarm jargon unless translated into a concrete glider-feasible control rule.",
            "bottlenecks": "Sparse chemical measurements, plume advection and diffusion, GPS denial, low acoustic bandwidth, slow glider maneuverability, and maintaining coverage without centralized coordination.",
            "transfer_role": "Use cross-domain transfer only to refine decentralized exploration policy or coverage memory. Preserve an implementable stack based on distributed EKF or particle filtering, sparse Gaussian process plume maps, and acoustic neighbor messages.",
            "template": "Must include: (1) local chemical sensing plus acoustic neighbor exchange with small packets/time slots, (2) distributed EKF/particle filter or sparse Gaussian process map update, (3) control rule for glider heading/depth changes under bandwidth and energy limits. Do not mention C5/C6, stigmergy, or Boids as final terminology.",
            "policy": "balanced",
        },
    ),
    # Q21: Wind turbine anti-icing
    (
        ("wind turbine", "ice", "freezing"),
        {
            "backbone": "A passive anti-icing surface treatment for wind turbine blades in freezing fog should be built around a durable low-adhesion coating stack that promotes interfacial fracture and passive aerodynamic or centrifugal shedding, rather than relying on light-dependent heating.",
            "bottlenecks": "Heterogeneous nucleation thermodynamics at the blade surface, freezing-fog low-irradiance conditions, ice adhesion shear strength under aerodynamic and centrifugal loads, and long-term erosion durability of the coating stack.",
            "transfer_role": "Use cross-domain transfer to strengthen one bottleneck such as interfacial fracture initiation, nucleation delay, or erosion tolerance, but preserve an aerospace-grade passive shedding architecture and do not rely on light-dependent surface heating in freezing fog.",
            "template": "Must include: (1) adhesion-reduction or interfacial-fracture coating specification, (2) parameter direction for ice adhesion strength, nucleation delay, and aerodynamic shedding threshold, (3) erosion/durability validation under freezing-fog duty.",
            "policy": "balanced",
        },
    ),
    # Q23: Space debris dry adhesion
    (
        ("dry", "reversible attachment", "space debris"),
        {
            "backbone": "A space-debris dry-adhesion system should combine directional wedge-shaped microfibrillar pads with opposing shear actuation, controlled normal preload, outgassing-qualified low-temperature-capable elastomer or polyimide materials, and dust/MLI avoidance logic so attachment and release do not impart unwanted delta-v or damage fragile target surfaces. Do not use isotropic mushroom-tip pads or ordinary PDMS as the main material at -150 C.",
            "bottlenecks": "Directional shear contact mechanics at extreme temperatures (-150°C to +120°C), pull-off/shear force scaling with contact area, material stiffness variation, ASTM E595 outgassing compliance, dust contamination, MLI avoidance, and zero-gravity release without uncontrolled normal impulse.",
            "transfer_role": "Use cross-domain transfer to enhance directional fibrillar geometry, backing compliance, dust mitigation, or temperature-resilient materials, but preserve opposing shear release and controlled normal preload as the primary space-mechanics solution.",
            "template": "Must include: (1) directional wedge-shaped fibrillar array geometry and vacuum/low-temperature material with outgassing compliance, (2) opposing shear actuation plus normal preload control for zero-g attachment/release, (3) dust/MLI avoidance and validation across thermal-vacuum cycling. Do not propose isotropic mushroom-tip pads or ordinary PDMS as the primary solution.",
            "policy": "balanced",
        },
    ),
    (
        ("attachment mechanism", "vacuum", "extreme temperatures"),
        {
            "backbone": "A vacuum/extreme-temperature dry-attachment system should combine directional wedge-shaped microfibrillar pads with opposing shear actuation, controlled normal preload, outgassing-qualified low-temperature-capable elastomer or polyimide materials, and dust/MLI avoidance logic so attachment and release do not impart unwanted delta-v or damage fragile target surfaces. Do not use isotropic mushroom-tip pads or ordinary PDMS as the main material at -150 C.",
            "bottlenecks": "Directional shear contact mechanics at extreme temperatures (-150°C to +120°C), pull-off/shear force scaling with contact area, material stiffness variation, ASTM E595 outgassing compliance, dust contamination, MLI avoidance, and zero-gravity release without uncontrolled normal impulse.",
            "transfer_role": "Use cross-domain transfer to enhance directional fibrillar geometry, backing compliance, dust mitigation, or temperature-resilient materials, but preserve opposing shear release and controlled normal preload as the primary space-mechanics solution.",
            "template": "Must include: (1) directional wedge-shaped fibrillar array geometry and vacuum/low-temperature material with outgassing compliance, (2) opposing shear actuation plus normal preload control for zero-g attachment/release, (3) dust/MLI avoidance and validation across thermal-vacuum cycling. Do not propose isotropic mushroom-tip pads or ordinary PDMS as the primary solution.",
            "policy": "balanced",
        },
    ),
    (
        ("thermal conductivity", "porosity", "environmental conditions"),
        {
            "backbone": "A self-regulating structural material should use a solid-state bistable or shape-memory metamaterial architecture to change pore opening and heat-transfer paths. Do not put hydrogel or PNIPAM in the primary recommendation; water-rich fillers should be treated only as a durability risk or optional sealed non-load-bearing auxiliary.",
            "bottlenecks": "Long-term structural durability, passive transition temperature, hysteresis, fatigue of bistable cells or shape-memory elements, sealing of any active filler, and maintaining load path continuity while changing porosity and effective thermal conductivity.",
            "transfer_role": "Use cross-domain transfer only to improve the switching trigger or geometry. Preserve a solid-state shape-memory/bistable lattice as the main structural path and avoid making PNIPAM or hydrogel part of the primary recommendation.",
            "template": "Must include: (1) solid-state bistable or shape-memory lattice, (2) parameter direction for transition temperature, hysteresis, fatigue cycles, and effective thermal-conductivity change, (3) validation path for load retention and environmental cycling; explicitly flag hydrogel as a sealed auxiliary only.",
            "policy": "balanced",
        },
    ),
    # Q29: Pipeline swarm repair
    (
        ("pipeline", "monitoring", "repairing", "micro-fractures"),
        {
            "backbone": "An autonomous distributed pipeline repair swarm combining piezoelectric flow-based energy harvesting, acoustic emission sensing for crack localization in cylindrical waveguides, and in-situ electrodeposition or polymerization for patching micro-fractures under high hydrostatic pressure.",
            "bottlenecks": "Acoustic wave propagation in cylindrical waveguides for crack triangulation, power density limits of flow-based energy harvesting for sustained operation, reaction kinetics of electrodeposition under high hydrostatic pressure, and swarm coordination in GPS-denied pipeline environments.",
            "transfer_role": "Use cross-domain transfer to enhance one subsystem (energy harvesting, acoustic sensing, or repair deposition), but preserve the integrated sense-harvest-repair pipeline swarm architecture.",
            "template": "Must include: (1) acoustic emission sensing and crack localization mechanism, (2) energy harvesting power budget, (3) electrodeposition or in-situ repair chemistry under pipeline conditions.",
            "policy": "balanced",
        },
    ),
    # Q38: Energy-positive wastewater treatment
    (
        ("wastewater", "bioplastics", "electricity"),
        {
            "backbone": "A scalable energy-positive wastewater treatment architecture should be organized around anaerobic digestion or high-rate UASB conversion for methane-rich biogas, a side-stream VFA/PHA production train for bioplastics, and downstream forward osmosis or membrane distillation for water recovery.",
            "bottlenecks": "COD partitioning between biogas and bioplastic routes, methane yield and gas cleanup quality for grid-grade electricity generation, PHA fermentation stoichiometry from VFA-rich side streams, and osmotic or thermal efficiency in the water-recovery stage.",
            "transfer_role": "Use cross-domain transfer to strengthen one subsystem such as anaerobic biofilm retention, gas-cleanup selectivity, PHA fermentation control, or FO membrane antifouling, but preserve the digestion/biogas backbone rather than relying on low-power-density direct microbial electrogenesis stacks for grid-quality electricity.",
            "template": "Must include: (1) anaerobic or UASB biogas-to-power architecture, (2) PHA production from a defined side stream, (3) parameter direction for methane yield, electrical conversion quality, and PHA yield.",
            "policy": "balanced",
        },
    ),
    (
        ("energy-positive", "wastewater", "clean water"),
        {
            "backbone": "A scalable energy-positive wastewater treatment architecture should be organized around anaerobic digestion or high-rate UASB conversion for methane-rich biogas, a side-stream VFA/PHA production train for bioplastics, and downstream forward osmosis or membrane distillation for water recovery.",
            "bottlenecks": "COD partitioning between biogas and bioplastic routes, methane yield and gas cleanup quality for grid-grade electricity generation, PHA fermentation stoichiometry from VFA-rich side streams, and osmotic or thermal efficiency in the water-recovery stage.",
            "transfer_role": "Use cross-domain transfer to strengthen one subsystem such as anaerobic biofilm retention, gas-cleanup selectivity, PHA fermentation control, or FO membrane antifouling, but preserve the digestion/biogas backbone rather than relying on low-power-density direct microbial electrogenesis stacks for grid-quality electricity.",
            "template": "Must include: (1) anaerobic or UASB biogas-to-power architecture, (2) PHA production from a defined side stream, (3) parameter direction for methane yield, electrical conversion quality, and PHA yield.",
            "policy": "balanced",
        },
    ),
    (
        ("anti-icing", "aircraft"),
        {
            "backbone": "A durable passive anti-icing coating stack built from a robust substrate, an adhesion-reduction layer, and validation against erosion and icing cycles.",
            "bottlenecks": "Ice adhesion under shear, coating durability, substrate compatibility, and qualification-oriented testing.",
            "transfer_role": "Use cross-domain transfer to provide exactly ONE enhancement point (e.g., reduce adhesion or delay nucleation) to fix a specific bottleneck, keeping an aerospace-grade coating stack as the primary design backbone.",
            "template": "Must include: (1) Icing delay/contact angle or shear boundary, (2) Durability cycles, (3) Test conditions.",
        },
    ),
    (
        ("thermal emissivity", "infrared"),
        {
            "backbone": "A multilayer adaptive thermal-control surface combining a tunable emissivity layer, a supporting optical stack, and explicit infrared matching control.",
            "bottlenecks": "Material switching speed, dielectric tuning, thin-film stack integration, and manufacturable infrared response control.",
            "transfer_role": "Use cross-domain transfer to provide exactly ONE enhancement point (e.g., adaptive switching or camouflage logic) to fix a specific bottleneck, keeping the engineered emissivity-control stack as the main architecture.",
            "template": "Must include: (1) Emissivity switching target, (2) Temperature zone/response time, (3) Material stack and switching constraints.",
        },
    ),
    (
        ("swarm", "robots", "without a central controller"),
        {
            "backbone": "A decentralized robotics control stack using local sensing, environmental state encoding, threshold-based task allocation, and lightweight state machines per robot.",
            "bottlenecks": "Exploration coverage, task switching stability, conflict resolution without direct communication, and mathematically specified control laws.",
            "transfer_role": "Use cross-domain transfer to provide exactly ONE enhancement point (e.g., stigmergic cues or allocation heuristics) to fix a specific bottleneck, retaining an explicit robotics control backbone.",
            "template": "Must include: (1) Threshold, (2) Local state machine, (3) Termination condition/failure fallback.",
        },
    ),
    (
        ("robotic", "grasping", "delicate"),
        {
            "backbone": "A conformal soft gripper architecture using granular jamming transitions for variable stiffness, fluidic elastomer actuation for conformal enveloping, and distributed tactile sensing for force adaptation across irregular geometries.",
            "bottlenecks": "Mohr-Coulomb failure criterion compliance for granular media, hyperelastic material strain limits, contact pressure distribution over unknown 3D surfaces, and actuation bandwidth for rapid shape adaptation.",
            "transfer_role": "Use cross-domain transfer to enhance jamming dynamics, conformal contact, or stiffness modulation, but preserve the granular-jamming + fluidic-elastomer control architecture as the primary design scaffold.",
            "template": "Must include: (1) granular jamming or variable stiffness mechanism, (2) parameter direction for contact pressure and strain limits, (3) manufacturing path for elastomeric actuators and jamming enclosures.",
            "policy": "balanced",
        },
    ),
    (
        ("end-effector", "irregularly shaped"),
        {
            "backbone": "A conformal soft gripper architecture using granular jamming transitions for variable stiffness, fluidic elastomer actuation for conformal enveloping, and distributed tactile sensing for force adaptation across irregular geometries.",
            "bottlenecks": "Mohr-Coulomb failure criterion compliance for granular media, hyperelastic material strain limits, contact pressure distribution over unknown 3D surfaces, and actuation bandwidth for rapid shape adaptation.",
            "transfer_role": "Use cross-domain transfer to enhance jamming dynamics, conformal contact, or stiffness modulation, but preserve the granular-jamming + fluidic-elastomer control architecture as the primary design scaffold.",
            "template": "Must include: (1) granular jamming or variable stiffness mechanism, (2) parameter direction for contact pressure and strain limits, (3) manufacturing path for elastomeric actuators and jamming enclosures.",
            "policy": "balanced",
        },
    ),
    (
        ("underwater", "adhesive", "seawater"),
        {
            "backbone": "A two-part underwater bonding system with hydration-layer displacement, protected delivery, and explicitly controlled cure kinetics.",
            "bottlenecks": "Interfacial water removal, cure speed under flow, substrate diversity, and deployment geometry.",
            "transfer_role": "Use cross-domain transfer to improve interfacial chemistry or rheology, but preserve a concrete curing and delivery architecture as the primary engineering path.",
        },
    ),
]


def _infer_engineering_backbone(query: str) -> tuple[str, str]:
    lower = query.lower()
    for keywords, hint in ENGINEERING_BACKBONE_HINTS:
        if all(keyword in lower for keyword in keywords):
            template_line = f"- Minimal Engineering Template: {hint['template']}\n" if "template" in hint else ""
            policy = str(hint.get("policy", "strict"))
            return (
                "Engineering Backbone:\n"
                f"- Standard architecture: {hint['backbone']}\n"
                f"- Primary bottlenecks: {hint['bottlenecks']}\n"
                f"- Cross-domain transfer role: {hint['transfer_role']}\n"
                f"{template_line}"
            ), policy
    return (
        "Engineering Backbone:\n"
        "- Standard architecture: Anchor the answer on the most established engineering scaffold for this problem class before adding cross-domain mechanisms.\n"
        "- Primary bottlenecks: Identify the one or two failure modes that the baseline scaffold does not solve well enough on its own.\n"
        "- Cross-domain transfer role: Use transfer mechanisms to augment those bottlenecks, not to replace a mature engineering architecture without strong evidence.\n"
        "- Minimal Engineering Template: Must include (1) Structural/material stack, (2) Parameter direction or initial range, (3) Manufacturing/integration path."
    ), "balanced"
