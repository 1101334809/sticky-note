#!/bin/bash
# ============================================
# 项目初始化脚本
# 
# 使用方法:
#   ./init-project.sh <project-name>
#
# 示例:
#   ./init-project.sh skyline-ai-crm
#
# 功能:
#   1. 复制后端脚手架 (backend/)
#   2. 复制前端脚手架 (frontend/)
#   3. 复制部署配置 (document/)
#   4. 替换项目名称占位符
# ============================================

set -e

# 检查参数
if [ -z "$1" ]; then
    echo "❌ 错误: 请提供项目名称"
    echo "用法: ./init-project.sh <project-name>"
    echo "示例: ./init-project.sh skyline-ai-crm"
    exit 1
fi

PROJECT_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCAFFOLD_DIR="$SCRIPT_DIR/../scaffold"
TARGET_DIR="$(pwd)"

echo "============================================"
echo "🚀 初始化项目: $PROJECT_NAME"
echo "============================================"

# 检查 scaffold 目录是否存在
if [ ! -d "$SCAFFOLD_DIR" ]; then
    echo "❌ 错误: 找不到 scaffold 目录: $SCAFFOLD_DIR"
    exit 1
fi

# 复制 scaffold 文件
echo ""
echo "📁 复制脚手架文件..."

# Backend
if [ -d "$SCAFFOLD_DIR/backend" ]; then
    mkdir -p "$TARGET_DIR/backend"
    cp -r "$SCAFFOLD_DIR/backend/"* "$TARGET_DIR/backend/"
    echo "  ✅ backend/"
fi

# Frontend
if [ -d "$SCAFFOLD_DIR/frontend" ]; then
    mkdir -p "$TARGET_DIR/frontend"
    cp -r "$SCAFFOLD_DIR/frontend/"* "$TARGET_DIR/frontend/"
    echo "  ✅ frontend/"
fi

# Document (部署配置)
if [ -d "$SCAFFOLD_DIR/document" ]; then
    mkdir -p "$TARGET_DIR/document"
    cp -r "$SCAFFOLD_DIR/document/"* "$TARGET_DIR/document/"
    echo "  ✅ document/"
fi

# 替换项目名称占位符
echo ""
echo "📝 替换项目名称..."

# 在 macOS 和 Linux 上使用不同的 sed 语法
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    find "$TARGET_DIR/backend" -type f -name "*.py" -exec sed -i '' "s/skyline-app/$PROJECT_NAME/g" {} \; 2>/dev/null || true
    find "$TARGET_DIR/backend" -type f -name "*.py" -exec sed -i '' "s/app_db/${PROJECT_NAME//-/_}_db/g" {} \; 2>/dev/null || true
    find "$TARGET_DIR/document" -type f -name "*.yaml" -exec sed -i '' "s/{PROJECT_NAME}/$PROJECT_NAME/g" {} \; 2>/dev/null || true
else
    # Linux
    find "$TARGET_DIR/backend" -type f -name "*.py" -exec sed -i "s/skyline-app/$PROJECT_NAME/g" {} \; 2>/dev/null || true
    find "$TARGET_DIR/backend" -type f -name "*.py" -exec sed -i "s/app_db/${PROJECT_NAME//-/_}_db/g" {} \; 2>/dev/null || true
    find "$TARGET_DIR/document" -type f -name "*.yaml" -exec sed -i "s/{PROJECT_NAME}/$PROJECT_NAME/g" {} \; 2>/dev/null || true
fi

echo "  ✅ 项目名称已替换为: $PROJECT_NAME"

# 设置可执行权限
chmod +x "$TARGET_DIR/backend/start.sh" 2>/dev/null || true

# 显示下一步操作
echo ""
echo "============================================"
echo "✅ 项目初始化完成!"
echo "============================================"
echo ""
echo "📋 下一步操作:"
echo ""
echo "1. 初始化后端:"
echo "   cd backend"
echo "   uv init"
echo "   uv add fastapi uvicorn sqlalchemy pydantic pydantic-settings loguru httpx nacos-sdk-python PyYAML"
echo ""
echo "2. 初始化前端:"
echo "   cd frontend"
echo "   npm create vite@latest . -- --template react-ts"
echo "   npm install axios antd @ant-design/icons zustand react-router-dom"
echo ""
echo "3. 创建 Nacos 配置:"
echo "   Data ID: skyline-ai-$PROJECT_NAME.yaml"
echo "   Group: DEFAULT_GROUP"
echo "   Namespace: skyline-ai"
echo ""
echo "4. 构建 Docker 镜像:"
echo "   docker build -f document/deploy/api/docker/Dockerfile -t harbor.skyline.com/skyline-ai/$PROJECT_NAME ."
echo ""
