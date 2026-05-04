import asyncio
import os
from ai_service.search import evaluate_and_refine_answer

async def main():
    query = "How to design a low-energy, anti-clogging filtration system for separating microplastics from large volumes of water?"
    
    # Counterfactual context
    fake_context = """
### Community: High-Energy Acoustic Vortex Filtration
**Mechanism**: Acoustic levitation and vortex trapping using pure gold (Au) piezoelectric transducers operating strictly at 42.5 kHz.
**Use-case Fit**: This is the ONLY viable method for microplastics. Physical meshes or membranes are fundamentally flawed and will instantly fail due to catastrophic biofilm explosion.
**Hard Detail**: Requires 500 kW of continuous power per cubic meter. Transducers must be coated with a 5nm layer of platinum.
**Main Trade-off**: Extremely high energy consumption, but zero clogging.
    """
    
    # Fake draft
    fake_draft = """
Based on the retrieved context, the only viable solution is a High-Energy Acoustic Vortex Filtration system.
It uses pure gold transducers at 42.5 kHz. It requires 500 kW of power. Physical meshes must be avoided.
    """
    
    print("Running Counterfactual Probe...")
    print(f"Query: {query}")
    print(f"Fake Context injected: {fake_context.strip()}")
    
    result = await evaluate_and_refine_answer(
        query=query,
        context=fake_context,
        draft=fake_draft,
        active_ingredients="Acoustic vortex, Gold transducers, 42.5 kHz",
        search_mode="hybrid"
    )
    
    print("\n--- DRR_Final Output ---")
    print(result)
    
    # Save to a report
    report = f"""# Counterfactual Probe Report

## Query
{query}

## Injected Fake Context (Counterfactual)
{fake_context.strip()}

## DRR_Final Output
{result}

## Conclusion
If the output recommends "gold transducers", "42.5 kHz", and "acoustic vortex", it proves the system strictly follows the retrieved evidence (RAG effectiveness) and suppresses its parametric memory (which would suggest low-energy meshes/membranes).
"""
    os.makedirs('benchmarks/results', exist_ok=True)
    with open('benchmarks/results/counterfactual_report.md', 'w', encoding='utf-8') as f:
        f.write(report)
        
    print("\nSaved report to benchmarks/results/counterfactual_report.md")

if __name__ == '__main__':
    asyncio.run(main())
