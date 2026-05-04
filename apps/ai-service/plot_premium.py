import matplotlib.pyplot as plt
import numpy as np
from tueplots import bundles

# --- Premium Theme Configuration ---
# Midnight Blue for Baseline, Deep Coral for Innovation
COLOR_BASE = '#455A64'  # Professional Slate Gray/Blue
COLOR_DRR  = '#D84315'  # Deep, burnt orange/coral
FONT_SIZE  = 9

plt.rcParams.update(bundles.tmlr2023(rel_width=1.0, ncols=2))
plt.rcParams.update({
    "text.usetex": False,
    "font.family": "sans-serif",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.2,
    "grid.linestyle": '--'
})

# --- Data ---
labels = ['Causality', 'Actionability', 'Novelty']
# Overall Mean
all_zero = [3.93, 3.95, 3.64]
all_drr  = [4.33, 4.33, 3.88]
# Exploratory (High Diff)
exp_zero = [3.63, 3.63, 3.81]
exp_drr  = [4.38, 4.44, 4.00]

x = np.arange(len(labels))
width = 0.3

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

def style_bar(ax, zero, drr, title):
    ax.bar(x - width/2, zero, width, label='Baseline (Zero-Shot)', color=COLOR_BASE, alpha=0.9, zorder=3)
    b2 = ax.bar(x + width/2, drr, width, label='Ours (MTGCR)', color=COLOR_DRR, alpha=0.9, zorder=3)
    
    ax.set_title(title, fontsize=FONT_SIZE+1, fontweight='bold', pad=10)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=FONT_SIZE)
    ax.set_ylim(3.0, 4.7)
    
    # Subtle improvement label
    for i, p in enumerate(b2):
        val = ((drr[i] - zero[i]) / zero[i]) * 100
        ax.annotate(f'↑{val:.1f}%', 
                    xy=(p.get_x() + p.get_width() / 2, p.get_height()),
                    xytext=(0, 5), textcoords="offset points",
                    ha='center', va='bottom', fontsize=FONT_SIZE-1, 
                    color=COLOR_DRR, fontweight='bold')

style_bar(ax1, all_zero, all_drr, 'Overall Performance (N=42)')
style_bar(ax2, exp_zero, exp_drr, 'Exploratory Tasks (High Diff)')

ax1.legend(loc='upper left', frameon=False, fontsize=FONT_SIZE-1)
ax1.set_ylabel('Scientific Quality Score', fontsize=FONT_SIZE)

plt.tight_layout()
plt.savefig('doc/latex/figures/premium_results_comparison.pdf', bbox_inches='tight', dpi=300)
