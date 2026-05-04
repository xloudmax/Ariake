import re

with open('../../apps/ai-service/doc/latex/final_defense.tex', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 替换主题设置
content = content.replace(
    '\\usetheme{metropolis}\n\\usecolortheme{whale}',
    '\\usetheme[progressbar=frametitle, block=fill, sectionpage=progressbar]{metropolis}'
)

# 2. 增加暨大蓝和更美观的全局颜色配置
old_color_settings = """% Define Global Academic Palette (Synchronized with Plots)
\\definecolor{colorVector}{HTML}{FF6B6B}
\\definecolor{colorGraph}{HTML}{4A90E2}
\\definecolor{colorDRR}{HTML}{50E3C2}
\\definecolor{colorHighlight}{HTML}{F39C12}

% Global styling
\\setbeamerfont{block title}{shape=\\normalfont, series=\\bfseries}
\\setbeamerfont{title}{shape=\\normalfont, series=\\bfseries}

% Fix Metropolis white-on-white issue on title/section pages
\\setbeamercolor{palette primary}{fg=white, bg=colorGraph}
\\setbeamercolor{section title}{fg=white}
\\setbeamercolor{alerted text}{fg=colorVector}"""

new_color_settings = """% Define Global Academic Palette
\\definecolor{JNUBlue}{RGB}{0, 85, 162} % 暨南大学标准蓝 (近似)
\\definecolor{colorVector}{HTML}{FF6B6B}
\\definecolor{colorGraph}{HTML}{4A90E2}
\\definecolor{colorDRR}{HTML}{50E3C2}
\\definecolor{colorHighlight}{HTML}{F39C12}

% Global styling
\\setbeamerfont{block title}{shape=\\normalfont, series=\\bfseries}
\\setbeamerfont{title}{shape=\\normalfont, series=\\bfseries}

% Metropolis Theme Custom Colors
\\setbeamercolor{normal text}{fg=darkgray!90!black}
\\setbeamercolor{palette primary}{bg=JNUBlue, fg=white}
\\setbeamercolor{progress bar}{fg=colorHighlight, bg=JNUBlue!30}
\\setbeamercolor{title separator}{fg=colorHighlight, bg=JNUBlue}
\\setbeamercolor{alerted text}{fg=colorVector}
\\setbeamercolor{block title}{bg=JNUBlue!15, fg=JNUBlue!90!black}
\\setbeamercolor{block body}{bg=JNUBlue!5, fg=darkgray!90!black}"""

content = content.replace(old_color_settings, new_color_settings)

# 3. 丰富封面信息
old_title_info = """% Title Page Info
\\title{基于树--图双重表征推理的全栈智能知识平台}
\\subtitle{本科毕业论文答辩}
\\author{沈宇飞}
\\institute{暨南大学}
\\date{2026年5月}"""

new_title_info = """% Title Page Info
\\title{基于树--图双重表征推理的全栈智能知识平台}
\\subtitle{\\vspace{0.2cm}\\small 本科毕业论文答辩}

\\author{
    \\vspace{0.3cm}
    \\begin{tabular}{rl}
        \\textbf{答辩人：} & 沈宇飞 \\\\
        \\textbf{指导老师：} & [导师姓名] 教授/副教授 \\\\
        \\textbf{专\\qquad 业：} & [你的专业，如：计算机科学与技术]
    \\end{tabular}
}
\\institute{\\vspace{0.4cm}\\large \\textbf{暨南大学}}
\\date{\\vspace{0.2cm}\\small 2026年5月}

% 添加封面右上角的“树-图双重表征”科技感抽象 Logo
\\titlegraphic{
    \\begin{tikzpicture}[overlay, remember picture]
        \\node[anchor=north east, xshift=-1cm, yshift=-1cm] at (current page.north east) {
            \\begin{tikzpicture}[scale=0.6, every node/.style={circle, draw=JNUBlue, fill=JNUBlue!10, inner sep=2pt, minimum size=6pt}]
                % Tree nodes
                \\node (root) at (0,0) {};
                \\node (l1) at (-1.2,-1) {};
                \\node (r1) at (1.2,-1) {};
                \\node (l2) at (-1.8,-2) {};
                \\node (m2) at (-0.6,-2) {};
                \\node (r2) at (0.6,-2) {};
                \\node (rr2) at (1.8,-2) {};
                
                % Tree edges (solid, downward)
                \\draw[JNUBlue, thick] (root)--(l1) (root)--(r1);
                \\draw[JNUBlue, thick] (l1)--(l2) (l1)--(m2);
                \\draw[JNUBlue, thick] (r1)--(r2) (r1)--(rr2);
                
                % Graph edges (dashed, cross-domain connections representing DRR)
                \\draw[colorVector, thick, dashed] (l2) to[bend right=20] (m2);
                \\draw[colorVector, thick, dashed] (m2) to[bend left=15] (r2);
                \\draw[colorVector, thick, dashed] (r2) to[bend right=20] (rr2);
                \\draw[colorVector, thick, dashed] (l1) to[bend left=10] (r2);
            \\end{tikzpicture}
        };
    \\end{tikzpicture}
}"""

content = content.replace(old_title_info, new_title_info)

with open('../../apps/ai-service/doc/latex/final_defense.tex', 'w', encoding='utf-8') as f:
    f.write(content)

print("LaTeX patch applied successfully.")
