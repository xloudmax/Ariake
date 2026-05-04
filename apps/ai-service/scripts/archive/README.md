# scripts/archive/

Historical one-off scripts — moved here to keep the service root clean. **Not maintained**.

If you need to rerun one, copy it out (`cp scripts/archive/<month>/<file>.py /tmp/` then edit) rather than running in place. These scripts assume older layouts / prompts / model IDs and will not track future refactors.

## 2026-04-adhoc/

- `evaluate_improvements.py` — ad-hoc benchmark comparison script from the paper-core v2 iteration.
- `plot_paper_core_v2_ablation.py` — one-shot ablation figure generator superseded by `doc/latex/generate_current_figures.py`.
