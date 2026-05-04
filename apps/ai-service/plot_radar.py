import matplotlib.pyplot as plt
import numpy as np
from tueplots import bundles

# Style
plt.rcParams.update(bundles.tmlr2023(rel_width=0.6))
plt.rcParams.update({"text.usetex": False}) # Disable tex for now to avoid potential missing latex env in CI/agent

# Data
labels = ['Causality', 'Actionability', 'Novelty', 'Geo Mean']
zero_shot = [3.93, 3.95, 3.64, 3.84]
drr = [4.33, 4.33, 3.88, 4.18]

num_vars = len(labels)
angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
angles += angles[:1]
zero_shot += zero_shot[:1]
drr += drr[:1]

fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))

# Draw baseline
ax.fill(angles, zero_shot, color='#7b68ee', alpha=0.25, label='Zero Shot')
ax.plot(angles, zero_shot, color='#7b68ee', linewidth=2)

# Draw DRR
ax.fill(angles, drr, color='#ff4500', alpha=0.25, label='DRR (MTGCR)')
ax.plot(angles, drr, color='#ff4500', linewidth=2)

# Styling
ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)
ax.set_thetagrids(np.degrees(angles[:-1]), labels)
ax.set_ylim(0, 5)
ax.set_rlabel_position(180)
plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))

plt.savefig('doc/latex/figures/thesis_main_radar.pdf', bbox_inches='tight')
