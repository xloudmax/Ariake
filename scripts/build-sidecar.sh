#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 获取当前平台的三元组 (Target Triple)
TRIPLE=$(rustc -Vv | grep host | cut -f2 -d' ')

if [ -z "$TRIPLE" ]; then
    echo "Warning: rustc not found, trying manual detection..."
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    if [ "$OS" == "darwin" ]; then
        if [ "$ARCH" == "arm64" ]; then TRIPLE="aarch64-apple-darwin"
        else TRIPLE="x86_64-apple-darwin"; fi
    elif [ "$OS" == "linux" ]; then
        TRIPLE="$ARCH-unknown-linux-gnu"
    fi
fi

if [ -z "$TRIPLE" ]; then
    echo "Error: Could not determine target triple."
    exit 1
fi

echo "Building Sidecar for $TRIPLE..."

# 进入后端目录
cd "$REPO_ROOT/apps/backend"

# 构建 Go 二进制文件，直接放入 apps/desktop 目录
CGO_ENABLED=1 go build -tags sqlite_fts5 -o "../desktop/blog-backend-$TRIPLE" main.go

echo "Sidecar build complete: apps/desktop/blog-backend-$TRIPLE"
chmod +x "../desktop/blog-backend-$TRIPLE"
