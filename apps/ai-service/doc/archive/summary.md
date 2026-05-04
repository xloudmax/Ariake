## 新增图表记录

### 本轮补充的新图表：

1. **固定基线双盲偏好评估图 (`blind_ab_preference.pdf`)**
   - **内容**：绘图脚本读取固定 Zero_Shot 基线下的 `neutral` 与 `transfer_aware` 两种评审口径，展示 DRR 与 Zero_Shot 的偏好计数。当前代表性跨域子集上，两种口径均为 DRR 胜出 3 题、Zero_Shot 胜出 4 题。
   - **嵌入位置**：该图插入到 `3.3.2 双盲偏好评估` 小节中。
   - **解释边界**：该结果仅作为自动评分的补充性诊断，不作为 DRR 全面优于 Zero_Shot 的证明。

2. **消融实验帕累托前沿分析图 (`advanced_ablation_pareto_v3.pdf`)**
   - **内容**：这张图展示了不同配置在“因果清晰度 (Causality)”和“可执行性 (Actionability)”两个维度上的权衡（Trade-off）关系，也就是帕累托前沿。
   - **嵌入位置**：我使用了 LaTeX 的 `minipage` 并排排版技术，将这张帕累托图与原有的雷达图（`advanced_ablation_radar_v3.pdf`）并列放置在 `2.6.3 消融实验与机制分析` 小节中。
   - **效果**：雷达图展示了各项指标的绝对值，而帕累托图则更深入地展示了 DRR 是如何在多维目标中寻找最优解的。两图并列，让消融实验的分析显得极其专业和硬核。

### 编译结果：
已重新运行 `latexmk -xelatex JNUThesis.tex`，图表已渲染到 PDF 中。
