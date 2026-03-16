#!/bin/bash
# C4 Model 文档同步脚本
# 将本地 C4 Model 文档同步到统一文档仓库

set -e

PROJECT_NAME="skyline-ad-pwa-landing-api"
DOCS_REPO="http://gitlab.praise.com/2440/reverse-pwa-docs.git"
SOURCE_DIR="docs/architecture"
TARGET_DIR="${PROJECT_NAME}/docs/specify/c4model"
TEMP_DIR="/tmp/reverse-pwa-docs-$$"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[C4-Sync]${NC} 开始同步 C4 Model 文档..."

# 检查源目录是否存在
if [ ! -d "${SOURCE_DIR}" ]; then
    echo -e "${RED}[Error]${NC} 源目录不存在: ${SOURCE_DIR}"
    exit 1
fi

# 克隆文档仓库
echo -e "${YELLOW}[Step 1/4]${NC} 克隆文档仓库..."
git clone --depth 1 "${DOCS_REPO}" "${TEMP_DIR}"

# 确保目标目录存在
echo -e "${YELLOW}[Step 2/4]${NC} 准备目标目录..."
mkdir -p "${TEMP_DIR}/${TARGET_DIR}"

# 同步文件
echo -e "${YELLOW}[Step 3/4]${NC} 同步文件..."
rsync -av --delete "${SOURCE_DIR}/" "${TEMP_DIR}/${TARGET_DIR}/"

# 提交变更
echo -e "${YELLOW}[Step 4/4]${NC} 提交变更..."
cd "${TEMP_DIR}"

git config user.name "C4 Sync Bot"
git config user.email "c4sync@praise.com"

git add .

# 检查是否有变更
if git diff --staged --quiet; then
    echo -e "${GREEN}[C4-Sync]${NC} 没有变更需要同步"
else
    COMMIT_MSG="[C4-Sync] ${PROJECT_NAME}: $(date +%Y-%m-%d) architecture update"
    git commit -m "${COMMIT_MSG}"
    git push origin main
    echo -e "${GREEN}[C4-Sync]${NC} 同步完成: ${COMMIT_MSG}"
fi

# 清理
cd -
rm -rf "${TEMP_DIR}"

echo -e "${GREEN}[C4-Sync]${NC} 完成!"
