#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# 预览导出的静态博客
# 该脚本会执行本地构建，并启动一个临时的静态服务器

echo "🚀 开始构建静态前端..."
pnpm build:static

echo "📂 准备预览目录 (tmp/preview)..."
mkdir -p tmp/preview
cp -R apps/frontend/dist-static/* tmp/preview/

# 注意：由于文章数据需要从数据库读取，目前只能通过运行一次部署来生成。
# 我们可以先看看 UI 框架。
echo "🌐 启动预览服务器..."
echo "提示：您可以点击应用中的 '部署' 按钮后，查看 GitHub 上的最终效果。"
npx serve tmp/preview
