import matplotlib.pyplot as plt
import numpy as np
from tueplots import bundles

# Set up styles
plt.rcParams.update(bundles.tmlr2023(rel_width=0.8))
plt.rcParams.update({"text.usetex": True})
plt.rcParams.update({"font.family": "serif"})

# Data
categories = [r'Causality', r'Actionability', r'Novelty', r'Geometric Mean']
zero_shot = [3.93, 3.95, 3.64, 3.84]
drr = [4.33, 4.33, 3.88, 4.18]
improvements = [10.18, 9.62, 6.59, 8.85]

x = np.arange(len(categories))
width = 0.35

fig, ax = plt.subplots()
rects1 = ax.bar(x - width/2, zero_shot, width, label='Zero Shot', color='#7b68ee', alpha=0.8)
rects2 = ax.bar(x + width/2, drr, width, label='DRR (MTGCR)', color='#ff4500', alpha=0.8)

# Add labels and styling
ax.set_ylabel('Score (1-5)')
ax.set_xticks(x)
ax.set_xticklabels(categories)
ax.set_ylim(0, 5.5)
ax.legend()

# Add percentage improvements on top
for i, rect in enumerate(rects2):
    height = rect.get_height()
    ax.annotate(f'+{improvements[i]}%',
                xy=(rect.get_x() + rect.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=8, color='#ff4500', fontweight='bold')

plt.savefig('main_results_improvement.pdf', bbox_inches='tight')
