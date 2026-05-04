import matplotlib.pyplot as plt
import numpy as np
from tueplots import bundles

# Style
plt.rcParams.update(bundles.tmlr2023(rel_width=0.8))
plt.rcParams.update({"text.usetex": False})

# Data for EXPLORATORY group (High Difficulty)
labels = ['Causality', 'Actionability', 'Novelty']
zero_shot = [3.63, 3.63, 3.81]
drr = [4.38, 4.44, 4.00]
gains = [20.6, 22.3, 5.0]

x = np.arange(len(labels))
width = 0.35

fig, ax = plt.subplots(figsize=(7, 4))
rects1 = ax.bar(x - width/2, zero_shot, width, label='Zero Shot', color='#D1D1D1', alpha=0.9, edgecolor='black', linewidth=0.5)
rects2 = ax.bar(x + width/2, drr, width, label='DRR (MTGCR)', color='#E63946', alpha=0.9, edgecolor='black', linewidth=0.5)

# Add annotations for gain
for i, rect in enumerate(rects2):
    height = rect.get_height()
    ax.annotate(f'+{gains[i]}%',
                xy=(rect.get_x() + rect.get_width() / 2, height),
                xytext=(0, 3), 
                textcoords="offset points",
                ha='center', va='bottom', fontsize=10, color='#E63946', fontweight='bold')

# Styling
ax.set_ylabel('Score (1-5)')
ax.set_xticks(x)
ax.set_xticklabels(labels)
ax.set_ylim(3.0, 4.8) # ZOOMED IN for maximum differentiation
ax.set_title('Performance on High-Difficulty Cross-Domain Tasks', fontsize=11, pad=15)
ax.legend(loc='lower right')
ax.grid(axis='y', linestyle='--', alpha=0.4)

plt.savefig('doc/latex/figures/exploratory_gain.pdf', bbox_inches='tight')

# Also regenerate radar with better scale
labels_radar = ['Causality', 'Actionability', 'Novelty', 'Geo Mean']
zero_shot_r = [3.93, 3.95, 3.64, 3.84]
drr_r = [4.33, 4.33, 3.88, 4.18]

num_vars = len(labels_radar)
angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
angles += angles[:1]
zero_shot_r += zero_shot_r[:1]
drr_r += drr_r[:1]

fig2, ax2 = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
ax2.fill(angles, zero_shot_r, color='#D1D1D1', alpha=0.3, label='Zero Shot')
ax2.plot(angles, zero_shot_r, color='#888888', linewidth=1, linestyle='--')
ax2.fill(angles, drr_r, color='#E63946', alpha=0.4, label='DRR (MTGCR)')
ax2.plot(angles, drr_r, color='#E63946', linewidth=2.5)

ax2.set_theta_offset(np.pi / 2)
ax2.set_theta_direction(-1)
ax2.set_thetagrids(np.degrees(angles[:-1]), labels_radar)
ax2.set_ylim(3.4, 4.5) # ZOOMED IN for radar too
plt.legend(loc='upper right', bbox_to_anchor=(1.2, 1.1))
plt.savefig('doc/latex/figures/thesis_main_radar_zoomed.pdf', bbox_inches='tight')
