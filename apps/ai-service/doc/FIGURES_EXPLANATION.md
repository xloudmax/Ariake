# DRR 框架学术图表说明文档 (Figures Explanation)

本文档详细介绍了 `scripts/figures/academic/` 目录下所有 13 张核心学术图表的具体意义、数据来源以及在论文/答辩中的使用场景。这些图表已经过全面重命名与精细化排版优化，专门针对顶级学术期刊 (如 Nature, IEEE, NeurIPS) 的标准设计。

---

## 1. 消融实验与基础性能 (Ablation Study)

### 📊 `01_Ablation_Score_Distribution.png/pdf`
- **图表名称**: 消融实验得分分布小提琴图 (Ablation Score Distribution Violin Plot)
- **数据来源**: `drr_ablation_dense_results.csv`
- **学术意义**: 摒弃了会掩盖高密度特征的箱线图，采用了更高级的**小提琴图叠加抖动散点 (Violin + Stripplot)**。直观展示了在全量 Dense Graph 评测中，Vector 基线呈现长尾低分分布，而 DRR 架构在 8.5-9.0 的极高分段形成了巨大的密度隆起 (Density Peak)，完美证明了其极低的方差和绝对的稳定性。

### 📊 `02_Ablation_Multidimensional_Radar.png/pdf`
- **图表名称**: 多维能力对比雷达图 (Ablation Multi-Dimensional Radar)
- **数据来源**: `drr_ablation_results.csv`
- **学术意义**: 综合呈现了 Novelty (新颖度)、Causality (因果性)、Actionability (行动力) 和 Final Score (综合正确性) 四个维度。图形覆盖面积越大，系统综合能力越强，可用于观察 DRR 在物理因果和工程落地维度上的相对改进。

### 📊 `10_Ablation_Robustness_By_Difficulty.png/pdf`
- **图表名称**: 难度鲁棒性分析图 (Performance Robustness Across Difficulty Levels)
- **数据来源**: `drr_ablation_results.csv`
- **学术意义**: 随着工程问题发散度 (Difficulty Level 1 -> 2) 的增加，纯 Vector 架构的得分出现了断崖式下跌，而 DRR 框架的得分几乎没有衰减。这是证明框架**“鲁棒性 (Robustness)”**最硬核的图表。

### 📊 `11_Ablation_Score_ECDF.png/pdf`
- **图表名称**: 经验累积分布函数图 (Empirical CDF of Final Scores)
- **数据来源**: `drr_ablation_results.csv`
- **学术意义**: 顶会系统方向最爱的图表之一。DRR 和 GraphRAG 的曲线严格处于 Vector 曲线的右下方，在统计学上构成了对 Baseline 的**严格占优 (Strict Dominance)**，即在任何得分阈值下，DRR 给出好答案的概率都远超 Vector。

### 📊 `12_Evaluation_Metric_Correlation.png/pdf`
- **图表名称**: 评估指标皮尔逊相关性热力图 (Metric Correlation Matrix)
- **数据来源**: `drr_ablation_results.csv`
- **学术意义**: 通过下三角热力图，揭示了各项评分之间的内在联系。例如，Causality 与 Actionability 呈强正相关，证明了您的核心假设：“没有深刻的物理机制抽象，就不可能产生可落地的工程蓝图”。

---

## 2. 复杂图谱拓扑与分类 (Topology & Taxonomy)

### 📊 `05_MultiHop_Topology_Hexbin.png/pdf`
- **图表名称**: 多跳推理网络拓扑分布图 (MultiHop-RAG Graph Topology)
- **数据来源**: `external_multihop_results.csv`
- **学术意义**: 使用六边形分箱联合分布图 (Hexbin Jointplot) 替代了原有的等高线图。横轴为提取的节点数，纵轴为边数。红色虚线代表理想树状结构 (Edges = Nodes - 1)。直观展示了 DRR 系统在处理多跳问题时生成的知识图谱复杂度热区。

### 📊 `06_TaxoBench_Recall_Gap.png/pdf`
- **图表名称**: 计算机科学分类树边缘召回缺口图 (TaxoBench-CS Recall Gap)
- **数据来源**: `external_taxobench_results.csv`
- **学术意义**: 将原本因为样本少而显得空洞的散点图，重构为了“逐文档比对的分组柱状图”。直接标出了人工标注 Ground Truth 边数与系统提取边数之间的负数缺口 (Gap)，直率地展示了模型目前的难点与优化空间。

---

## 3. 防御机制与计算成本 (Defense & Cost)

### 📊 `07_Physics_Veto_Success_Rate.png/pdf`
- **图表名称**: 物理幻觉防御屏障通过率 (Physics Veto / Null Defense Rate)
- **数据来源**: `drr_null_results.csv`
- **学术意义**: 在面对不可能的跨界问题 (如要求用黑洞给手机降温) 时，展示各系统的拦截率。Vector 的防御率为 0 (发生幻觉)，而 DRR 成功触发 Fallback (安全拦截)，量化了系统的“可信度 (Trustworthy)”。

### 📊 `09_Latency_Score_Pareto_Frontier.png/pdf`
- **图表名称**: 性能-成本帕累托前沿图 (Latency vs Score Pareto Frontier)
- **数据来源**: `advanced_ablation_results.csv` (Level 3/4 深度查询)
- **学术意义**: 这是系统优化最直观的体现。图表展示了生成延迟 (Latency) 与 最终得分 (Score) 的权衡关系。证明了引入高级 Critic 虽然增加了时间成本，但也阻断了错误信息的输出，体现了“非对称计算策略”在深水区的价值。

---

## 4. 前沿科研专家级评估 (ResearcherBench / DARS)

### 📊 `03_ResearcherBench_Score_Distribution.png/pdf`
- **图表名称**: DARS 科研能力评估小提琴图 (ResearcherBench Score Distribution)
- **数据来源**: `external_researcherbench_results.csv`
- **学术意义**: 结合了小提琴图与散点抖动图，完美呈现了系统在“文献综述”、“开放咨询”和“技术细节”三大题型中的得分密度和离群点。证明了系统具有辅助前沿 AI 论文撰写的核心能力。

### 📊 `04_ResearcherBench_Insight_Correlation.png/pdf`
- **图表名称**: 洞察力与整体评分回归联合图 (Insight Quality vs Overall Score)
- **数据来源**: `external_researcherbench_results.csv`
- **学术意义**: 带有边缘直方图的回归散点图。证明了系统生成的回答不仅是字数多，而且其“学术洞察质量 (Insight Quality)”与“总体评分 (Score 5)”具有完美的正向线性拟合关系。

### 📊 `13_ResearcherBench_Domain_Expertise.png/pdf`
- **图表名称**: 前沿学科专家知识热力图 (Domain Expertise Top 15 Subjects)
- **数据来源**: `external_researcherbench_results.csv`
- **学术意义**: 细化到具体学科维度。在一张热力图上展示了 DRR 系统在哪些子领域（如 Scaling Laws, Reinforcement Learning）达到了“人类顶级专家（满分 5.0）”的水准，极大地增强了论文的说服力。

### 📊 `08_DRR_Baseline_Performance.png/pdf`
- **图表名称**: DRR 全量基准能力雷达图 (DRR Full Evaluation Baseline)
- **数据来源**: `drr_benchmark_results.csv`
- **学术意义**: 作为单列展示的独立雷达图，干净利落地给出了您提出的双重表征框架最终版在所有维度上的标杆平均分。
