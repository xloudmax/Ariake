#!/bin/bash
cd apps/ai-service

echo "Cleaning caches..."
rm -f .gemini_cache.json .embedding_cache.json

echo "Stopping existing AI Service..."
lsof -ti:8000 | xargs kill -9 || true

echo "Starting fresh AI Service..."
nohup uv run python -m uvicorn main:app --host 0.0.0.0 --port 8000 > ai_service.log 2>&1 &
sleep 5

echo "Running Advanced Benchmark (Cold-Start)..."
pnpm run benchmark:advanced

echo "Copying results for plotting..."
cp benchmarks/results/advanced_ablation_v2_results.csv benchmarks/openalex/artifacts/versions/corpus_v3/reports/advanced_ablation_v2_results_v3.csv || true

echo "Regenerating Figures..."
uv run python doc/latex/generate_current_figures.py

echo "Recompiling LaTeX Thesis..."
cd ../../JNUThesis
xelatex -interaction=nonstopmode JNUThesis.tex > /dev/null
xelatex -interaction=nonstopmode JNUThesis.tex > /dev/null

echo "DONE" > ../pipeline_status.txt
echo "Pipeline completed successfully!"
