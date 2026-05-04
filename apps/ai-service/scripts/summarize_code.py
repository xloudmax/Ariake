import re
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
source_file = SCRIPT_DIR / "generate_academic_plots.py"
output_dir = SCRIPT_DIR / "figures/academic/code_summaries"
os.makedirs(output_dir, exist_ok=True)

with source_file.open("r", encoding="utf-8") as f:
    content = f.read()

# Extract the header/imports and aesthetic config
header_match = re.search(r"(import .*?)(?=\n# =====)", content, re.DOTALL)
header = (
    header_match.group(1)
    if header_match
    else "import matplotlib.pyplot as plt\nimport seaborn as sns\nimport pandas as pd"
)

# Add the aesthetic config
config_match = re.search(
    r"(# =====.*?# AESTHETIC CONFIGURATION.*?PALETTE = \{.*?\n\})", content, re.DOTALL
)
config_str = config_match.group(1) if config_match else ""

# Extract all functions directly by def
functions = re.findall(
    r"(def plot_.*?(?=\ndef plot_|\nif __name__))", content, re.DOTALL
)

if not functions:
    print("No functions found. Check regex.")

for func_content in functions:
    # Find the save_fig name to use as filename
    save_match = re.search(r'save_fig(?:_no_tight)?\("([^"]+)"\)', func_content)
    if not save_match:
        print("Skipping a function without save_fig")
        continue

    fig_name = save_match.group(1)

    # Generate the markdown content
    md_content = f"""# Python 生成代码: {fig_name}
**图表文件**: `{fig_name}.png` / `{fig_name}.pdf`

## 📊 数据处理与可视化逻辑总结

1. **数据准备**: 从 `RESULTS_DIR` 加载对应的 CSV 结果文件，使用 `pandas` 进行数据清洗（如填充缺失值、转换类型）和结构重组（如 `melt`, `groupby`）。
2. **可视化库**: 主要使用 `seaborn` 和 `matplotlib`。
3. **美学设计**: 沿用了顶会论文风格的全局配置（如 Serif 字体、高分辨率、Colorblind-friendly Palette）。
4. **图表输出**: 通过 `save_fig` 自动生成紧凑排版的无损 PDF 矢量图和高刷 PNG 图片。

## 💻 完整生成代码

```python
{header}

{config_str}

{func_content.strip()}
```
"""

    # Save to markdown file
    out_file = output_dir / f"{fig_name}_code.md"
    with out_file.open("w", encoding="utf-8") as out_f:
        out_f.write(md_content)

    print(f"Generated {out_file}")

print("Done")
