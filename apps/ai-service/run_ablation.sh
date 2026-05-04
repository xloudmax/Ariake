#!/bin/bash
nohup env ADVANCED_ABLATION_QUERY_SET=v2 uv run python -m scripts.run_advanced_ablation > ablation_run.log 2>&1 &
echo $! > ablation.pid
