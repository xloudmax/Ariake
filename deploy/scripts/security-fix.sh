#!/bin/bash
# 快速安全修复脚本
# 生成日期: 2025-11-07

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "🔒 开始安全加固..."

# 1. 关闭不必要端口
echo "📡 关闭开发端口..."
sudo ufw status numbered | grep "5173" && sudo ufw delete allow 5173/tcp 2>/dev/null || echo "5173端口未开放"
sudo ufw status numbered | grep "11451" && sudo ufw delete allow 11451/tcp 2>/dev/null || echo "11451端口未开放"

echo "✅ 防火墙配置已更新"
sudo ufw status

# 2. 升级npm依赖
echo ""
echo "📦 升级前端依赖..."
pnpm update vite@latest

# 3. 重新构建前端
echo ""
echo "🔨 重新构建前端..."
pnpm build

# 4. 重新部署
echo ""
echo "🚀 重新部署前端..."
sudo rm -rf /var/www/blog/dist/*
sudo cp -r apps/frontend/dist/* /var/www/blog/dist/

# 5. 重启nginx
echo ""
echo "🔄 重启nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ 安全加固完成！"
echo ""
echo "⚠️  重要提醒："
echo "    1. 请手动升级Go版本到1.25.3+"
echo "       wget https://go.dev/dl/go1.25.3.linux-amd64.tar.gz"
echo "       sudo rm -rf /usr/local/go"
echo "       sudo tar -C /usr/local -xzf go1.25.3.linux-amd64.tar.gz"
echo ""
echo "    2. 升级Go后重新编译后端:"
echo "       cd /home/ubuntu/workspace/C404-blog/apps/backend"
echo "       go build -o bin/server main.go"
echo ""
echo "    3. 配置systemd服务（推荐）:"
echo "       sudo cp deploy/systemd/blog-backend.service /etc/systemd/system/"
echo "       sudo systemctl daemon-reload"
echo "       sudo systemctl enable blog-backend"
echo "       sudo systemctl start blog-backend"
echo ""
echo "📊 查看完整安全报告:"
echo "    cat deploy/SECURITY_AUDIT_2025-11-07.md"
