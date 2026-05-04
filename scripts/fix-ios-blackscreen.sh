#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# iOS 黑屏/连接错误修复脚本
# 该脚本将清理缓存并重新执行生产环境构建

echo "🧹 正在清理 Tauri 缓存..."
rm -rf apps/desktop/target
rm -rf apps/desktop/gen/apple

echo "📦 正在执行前端构建 (Production)..."
pnpm build

echo "🍎 正在生成 iOS 项目 (Release)..."
# 注意：这里使用 build 而不是 dev，确保资源被打包进 App
pnpm tauri:ios:build

echo "✅ 修复完成！"
echo "提示：请现在使用 Xcode 打开 apps/desktop/gen/apple 中的工程，并确保在项目设置的 Info 标签页中添加以下权限："
echo "1. NSLocalNetworkUsageDescription -> 我们需要访问本地网络以连接到您的博客后端服务。"
echo "2. NSAppTransportSecurity -> Allow Arbitrary Loads -> YES"
