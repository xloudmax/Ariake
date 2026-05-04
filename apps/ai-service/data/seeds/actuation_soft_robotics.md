# 跨域驱动机制：人工肌肉与柔体驱动 (Cross-Domain Actuation: Artificial Muscles & Soft Robotics)

## 1. 骨骼肌收缩与能量转换 (Skeletal Muscle Contraction)
*   **生物机理**：通过肌原纤维 (myofibrils) 中的肌球蛋白 (myosin) 和肌动蛋白 (actin) 的滑动丝机制 (Sliding Filament Mechanism)。
*   **物理参数**：
    *   **比功率 (Specific Power)**: $P_{sp} \approx 50-200 W/kg$。
    *   **行程 (Stroke Rate)**: 肌肉收缩长度通常为原长的 20%-40%。
    *   **非线性刚度**：肌肉具有与应变成比例的动态刚度 (Dynamic Stiffness)。
*   **工程应用**：
    *   **McKibben 气动肌肉 (PAMs)**：利用编织套筒在气压作用下产生径向膨胀和轴向收缩。
    *   **介电弹性体 (DEAs)**：一种电活性聚合物 (EAP)，在高电压下产生麦克斯韦应力 (Maxwell Stress)，导致薄膜变薄并横向扩展。

## 2. 肌肉静力结构 (Muscular Hydrostats)
*   **生物机理**：章鱼足、人类舌头。由不可压缩的液体或组织组成，通过纵向、径向和周向肌肉的协调收缩实现变刚度、弯曲和扭转。
*   **物理原理**：
    *   **各向同性体积约束**：由于体积恒定，一个方向的压缩必须导致另一个方向的伸。
    *   **变刚度机制 (Tunable Stiffness)**：通过拮抗肌肉 (Antagonistic pairs) 的共缩实现。
*   **工程应用**：
    *   **连续体机器人 (Continuum Robots)**：采用电缆或流体动力驱动，模拟章鱼足的无限自由度运动。
    *   **真空干扰阻塞 (Vacuum Jamming)**：利用压差颗粒阻塞实现刚度改变 ($E$ 模量变化可达数个数量级)。
