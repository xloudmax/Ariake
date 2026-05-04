# 跨域感知机制：偏振视觉与弱电场感应 (Cross-Domain Sensing: Polarization & Electric Fields)

## 1. 偏振光导航 (Polarized Light Navigation)
*   **生物机理**：沙蚁 (Cataglyphis) 和螳螂虾 (Stomatopods) 利用复眼中的微绒毛 (microvilli) 正交排列来检测大气中的瑞利散射偏振模式。
*   **物理参数**：
    *   **偏振度 (DoP)**：瑞利散射产生的偏振度随太阳高度角变化。
    *   **正交排列**：感光细胞 R1-R8 的微绒毛以 90 度交错，形成对偏振对比的高度敏感。
*   **工程应用**：
    *   **偏振导航传感器**：利用线性偏振器阵列模拟生物感光器，实现无 GPS 环境下的高精度航向评估 (Heading Estimation)。
    *   **斯托克斯矢量 (Stokes Vector)**: $S = [I, Q, U, V]^T$，用于描述光线的完全偏振状态。

## 2. 弱电场感应 (Weak Electric Field Sensing)
*   **生物机理**：弱电鱼 (Gymnotiform) 通过皮肤上的结节状器官 (tuberous organs) 发射和接收高频电器官放电 (EOD)。
*   **物理原理**：
    *   **电像 (Electrolocation)**：物体进入电场后，由于其电导率与水不同，会扭曲局部的电位梯度。
    *   **感应灵敏度**：能够检测到纳伏级 ($nV/cm$) 的微弱电压变化。
*   **工程应用**：
    *   **水下主动电场感知系统 (Active Electrolocation)**：用于浑浊水域中 AUV 的近距离避障与物体识别。
    *   **复数阻抗分析**：通过分析感应信号的相位移 (Phase shift) 来区分生物体与非生物体。
