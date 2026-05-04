import csv
import os

def get_latest_run_dir(base_path):
    if not os.path.exists(base_path):
        return None
    dirs = [os.path.join(base_path, d) for d in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, d))]
    if not dirs:
        return None
    return max(dirs, key=os.path.getmtime)

def read_results(csv_path):
    results = {}
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if 'id' in row:
                results[row['id']] = row
    return results

def main():
    base_dir = "benchmarks/runs/paper_core/paper_core_v2/corpus_v3_scale"
    drr_base = os.path.join(base_dir, "DRR_Final", "paper_core_v2_neutral")
    zs_base = os.path.join(base_dir, "Zero_Shot", "paper_core_v2_neutral")

    latest_drr = get_latest_run_dir(drr_base)
    latest_zs = get_latest_run_dir(zs_base)

    if not latest_drr or not latest_zs:
        print(f"Missing run directories. DRR: {latest_drr}, Zero_Shot: {latest_zs}")
        # Try to find in results/ if not found in runs/
        # Just fallback to finding the newest csv in results/ if needed
        # But we expect them to be in runs/
        pass

    drr_csv = os.path.join(latest_drr, "results.csv") if latest_drr else None
    zs_csv = os.path.join(latest_zs, "results.csv") if latest_zs else None

    if not drr_csv or not os.path.exists(drr_csv):
        print(f"DRR CSV not found: {drr_csv}")
        return
    if not zs_csv or not os.path.exists(zs_csv):
        print(f"Zero_Shot CSV not found: {zs_csv}")
        return

    drr_results = read_results(drr_csv)
    zs_results = read_results(zs_csv)

    common_ids = set(drr_results.keys()).intersection(set(zs_results.keys()))

    metrics = ['mechanism_divergence', 'novelty', 'causality', 'actionability']
    
    report = ["# Improvement Evaluation Report\n"]
    report.append(f"- **DRR Run**: `{latest_drr}`")
    report.append(f"- **Zero_Shot Run**: `{latest_zs}`")
    report.append(f"- **Evaluated Queries**: {len(common_ids)}\n")

    report.append("## Average Scores\n")
    report.append("| Metric | Zero_Shot | DRR_Final | Delta |")
    report.append("|---|---|---|---|")

    avg_scores = {}
    for metric in metrics:
        drr_sum = sum(float(drr_results[qid][metric]) for qid in common_ids if drr_results[qid][metric])
        zs_sum = sum(float(zs_results[qid][metric]) for qid in common_ids if zs_results[qid][metric])
        
        count_drr = sum(1 for qid in common_ids if drr_results[qid][metric])
        count_zs = sum(1 for qid in common_ids if zs_results[qid][metric])

        drr_avg = drr_sum / count_drr if count_drr > 0 else 0
        zs_avg = zs_sum / count_zs if count_zs > 0 else 0
        delta = drr_avg - zs_avg
        
        report.append(f"| {metric} | {zs_avg:.2f} | {drr_avg:.2f} | {delta:+.2f} |")
        avg_scores[metric] = {'drr': drr_avg, 'zs': zs_avg, 'delta': delta}

    report.append("\n## Win/Tie/Loss (DRR vs Zero_Shot)\n")
    report.append("| Metric | Wins | Ties | Losses |")
    report.append("|---|---|---|---|")

    for metric in metrics:
        wins = 0
        ties = 0
        losses = 0
        for qid in common_ids:
            if not drr_results[qid][metric] or not zs_results[qid][metric]:
                continue
            drr_val = float(drr_results[qid][metric])
            zs_val = float(zs_results[qid][metric])
            
            # For mechanism_divergence, lower is better (0.0 is perfect alignment)
            # Wait, usually mechanism_divergence is 0.0 (aligned) or 1.0 (divergent). 
            # If it's a penalty, lower is better. 
            # Let's assume higher is better for novelty, causality, actionability.
            if metric == 'mechanism_divergence':
                if drr_val < zs_val:
                    wins += 1
                elif drr_val > zs_val:
                    losses += 1
                else:
                    ties += 1
            else:
                if drr_val > zs_val:
                    wins += 1
                elif drr_val < zs_val:
                    losses += 1
                else:
                    ties += 1
                
        report.append(f"| {metric} | {wins} | {ties} | {losses} |")

    report.append("\n## Detailed Query Deltas\n")
    report.append("| Query ID | Metric | Zero_Shot | DRR_Final | Delta |")
    report.append("|---|---|---|---|---|")
    
    for qid in sorted(common_ids):
        for metric in metrics:
            if not drr_results[qid][metric] or not zs_results[qid][metric]:
                continue
            drr_val = float(drr_results[qid][metric])
            zs_val = float(zs_results[qid][metric])
            delta = drr_val - zs_val
            if delta != 0:
                report.append(f"| {qid} | {metric} | {zs_val} | {drr_val} | {delta:+.1f} |")

    with open("improvement_evaluation_report.md", "w", encoding="utf-8") as f:
        f.write("\n".join(report))
        
    print("Report generated at improvement_evaluation_report.md")

if __name__ == "__main__":
    main()
